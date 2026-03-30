import {
  Movimentacao,
  MovimentacaoProduto,
  Maquina,
  Usuario,
  Produto,
  EstoqueLoja,
  EstoqueUsuario,
  Loja,
  CarrinhoPeca,
  Peca,
  Manutencao,
  ContasFinanceiro,
  FluxoCaixa,
} from "../models/index.js";
import { Op } from "sequelize";
import { registrarMovimentacaoPecas } from "./movimentacaoPecaController.js";
import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";
import justificativasPendentes from "../utils/justificativasPendentes.js";
import AlertManager from "../services/alertManager.js";

const possuiNumero = (valor) =>
  valor !== null &&
  valor !== undefined &&
  valor !== "" &&
  !Number.isNaN(Number(valor));

const inteiroSeguro = (valor, fallback = 0) => {
  if (!possuiNumero(valor)) return fallback;
  return parseInt(valor, 10);
};

const calcularContadoresProjetados = (historico) => {
  let contadorInProjetado = 0;
  let contadorOutProjetado = 0;

  for (const mov of historico) {
    const fichas = inteiroSeguro(mov.fichas, 0);
    const sairam = inteiroSeguro(mov.sairam, 0);

    if (possuiNumero(mov.contadorIn)) {
      contadorInProjetado = inteiroSeguro(mov.contadorIn, contadorInProjetado);
    } else {
      contadorInProjetado += fichas;
    }

    if (possuiNumero(mov.contadorOut)) {
      contadorOutProjetado = inteiroSeguro(
        mov.contadorOut,
        contadorOutProjetado,
      );
    } else {
      contadorOutProjetado += sairam;
    }
  }

  return {
    contadorInProjetado: Math.max(0, contadorInProjetado),
    contadorOutProjetado: Math.max(0, contadorOutProjetado),
  };
};

// US08, US09, US10 - Registrar movimentação completa
export const registrarMovimentacao = async (req, res) => {
  // Validação: apenas campos realmente obrigatórios em todos os formulários
  const requiredFields = ["maquinaId", "totalPre", "abastecidas"];
  const missing = requiredFields.filter((f) => req.body[f] === undefined);
  if (missing.length > 0) {
    return res
      .status(400)
      .json({ error: "Campos obrigatórios ausentes: " + missing.join(", ") });
  }
  try {
    const {
      maquinaId,
      dataColeta,
      totalPre,
      sairam,
      abastecidas,
      fichas,
      contadorIn,
      contadorOut,
      contadorMaquina,
      contadorInManual,
      contadorOutManual,
      contadorInDigital,
      contadorOutDigital,
      observacoes,
      tipoOcorrencia,
      retiradaEstoque,
      retiradaDinheiro,
      retiradaProduto,
      produtos = [], // Array de { produtoId, quantidadeSaiu, quantidadeAbastecida }
      roteiroId, // pode não vir do Movimentacoes.jsx
      quantidade_notas_entrada,
      valor_entrada_maquininha_pix,
      ignoreInOut,
      origemEstoque,
      confirmarUsoEstoqueLoja,
      produtoNaMaquinaId,
      produto_na_maquina_id,
      contadorInAnterior,
      contadorOutAnterior,
    } = req.body;

    const origemEstoqueNormalizada =
      origemEstoque === "loja" ? "loja" : "usuario";

    const isAdmin = ["ADMIN", "GERENCIADOR"].includes(req.usuario?.role);
    const normalizarContador = (valor) => {
      if (!possuiNumero(valor)) return null;
      return inteiroSeguro(valor, null);
    };

    const funcionarioSemContador = req.usuario?.role === "FUNCIONARIO";
    const contadorInDigitalSanitizado = funcionarioSemContador
      ? null
      : normalizarContador(contadorInDigital);
    const contadorOutDigitalSanitizado = funcionarioSemContador
      ? null
      : normalizarContador(contadorOutDigital);
    const contadorInSanitizado = funcionarioSemContador
      ? null
      : (normalizarContador(contadorIn) ?? contadorInDigitalSanitizado ?? null);
    const contadorOutSanitizado = funcionarioSemContador
      ? null
      : (normalizarContador(contadorOut) ??
        contadorOutDigitalSanitizado ??
        null);
    const contadorInAnteriorSanitizado = funcionarioSemContador
      ? null
      : normalizarContador(contadorInAnterior);
    const contadorOutAnteriorSanitizado = funcionarioSemContador
      ? null
      : normalizarContador(contadorOutAnterior);

    // (Removido alerta/bloqueio de pular loja: agora permite movimentação em qualquer loja do roteiro)

    // Validações
    if (!maquinaId || totalPre === undefined || abastecidas === undefined) {
      return res.status(400).json({
        error: "maquinaId, totalPre e abastecidas são obrigatórios",
      });
    }

    const totalPreQtd = inteiroSeguro(totalPre, 0);
    const abastecidasQtd = inteiroSeguro(abastecidas, 0);
    const fichasQtd = inteiroSeguro(fichas, 0);
    const notasEntradaValor = possuiNumero(quantidade_notas_entrada)
      ? Number(quantidade_notas_entrada)
      : 0;
    const pixEntradaValor = possuiNumero(valor_entrada_maquininha_pix)
      ? Number(valor_entrada_maquininha_pix)
      : 0;

    const isValorContadorValido = (valor) =>
      valor !== null &&
      valor !== undefined &&
      valor !== "" &&
      !Number.isNaN(Number(valor));

    const contadorInInformado = contadorInSanitizado;
    const contadorOutInformado = contadorOutSanitizado;

    const precisaInOut = [
      "FUNCIONARIO_TODAS_LOJAS",
      "CONTROLADOR_ESTOQUE",
    ].includes(req.usuario?.role);

    if (
      precisaInOut &&
      !ignoreInOut &&
      (!isValorContadorValido(contadorInInformado) ||
        !isValorContadorValido(contadorOutInformado))
    ) {
      return res.status(400).json({
        error:
          "Para FUNCIONARIO_TODAS_LOJAS e CONTROLADOR_ESTOQUE, os campos IN/OUT são obrigatórios. Marque a opção de ignorar IN/OUT para continuar sem eles.",
      });
    }

    // --- REGRA DE SEGURANÇA: Não permitir total maior que totalPos da última movimentação, exceto para ADMIN ---
    const ultimaMov = await Movimentacao.findOne({
      where: { maquinaId },
      order: [["createdAt", "DESC"]],
    });
    const isPrimeiraMovimentacao = !ultimaMov;

    if (
      isPrimeiraMovimentacao &&
      (!isValorContadorValido(contadorInAnteriorSanitizado) ||
        !isValorContadorValido(contadorOutAnteriorSanitizado) ||
        !isValorContadorValido(contadorInSanitizado) ||
        !isValorContadorValido(contadorOutSanitizado))
    ) {
      return res.status(400).json({
        error:
          "Na primeira movimentação da máquina, os campos contadorInAnterior, contadorOutAnterior, contadorIn e contadorOut são obrigatórios.",
      });
    }

    if (
      isPrimeiraMovimentacao &&
      !isAdmin &&
      isValorContadorValido(contadorInAnteriorSanitizado) &&
      isValorContadorValido(contadorInSanitizado) &&
      contadorInAnteriorSanitizado > contadorInSanitizado
    ) {
      return res.status(400).json({
        error:
          "Na primeira movimentação, contadorInAnterior não pode ser maior que contadorIn.",
      });
    }

    if (
      isPrimeiraMovimentacao &&
      !isAdmin &&
      isValorContadorValido(contadorOutAnteriorSanitizado) &&
      isValorContadorValido(contadorOutSanitizado) &&
      contadorOutAnteriorSanitizado > contadorOutSanitizado
    ) {
      return res.status(400).json({
        error:
          "Na primeira movimentação, contadorOutAnterior não pode ser maior que contadorOut.",
      });
    }

    const historicoContadores = await Movimentacao.findAll({
      where: { maquinaId },
      attributes: [
        "contadorIn",
        "contadorOut",
        "fichas",
        "sairam",
        "dataColeta",
        "createdAt",
      ],
      order: [
        ["dataColeta", "ASC"],
        ["createdAt", "ASC"],
      ],
    });

    const { contadorOutProjetado } =
      calcularContadoresProjetados(historicoContadores);

    // Validação: somente ADMIN pode digitar IN/OUT livremente
    if (ultimaMov) {
      // IN não pode ser menor que o anterior para não-admin
      if (
        isValorContadorValido(contadorInSanitizado) &&
        isValorContadorValido(ultimaMov.contadorIn) &&
        contadorInSanitizado < inteiroSeguro(ultimaMov.contadorIn, 0) &&
        !isAdmin
      ) {
        return res.status(400).json({
          error: `O contador IN (${contadorInSanitizado}) não pode ser menor que o anterior (${inteiroSeguro(ultimaMov.contadorIn, 0)}). Apenas ADMIN ou GERENCIADOR pode informar IN/OUT livremente.`,
        });
      }

      // OUT não pode ser menor que o anterior para não-admin,
      // exceto quando for exatamente o valor sugerido.
      const outAnterior = inteiroSeguro(ultimaMov.contadorOut, 0);
      const outDigitado = contadorOutSanitizado;
      const outSugerido = inteiroSeguro(contadorOutProjetado, 0);
      const outMenorQueAnterior =
        isValorContadorValido(outDigitado) &&
        isValorContadorValido(ultimaMov.contadorOut) &&
        outDigitado < outAnterior;
      const outEhSugerido =
        isValorContadorValido(outDigitado) && outDigitado === outSugerido;

      if (!isAdmin && outMenorQueAnterior && !outEhSugerido) {
        return res.status(400).json({
          error: `O contador OUT (${outDigitado}) não pode ser menor que o anterior (${outAnterior}). Se OUT ficar abaixo do anterior, somente o valor sugerido (${outSugerido}) é permitido.`,
        });
      }
    }
    if (
      ultimaMov &&
      totalPreQtd > inteiroSeguro(ultimaMov.totalPos, 0) &&
      !isAdmin
    ) {
      return res.status(400).json({
        error: `Não é permitido abastecer a máquina com uma quantidade maior (${totalPreQtd}) do que o total pós da última movimentação. Confira o que você digitou.`,
      });
    }

    // --- Recalcular saída (sairam) para garantir consistência ---
    // Regra de negócio: saída = totalPos da última movimentação - total atual informado.
    let saidaRecalculada = 0;
    if (ultimaMov) {
      saidaRecalculada = Math.max(
        0,
        inteiroSeguro(ultimaMov.totalPos, 0) - totalPreQtd,
      );
    }
    // Se não houver movimentação anterior, saída é zero

    // Buscar máquina para pegar valorFicha
    const maquina = await Maquina.findByPk(maquinaId);
    if (!maquina) {
      return res.status(404).json({ error: "Máquina não encontrada" });
    }

    const produtoComSaida = Array.isArray(produtos)
      ? produtos.find((item) => Number(item?.quantidadeSaiu || 0) > 0)
      : null;

    const produtoComAbastecimentoPrincipal = Array.isArray(produtos)
      ? produtos.find((item) => Number(item?.quantidadeAbastecida || 0) > 0)
      : null;

    const primeiroProdutoInformado = Array.isArray(produtos)
      ? produtos.find((item) => item?.produtoId)
      : null;

    const produtoNaMaquinaIdFinal =
      produtoNaMaquinaId ||
      produto_na_maquina_id ||
      produtoComSaida?.produtoId ||
      produtoComAbastecimentoPrincipal?.produtoId ||
      primeiroProdutoInformado?.produtoId ||
      null;

    if (produtoNaMaquinaIdFinal) {
      const produtoNaMaquinaExiste = await Produto.findByPk(produtoNaMaquinaIdFinal, {
        attributes: ["id"],
      });
      if (!produtoNaMaquinaExiste) {
        return res.status(400).json({
          error: "produtoNaMaquinaId informado não existe no cadastro de produtos",
        });
      }
    }

    const produtosComAbastecimento = Array.isArray(produtos)
      ? produtos.filter((item) => Number(item?.quantidadeAbastecida || 0) > 0)
      : [];

    if (produtosComAbastecimento.length > 0) {
      const saldoUsuarioCache = new Map();
      const saldoLojaCache = new Map();
      const insuficientes = [];
      const exigeConfirmacaoUsoLoja = [];

      const obterSaldoUsuario = async (produtoId) => {
        if (saldoUsuarioCache.has(produtoId)) {
          return saldoUsuarioCache.get(produtoId);
        }

        const estoqueUsuario = await EstoqueUsuario.findOne({
          where: {
            usuarioId: req.usuario.id,
            produtoId,
          },
        });

        const saldo = Number(estoqueUsuario?.quantidade || 0);
        saldoUsuarioCache.set(produtoId, saldo);
        return saldo;
      };

      const obterSaldoLoja = async (produtoId) => {
        if (saldoLojaCache.has(produtoId)) {
          return saldoLojaCache.get(produtoId);
        }

        const estoqueLoja = await EstoqueLoja.findOne({
          where: {
            lojaId: maquina.lojaId,
            produtoId,
          },
        });

        const saldo = Number(estoqueLoja?.quantidade || 0);
        saldoLojaCache.set(produtoId, saldo);
        return saldo;
      };

      for (const item of produtosComAbastecimento) {
        const produto = await Produto.findByPk(item.produtoId, {
          attributes: ["id", "nome"],
        });

        if (!produto) {
          continue;
        }

        const quantidadeSolicitada = Number(item.quantidadeAbastecida || 0);

        if (origemEstoqueNormalizada === "usuario") {
          const saldoUsuario = await obterSaldoUsuario(item.produtoId);

          if (saldoUsuario < quantidadeSolicitada) {
            insuficientes.push({
              produtoId: item.produtoId,
              produtoNome: produto.nome,
              quantidadeSolicitada,
              saldoDisponivel: saldoUsuario,
              origemEstoque: "usuario",
            });
          }
          continue;
        }

        const saldoLoja = await obterSaldoLoja(item.produtoId);
        if (saldoLoja < quantidadeSolicitada) {
          insuficientes.push({
            produtoId: item.produtoId,
            produtoNome: produto.nome,
            quantidadeSolicitada,
            saldoDisponivel: saldoLoja,
            origemEstoque: "loja",
          });
        }

        const saldoUsuario = await obterSaldoUsuario(item.produtoId);
        if (!confirmarUsoEstoqueLoja && saldoUsuario > 0) {
          exigeConfirmacaoUsoLoja.push({
            produtoId: item.produtoId,
            produtoNome: produto.nome,
            saldoUsuario,
            quantidadeSolicitada,
          });
        }
      }

      if (insuficientes.length > 0) {
        return res.status(400).json({
          error: `Estoque ${origemEstoqueNormalizada} insuficiente para concluir a movimentação`,
          origemEstoque: origemEstoqueNormalizada,
          detalhes: insuficientes,
        });
      }

      if (
        origemEstoqueNormalizada === "loja" &&
        !confirmarUsoEstoqueLoja &&
        exigeConfirmacaoUsoLoja.length > 0
      ) {
        return res.status(409).json({
          error:
            "Voce possui saldo no estoque pessoal para um ou mais produtos. Confirme se deseja retirar da loja mesmo assim.",
          codigo: "CONFIRMAR_USO_ESTOQUE_LOJA",
          origemEstoque: origemEstoqueNormalizada,
          detalhes: exigeConfirmacaoUsoLoja,
        });
      }
    }

    // valorFaturado = fichas * valorFicha + dinheiro(notas) + pix/cartão

    console.log("📝 [registrarMovimentacao] Criando movimentação:", {
      maquinaId,
      totalPre: totalPreQtd,
      sairam: saidaRecalculada,
      abastecidas: abastecidasQtd,
      totalPosCalculado: totalPreQtd - saidaRecalculada + abastecidasQtd,
    });

    // Criar movimentação — persistir TODOS os campos enviados pelo frontend
    const valorFaturado =
      fichasQtd * parseFloat(maquina.valorFicha || 0) +
      notasEntradaValor +
      pixEntradaValor;

    // Verificar justificativa de quebra de ordem pendente para esta loja
    const justificativaPendente = maquina.lojaId
      ? justificativasPendentes.get(maquina.lojaId)
      : null;

    let movimentacaoAnterior = null;
    if (isPrimeiraMovimentacao) {
      movimentacaoAnterior = await Movimentacao.create({
        maquinaId,
        usuarioId: req.usuario.id,
        dataColeta: dataColeta || new Date(),
        totalPre: totalPreQtd,
        sairam: saidaRecalculada,
        abastecidas: abastecidasQtd,
        fichas: fichasQtd,
        valorFaturado: parseFloat(valorFaturado.toFixed(2)),
        contadorIn: contadorInAnteriorSanitizado,
        contadorOut: contadorOutAnteriorSanitizado,
        contadorMaquina: contadorMaquina ?? null,
        quantidade_notas_entrada: possuiNumero(quantidade_notas_entrada)
          ? notasEntradaValor
          : null,
        valor_entrada_maquininha_pix: possuiNumero(valor_entrada_maquininha_pix)
          ? pixEntradaValor
          : null,
        observacoes,
        tipoOcorrencia: tipoOcorrencia || "Normal",
        retiradaEstoque: retiradaEstoque || false,
        retiradaDinheiro: retiradaDinheiro || false,
        produtoNaMaquinaId: produtoNaMaquinaIdFinal,
        roteiroId: roteiroId ?? justificativaPendente?.roteiroId ?? null,
        justificativa_ordem: justificativaPendente?.justificativa ?? null,
      });

      console.log("🧭 [registrarMovimentacao] Primeira movimentação detectada. Registro de contadores anteriores criado:", {
        maquinaId,
        movimentacaoAnteriorId: movimentacaoAnterior.id,
        contadorInAnterior: contadorInAnteriorSanitizado,
        contadorOutAnterior: contadorOutAnteriorSanitizado,
      });
    }

    const movimentacao = await Movimentacao.create({
      maquinaId,
      usuarioId: req.usuario.id,
      dataColeta: dataColeta || new Date(),
      totalPre: totalPreQtd,
      sairam: saidaRecalculada,
      abastecidas: abastecidasQtd,
      fichas: fichasQtd,
      valorFaturado: parseFloat(valorFaturado.toFixed(2)),
      contadorIn: contadorInSanitizado,
      contadorOut: contadorOutSanitizado,
      contadorMaquina: contadorMaquina ?? null,
      quantidade_notas_entrada: possuiNumero(quantidade_notas_entrada)
        ? notasEntradaValor
        : null,
      valor_entrada_maquininha_pix: possuiNumero(valor_entrada_maquininha_pix)
        ? pixEntradaValor
        : null,
      observacoes,
      tipoOcorrencia: tipoOcorrencia || "Normal",
      retiradaEstoque: retiradaEstoque || false,
      retiradaDinheiro: retiradaDinheiro || false,
      produtoNaMaquinaId: produtoNaMaquinaIdFinal,
      roteiroId: roteiroId ?? justificativaPendente?.roteiroId ?? null,
      justificativa_ordem: justificativaPendente?.justificativa ?? null,
    });

    // Consumir justificativa pendente após usá-la
    if (justificativaPendente && maquina.lojaId) {
      justificativasPendentes.delete(maquina.lojaId);
    }

    // Se a movimentação é marcada como retirada de dinheiro, criar registro no FluxoCaixa
    if (retiradaDinheiro) {
      await FluxoCaixa.create({
        movimentacaoId: movimentacao.id,
        conferencia: "pendente",
      });
      console.log(
        "✅ [registrarMovimentacao] Registro de FluxoCaixa criado para movimentação:",
        movimentacao.id,
      );
    }

    // Registrar peças usadas, se houver
    if (
      req.body.pecasUsadas &&
      Array.isArray(req.body.pecasUsadas) &&
      req.body.pecasUsadas.length > 0
    ) {
      await registrarMovimentacaoPecas(movimentacao.id, req.body.pecasUsadas);
    }

    console.log("✅ [registrarMovimentacao] Movimentação criada:", {
      id: movimentacao.id,
      totalPre: movimentacao.totalPre,
      sairam: movimentacao.sairam,
      abastecidas: movimentacao.abastecidas,
      totalPos: movimentacao.totalPos,
    });

    const produtoIdsAjustadosNoEstoqueLoja = new Set();

    // Se produtos foram informados, registrar detalhes
    if (produtos && produtos.length > 0) {
      let detalhesProdutos = [];
      let pecasParaMovimentacao = [];
      for (const p of produtos) {
        // Verifica se é produto
        const produtoExiste = await Produto.findByPk(p.produtoId);
        if (produtoExiste) {
          detalhesProdutos.push({
            movimentacaoId: movimentacao.id,
            produtoId: p.produtoId,
            quantidadeSaiu: p.quantidadeSaiu || 0,
            quantidadeAbastecida: p.quantidadeAbastecida || 0,
            retiradaProduto: p.retiradaProduto || 0,
          });
        } else {
          // Verifica se é peça
          const pecaExiste = await Peca.findByPk(p.produtoId);
          if (pecaExiste) {
            pecasParaMovimentacao.push({
              pecaId: p.produtoId,
              quantidade: p.quantidadeSaiu || 0,
              nome: pecaExiste.nome,
              usuarioId: req.usuario.id,
            });
            // Remove do carrinho do usuário (remover múltiplas desativado)
          }
        }
      }
      if (detalhesProdutos.length > 0) {
        await MovimentacaoProduto.bulkCreate(detalhesProdutos);
        // Atualiza estoque de origem para produtos abastecidos
        for (const produto of detalhesProdutos) {
          if (
            produto.quantidadeAbastecida &&
            produto.quantidadeAbastecida > 0
          ) {
            if (origemEstoqueNormalizada === "loja") {
              const estoqueLoja = await EstoqueLoja.findOne({
                where: {
                  lojaId: maquina.lojaId,
                  produtoId: produto.produtoId,
                },
              });

              if (estoqueLoja) {
                const novaQuantidade = Math.max(
                  0,
                  estoqueLoja.quantidade - produto.quantidadeAbastecida,
                );
                await estoqueLoja.update({ quantidade: novaQuantidade });
                produtoIdsAjustadosNoEstoqueLoja.add(produto.produtoId);
              }
            } else {
              const estoqueUsuario = await EstoqueUsuario.findOne({
                where: {
                  usuarioId: req.usuario.id,
                  produtoId: produto.produtoId,
                },
              });

              if (estoqueUsuario) {
                const novaQuantidade = Math.max(
                  0,
                  estoqueUsuario.quantidade - produto.quantidadeAbastecida,
                );
                await estoqueUsuario.update({ quantidade: novaQuantidade });
              }
            }
          }
        }
      }
      if (pecasParaMovimentacao.length > 0) {
        await registrarMovimentacaoPecas(
          movimentacao.id,
          pecasParaMovimentacao,
        );
      }
    }

    // Se for devolução ao estoque da loja, somar retiradaProduto
    for (const produto of produtos) {
      if (
        produto.retiradaProdutoDevolverEstoque &&
        produto.retiradaProduto > 0
      ) {
        const estoqueLoja = await EstoqueLoja.findOne({
          where: {
            lojaId: maquina.lojaId,
            produtoId: produto.produtoId,
          },
        });
        if (estoqueLoja) {
          const quantidadeAnterior = estoqueLoja.quantidade;
          const novaQuantidade = quantidadeAnterior + produto.retiradaProduto;
          await estoqueLoja.update({ quantidade: novaQuantidade });
          produtoIdsAjustadosNoEstoqueLoja.add(produto.produtoId);
          console.log(
            "✅ [registrarMovimentacao] Devolução: retirada devolvida ao estoque da loja:",
            {
              produtoId: produto.produtoId,
              quantidadeAnterior,
              devolvida: produto.retiradaProduto,
              novaQuantidade,
            },
          );
        } else {
          console.log(
            "⚠️ [registrarMovimentacao] Estoque da loja não encontrado para devolução:",
            {
              lojaId: maquina.lojaId,
              produtoId: produto.produtoId,
            },
          );
        }
      }
    }

    if (
      origemEstoqueNormalizada === "loja" &&
      produtoIdsAjustadosNoEstoqueLoja.size > 0
    ) {
      const lojaAlerta = await Loja.findByPk(maquina.lojaId, {
        attributes: ["id", "nome", "telefone"],
      });

      const destinatarioAlerta =
        lojaAlerta?.telefone || process.env.WHATSAPP_ALERT_DESTINO || null;

      if (destinatarioAlerta) {
        const estoquesAjustados = await EstoqueLoja.findAll({
          where: {
            lojaId: maquina.lojaId,
            produtoId: {
              [Op.in]: Array.from(produtoIdsAjustadosNoEstoqueLoja),
            },
          },
          include: [
            {
              model: Produto,
              as: "produto",
              attributes: ["id", "nome", "estoqueMinimo"],
            },
          ],
        });

        for (const estoqueItem of estoquesAjustados) {
          const minimoDefinido = Number(
            estoqueItem.estoqueMinimo ??
              estoqueItem.produto?.estoqueMinimo ??
              0,
          );

          if (Number(estoqueItem.quantidade) > minimoDefinido) {
            continue;
          }

          AlertManager.estoqueCritico({
            nomeUsuario: req.usuario?.nome || "Sistema",
            telefoneChefe: destinatarioAlerta,
            nomeMaquina:
              maquina.nome || `Loja ${lojaAlerta?.nome || maquina.lojaId}`,
            produto: estoqueItem.produto?.nome || estoqueItem.produtoId,
            quantidadeAtual: Number(estoqueItem.quantidade),
            estoqueMinimo: minimoDefinido,
            referenciaTipo: "estoque_loja",
            referenciaId: estoqueItem.id,
          }).catch((erroAlerta) => {
            console.error(
              "Erro ao disparar alerta de estoque critico:",
              erroAlerta.message,
            );
          });
        }
      }
    }

    // Buscar movimentação completa para retornar
    const movimentacaoCompleta = await Movimentacao.findByPk(movimentacao.id, {
      include: [
        {
          model: Maquina,
          as: "maquina",
          attributes: ["id", "codigo", "nome", "lojaId"],
        },
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nome", "email"],
        },
        {
          model: MovimentacaoProduto,
          as: "detalhesProdutos",
          include: [
            {
              model: Produto,
              as: "produto",
              attributes: ["id", "nome", "categoria"],
            },
          ],
        },
      ],
    });

    // Marcação de conclusão da máquina no roteiro (persistente até reset semanal)
    const hoje = new Date();
    const dataHoje = hoje.toISOString().slice(0, 10); // yyyy-mm-dd
    // LOG detalhado dos dados recebidos
    console.log("[LOG] Dados recebidos para registrar movimentação:", {
      maquinaId,
      roteiroId,
      dataHoje,
      usuario: req.usuario ? req.usuario.id : null,
      produtos,
    });
    console.log("[MovStatus] Tentando registrar status:", {
      maquina_id: maquinaId,
      roteiro_id: roteiroId,
      data: dataHoje,
      concluida: true,
    });
    const statusExistente = await MovimentacaoStatusDiario.findOne({
      where: {
        maquina_id: maquinaId,
        roteiro_id: roteiroId,
        concluida: true,
      },
    });
    console.log(
      "[LOG] Status existente MovimentacaoStatusDiario:",
      statusExistente,
    );
    if (statusExistente) {
      console.log(
        "[MovStatus] Máquina já concluída para este roteiro nesta semana. Mantendo status concluído.",
      );
    } else {
      // Após registrar movimentação, marcar como concluída
      const upsertResult = await MovimentacaoStatusDiario.upsert({
        maquina_id: maquinaId,
        roteiro_id: roteiroId,
        data: dataHoje,
        concluida: true,
      });
      console.log(
        "[LOG] Resultado do upsert MovimentacaoStatusDiario:",
        upsertResult,
      );
    }
    // Logar movimentacaoCompleta antes de retornar
    console.log("[LOG] Movimentação registrada com sucesso:", {
      movimentacaoId: movimentacao.id,
      maquinaId,
      roteiroId,
      dataHoje,
      usuario: req.usuario ? req.usuario.id : null,
      movimentacaoCompleta,
    });

    // Remover apenas as peças usadas do carrinho do usuário
    const pecasUsadas = req.body.pecasUsadas;
    if (pecasUsadas && Array.isArray(pecasUsadas) && pecasUsadas.length > 0) {
      const usuarioId = req.usuario.id;
      for (const peca of pecasUsadas) {
        await CarrinhoPeca.destroy({
          where: {
            usuarioId,
            pecaId: peca.pecaId,
          },
        });
      }
    }

    const movimentacaoResposta = movimentacaoCompleta.toJSON();
    movimentacaoResposta.origemEstoqueAplicada = origemEstoqueNormalizada;
    movimentacaoResposta.primeiraMovimentacaoDuplicada = isPrimeiraMovimentacao;
    movimentacaoResposta.movimentacaoAnteriorId = movimentacaoAnterior?.id || null;

    res.locals.entityId = movimentacao.id;
    res.status(201).json(movimentacaoResposta);
    return;
  } catch (error) {
    console.error("Erro ao registrar movimentação:", error);
    res.status(500).json({ error: "Erro ao registrar movimentação" });
  }
};

// Listar movimentações com filtros
export const listarMovimentacoes = async (req, res) => {
  try {
    const {
      lojaId,
      maquinaId,
      limite = 100,
      apenasJustificativasNovas,
    } = req.query;
    const where = {};
    if (maquinaId) where.maquinaId = maquinaId;
    if (apenasJustificativasNovas === "true") {
      where.status_justificativa = "nova";
    }
    const include = [
      {
        model: Maquina,
        as: "maquina",
        attributes: ["id", "codigo", "nome", "lojaId"],
        ...(lojaId ? { where: { lojaId } } : {}),
      },
      {
        model: Usuario,
        as: "usuario",
        attributes: ["id", "nome"],
      },
      {
        model: MovimentacaoProduto,
        as: "detalhesProdutos",
        include: [
          {
            model: Produto,
            as: "produto",
            attributes: ["id", "nome"],
          },
        ],
      },
      {
        association: "pecasUsadas",
        include: [{ model: Peca }],
      },
    ];

    const movimentacoes = await Movimentacao.findAll({
      where,
      include,
      order: [["dataColeta", "DESC"]],
      limit: parseInt(limite),
    });

    // Normaliza a resposta: expõe lojaId diretamente (via maquina.lojaId)
    const LogOrdemRoteiro = (await import("../models/LogOrdemRoteiro.js"))
      .default;
    const result = await Promise.all(
      movimentacoes.map(async (mov) => {
        const json = mov.toJSON();
        if (!json.lojaId && json.maquina?.lojaId) {
          json.lojaId = json.maquina.lojaId;
        }
        // Se houve quebra de ordem, buscar info do log
        if (json.justificativa_ordem) {
          const log = await LogOrdemRoteiro.findOne({
            where: {
              lojaId: json.lojaId,
              justificativa: json.justificativa_ordem,
            },
            order: [["createdAt", "DESC"]],
          });
          if (log) {
            json.lojaIdEsperada = log.lojaEsperadaId || null;
            json.lojaEsperadaNome = log.lojaEsperadaNome || null;
          } else {
            json.lojaIdEsperada = null;
            json.lojaEsperadaNome = null;
          }
        } else {
          json.lojaIdEsperada = null;
          json.lojaEsperadaNome = null;
        }
        // Expor nome da loja visitada
        json.lojaNome = json.maquina?.loja?.nome || null;
        return json;
      }),
    );
    res.json(result);
  } catch (error) {
    console.error("Erro ao listar movimentações:", error);
    res.status(500).json({ error: "Erro ao listar movimentações" });
  }
};

// Obter movimentação por ID
export const obterMovimentacao = async (req, res) => {
  try {
    const movimentacao = await Movimentacao.findByPk(req.params.id, {
      include: [
        {
          model: Maquina,
          as: "maquina",
          include: [
            {
              model: Loja,
              as: "loja",
              attributes: ["id", "nome"],
            },
          ],
        },
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nome", "email"],
        },
        {
          model: MovimentacaoProduto,
          as: "detalhesProdutos",
          include: [
            {
              model: Produto,
              as: "produto",
            },
          ],
        },
        {
          association: "pecasUsadas",
          include: [{ model: Peca }],
        },
      ],
    });

    if (!movimentacao) {
      return res.status(404).json({ error: "Movimentação não encontrada" });
    }

    res.json(movimentacao);
  } catch (error) {
    console.error("Erro ao obter movimentação:", error);
    res.status(500).json({ error: "Erro ao obter movimentação" });
  }
};

// Atualizar movimentação (permite editar campos principais)
export const atualizarMovimentacao = async (req, res) => {
  try {
    const movimentacao = await Movimentacao.findByPk(req.params.id);

    if (!movimentacao) {
      return res.status(404).json({ error: "Movimentação não encontrada" });
    }

    // Apenas admin ou o próprio usuário que criou pode editar
    if (
      !["ADMIN", "GERENCIADOR"].includes(req.usuario.role) &&
      movimentacao.usuarioId !== req.usuario.id
    ) {
      return res
        .status(403)
        .json({ error: "Você não pode editar esta movimentação" });
    }

    const {
      observacoes,
      tipoOcorrencia,
      fichas,
      totalPre,
      sairam,
      abastecidas,
      contadorIn,
      contadorOut,
      contadorMaquina,
      quantidade_notas_entrada,
      valor_entrada_maquininha_pix,
      dataColeta,
    } = req.body;

    // Preparar dados para atualização
    const updateData = {
      observacoes: observacoes ?? movimentacao.observacoes,
      tipoOcorrencia: tipoOcorrencia ?? movimentacao.tipoOcorrencia,
      fichas:
        fichas !== undefined ? parseInt(fichas) || 0 : movimentacao.fichas,
      totalPre:
        totalPre !== undefined
          ? parseInt(totalPre) || 0
          : movimentacao.totalPre,
      sairam:
        sairam !== undefined ? parseInt(sairam) || 0 : movimentacao.sairam,
      abastecidas:
        abastecidas !== undefined
          ? parseInt(abastecidas) || 0
          : movimentacao.abastecidas,
      contadorIn:
        contadorIn !== undefined
          ? parseInt(contadorIn) || null
          : movimentacao.contadorIn,
      contadorOut:
        contadorOut !== undefined
          ? parseInt(contadorOut) || null
          : movimentacao.contadorOut,
      contadorMaquina:
        contadorMaquina !== undefined
          ? parseInt(contadorMaquina) || null
          : movimentacao.contadorMaquina,
      quantidade_notas_entrada:
        quantidade_notas_entrada !== undefined
          ? parseFloat(quantidade_notas_entrada) || null
          : movimentacao.quantidade_notas_entrada,
      valor_entrada_maquininha_pix:
        valor_entrada_maquininha_pix !== undefined
          ? parseFloat(valor_entrada_maquininha_pix) || null
          : movimentacao.valor_entrada_maquininha_pix,
      dataColeta:
        dataColeta !== undefined
          ? new Date(dataColeta)
          : movimentacao.dataColeta,
    };

    // Recalcular totalPos baseado nos novos valores
    // Para movimentações normais (não retirada de estoque)
    if (!movimentacao.retiradaEstoque) {
      updateData.totalPos = updateData.totalPre + updateData.abastecidas;
    } else {
      // Para retirada de estoque
      updateData.totalPos =
        updateData.totalPre - updateData.sairam + updateData.abastecidas;
    }

    // Se sairam > 0, recalcular média fichas/prêmio
    if (updateData.sairam > 0) {
      updateData.mediaFichasPremio = (
        updateData.fichas / updateData.sairam
      ).toFixed(2);
    }

    // Se fichas, notas ou digital foram atualizados, recalcular o valorFaturado
    if (
      fichas !== undefined ||
      quantidade_notas_entrada !== undefined ||
      valor_entrada_maquininha_pix !== undefined
    ) {
      const maquina = await Maquina.findByPk(movimentacao.maquinaId);
      if (maquina) {
        updateData.valorFaturado =
          updateData.fichas * parseFloat(maquina.valorFicha) +
          (updateData.quantidade_notas_entrada
            ? parseFloat(updateData.quantidade_notas_entrada)
            : 0) +
          (updateData.valor_entrada_maquininha_pix
            ? parseFloat(updateData.valor_entrada_maquininha_pix)
            : 0);
      }
    }

    await movimentacao.update(updateData);

    // Retornar movimentação atualizada com dados completos
    const movimentacaoAtualizada = await Movimentacao.findByPk(req.params.id, {
      include: [
        {
          model: Maquina,
          as: "maquina",
          attributes: ["id", "codigo", "nome", "lojaId"],
        },
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nome", "email"],
        },
        {
          model: MovimentacaoProduto,
          as: "detalhesProdutos",
          include: [
            {
              model: Produto,
              as: "produto",
              attributes: ["id", "nome"],
            },
          ],
        },
      ],
    });

    res.json(movimentacaoAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar movimentação:", error);
    res.status(500).json({ error: "Erro ao atualizar movimentação" });
  }
};

// Deletar movimentação (apenas ADMIN)
export const deletarMovimentacao = async (req, res) => {
  try {
    const movimentacao = await Movimentacao.findByPk(req.params.id);

    if (!movimentacao) {
      return res.status(404).json({ error: "Movimentação não encontrada" });
    }

    await movimentacao.destroy();

    res.json({ message: "Movimentação deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar movimentação:", error);
    res.status(500).json({ error: "Erro ao deletar movimentação" });
  }
};

// GET /relatorios/alertas-abastecimento-incompleto?lojaId=...&dataInicio=...&dataFim=...
export const alertasAbastecimentoIncompleto = async (req, res) => {
  try {
    const { lojaId, dataInicio, dataFim, maquinaId } = req.query;
    const { Movimentacao, Maquina, Usuario, AlertaIgnorado } =
      await import("../models/index.js");

    const usuarioId = req.usuario?.id;

    // Busca movimentações no período, loja e máquina
    const whereMov = {};
    if (dataInicio || dataFim) {
      whereMov.dataColeta = {};
      if (dataInicio) whereMov.dataColeta[Op.gte] = new Date(dataInicio);
      if (dataFim) whereMov.dataColeta[Op.lte] = new Date(dataFim);
    }
    if (maquinaId) {
      whereMov.maquinaId = maquinaId;
    }

    const include = [
      {
        model: Maquina,
        as: "maquina",
        attributes: ["id", "nome", "capacidadePadrao", "lojaId"],
        ...(lojaId ? { where: { lojaId } } : {}),
      },
      {
        model: Usuario,
        as: "usuario",
        attributes: ["id", "nome"],
      },
    ];

    // Busca movimentações com abastecimento
    const movimentacoes = await Movimentacao.findAll({
      where: whereMov,
      include,
      order: [["dataColeta", "DESC"]],
    });

    // Buscar alertas ignorados globalmente
    const ignorados = await AlertaIgnorado.findAll();
    const ignoradosSet = new Set(ignorados.map((a) => a.alertaId));

    // Gera alertas para abastecimento incompleto
    const alertas = movimentacoes
      .filter((mov) => {
        const alertaId = `abastecimento-${mov.maquina.id}-${mov.id}`;
        // Só alerta se houve abastecimento e o totalDepois é diferente do padrão
        // e se não foi ignorado pelo usuário
        if (
          mov.abastecidas > 0 &&
          mov.totalPre + mov.abastecidas !== mov.maquina.capacidadePadrao &&
          !ignoradosSet.has(alertaId)
        ) {
          return true;
        }
        return false;
      })
      .map((mov) => ({
        id: `abastecimento-${mov.maquina.id}-${mov.id}`,
        tipo: "abastecimento_incompleto",
        maquinaId: mov.maquina.id,
        maquinaNome: mov.maquina.nome,
        capacidadePadrao: mov.maquina.capacidadePadrao,
        totalAntes: mov.totalPre,
        abastecido: mov.abastecidas,
        totalDepois: mov.totalPre + mov.abastecidas,
        usuario: mov.usuario?.nome,
        dataMovimentacao: mov.dataColeta,
        observacao: mov.observacoes || "Sem observação",
        mensagem: `Abastecimento incompleto: padrão ${
          mov.maquina.capacidadePadrao
        }, tinha ${mov.totalPre}, abasteceu ${mov.abastecidas}, ficou com ${
          mov.totalPre + mov.abastecidas
        }. Motivo: ${mov.observacoes || "Não informado"}`,
      }));

    res.json({ alertas });
  } catch (error) {
    console.error("Erro ao buscar alertas de abastecimento incompleto:", error);
    res
      .status(500)
      .json({ error: "Erro ao buscar alertas de abastecimento incompleto" });
  }
};

// GET /maquinas/:id/problema
export const problemaMaquina = async (req, res) => {
  try {
    const { id } = req.params;
    const maquina = await Maquina.findByPk(id);
    if (!maquina) {
      return res.status(404).json({ error: "Máquina não encontrada" });
    }
    // Busca última movimentação
    const ultimaMov = await Movimentacao.findOne({
      where: { maquinaId: id },
      order: [["dataColeta", "DESC"]],
    });
    const problemas = [];
    // Buscar alerta de inconsistência de IN/OUT (igual rota de alertas)
    const movimentacoes = await Movimentacao.findAll({
      where: { maquinaId: id },
      order: [["dataColeta", "DESC"]],
      limit: 2,
      attributes: [
        "id",
        "contadorIn",
        "contadorOut",
        "fichas",
        "sairam",
        "dataColeta",
      ],
    });
    if (movimentacoes.length === 2) {
      const atual = movimentacoes[0];
      const anterior = movimentacoes[1];
      const diffOut = (atual.contadorOut || 0) - (anterior.contadorOut || 0);
      const diffIn = (atual.contadorIn || 0) - (anterior.contadorIn || 0);
      if (
        (diffOut !== (atual.sairam || 0) || diffIn !== (atual.fichas || 0)) &&
        !(atual.contadorOut === 0 && atual.contadorIn === 0)
      ) {
        problemas.push({
          tipo: "inconsistencia_contador",
          mensagem: `Inconsistência detectada: OUT (${diffOut}) esperado ${
            atual.sairam
          }, IN (${diffIn}) esperado ${atual.fichas}. OUT registrado: ${
            atual.contadorOut || 0
          } | IN registrado: ${atual.contadorIn || 0} | Fichas: ${
            atual.fichas
          }`,
          data: atual.dataColeta,
        });
      }
    }
    // Regra: abastecimento incompleto
    if (
      ultimaMov &&
      typeof ultimaMov.abastecidas === "number" &&
      typeof ultimaMov.totalPre === "number" &&
      ultimaMov.abastecidas > 0 &&
      ultimaMov.totalPre + ultimaMov.abastecidas !== maquina.capacidadePadrao
    ) {
      problemas.push({
        tipo: "abastecimento",
        mensagem: `Abastecimento incompleto: padrão ${
          maquina.capacidadePadrao
        }, tinha ${ultimaMov.totalPre}, abasteceu ${
          ultimaMov.abastecidas
        }, ficou com ${ultimaMov.totalPre + ultimaMov.abastecidas}. Motivo: ${
          ultimaMov.observacoes || "Não informado"
        }`,
        data: ultimaMov.dataColeta,
      });
    }
    res.json({
      maquina: {
        id: maquina.id,
        nome: maquina.nome,
        capacidadePadrao: maquina.capacidadePadrao,
      },
      problemas,
    });
  } catch (error) {
    console.error("Erro ao buscar problema da máquina:", error);
    res.status(500).json({ error: "Erro ao buscar problema da máquina" });
  }
};

// Relatório de movimentações do dia
export const relatorioMovimentacoesDia = async (req, res) => {
  try {
    const { data, lojaId } = req.query;
    const targetDate = data ? new Date(data) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const whereMovimentacao = {
      dataColeta: { [Op.between]: [startOfDay, endOfDay] },
      retiradaEstoque: false,
    };

    const whereMaquina = {};
    if (lojaId) whereMaquina.lojaId = lojaId;

    const movimentacoes = await Movimentacao.findAll({
      where: whereMovimentacao,
      include: [
        {
          model: Maquina,
          as: "maquina",
          where: Object.keys(whereMaquina).length ? whereMaquina : undefined,
          include: [{ model: Loja, as: "loja", attributes: ["id", "nome"] }],
          attributes: { include: ["valorFicha"] },
        },
        { model: Usuario, as: "usuario", attributes: ["id", "nome"] },
      ],
      order: [["dataColeta", "DESC"]],
    });

    const totalFaturado = movimentacoes.reduce((acc, m) => {
      const fqtd = parseInt(m.fichas) || 0;
      const vf = parseFloat(m.maquina?.valorFicha || 0);
      const fat =
        fqtd * vf +
        parseFloat(m.quantidade_notas_entrada || 0) +
        parseFloat(m.valor_entrada_maquininha_pix || 0);
      return acc + fat;
    }, 0);
    const totalFichas = movimentacoes.reduce(
      (acc, m) => acc + (m.fichas || 0),
      0,
    );
    const totalSairam = movimentacoes.reduce(
      (acc, m) => acc + (m.sairam || 0),
      0,
    );

    res.json({
      data: targetDate.toISOString().split("T")[0],
      totalMovimentacoes: movimentacoes.length,
      totalFaturado,
      totalFichas,
      totalSairam,
      movimentacoes,
    });
  } catch (error) {
    console.error("Erro no relatório de movimentações do dia:", error);
    res
      .status(500)
      .json({ error: "Erro ao gerar relatório de movimentações do dia" });
  }
};

// Relatório de lucro total do dia
// Receita bruta = (fichas × valorFicha) + dinheiro (notas) + pix/cartão
// Custo produtos = Σ(quantidadeSaiu × custoUnitario)
// Comissão = Σ(receita_maquina × comissaoLojaPercentual / 100)
// Lucro líquido = receita bruta − custo produtos − comissão − custos fixos − custos variáveis
export const relatorioLucroTotalDia = async (req, res) => {
  try {
    const { data, lojaId } = req.query;
    if (!lojaId) {
      return res.status(400).json({ error: "Parâmetro lojaId é obrigatório" });
    }
    const targetDate = data ? new Date(data) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    const dataISO = targetDate.toISOString().split("T")[0];

    const whereMovimentacao = {
      dataColeta: { [Op.between]: [startOfDay, endOfDay] },
      retiradaEstoque: false,
    };
    const whereMaquina = { lojaId };

    // 1) Buscar movimentações do dia com dados da máquina
    // NÃO usar raw:true para garantir nomes corretos de atributos com field: mapping
    const movimentacoesRaw = await Movimentacao.findAll({
      where: whereMovimentacao,
      include: [
        {
          model: Maquina,
          as: "maquina",
          where: whereMaquina,
          attributes: ["id", "nome", "valorFicha", "comissaoLojaPercentual"],
        },
      ],
    });
    const movimentacoes = movimentacoesRaw.map((m) => m.toJSON());

    console.log(
      `[RELATORIO LUCRO] ${movimentacoes.length} movimentações encontradas para loja ${lojaId} em ${dataISO}`,
    );
    if (movimentacoes.length > 0) {
      console.log("[RELATORIO LUCRO] Exemplo mov[0]:", {
        fichas: movimentacoes[0].fichas,
        quantidade_notas_entrada: movimentacoes[0].quantidade_notas_entrada,
        valor_entrada_maquininha_pix:
          movimentacoes[0].valor_entrada_maquininha_pix,
        maquina_valorFicha: movimentacoes[0].maquina?.valorFicha,
        maquina_comissao: movimentacoes[0].maquina?.comissaoLojaPercentual,
      });
    }

    // 2) Calcular receita bruta por movimentação
    let totalFichasValor = 0;
    let totalDinheiro = 0;
    let totalPix = 0;
    let comissaoTotal = 0;
    let totalFichasQtd = 0;

    for (const m of movimentacoes) {
      const fichas = parseInt(m.fichas) || 0;
      const valorFicha = parseFloat(m.maquina?.valorFicha || 0);
      const fichasValor = fichas * valorFicha;
      const dinheiro = parseFloat(m.quantidade_notas_entrada || 0);
      const pix = parseFloat(m.valor_entrada_maquininha_pix || 0);
      const receitaMaquina = fichasValor + dinheiro + pix;

      totalFichasQtd += fichas;
      totalFichasValor += fichasValor;
      totalDinheiro += dinheiro;
      totalPix += pix;

      // Comissão da loja por máquina
      const percentual = parseFloat(m.maquina?.comissaoLojaPercentual || 0);
      comissaoTotal += (receitaMaquina * percentual) / 100;
    }

    const receitaBruta = totalFichasValor + totalDinheiro + totalPix;

    console.log("[RELATORIO LUCRO] Totais calculados:", {
      receitaBruta,
      totalFichasValor,
      totalDinheiro,
      totalPix,
      comissaoTotal,
    });

    // 3) Custo dos produtos que saíram
    const itensVendidosRaw = await MovimentacaoProduto.findAll({
      attributes: ["quantidadeSaiu"],
      include: [
        { model: Produto, as: "produto", attributes: ["custoUnitario"] },
        {
          model: Movimentacao,
          attributes: [],
          where: whereMovimentacao,
          include: [
            {
              model: Maquina,
              as: "maquina",
              where: whereMaquina,
              attributes: [],
            },
          ],
        },
      ],
    });
    const itensVendidos = itensVendidosRaw.map((i) => i.toJSON());

    const custoProdutos = itensVendidos.reduce((acc, item) => {
      const qtd = parseInt(item.quantidadeSaiu) || 0;
      const custo = parseFloat(item.produto?.custoUnitario || 0);
      return acc + qtd * custo;
    }, 0);

    // 4) Custos fixos e variáveis do financeiro (contas_financeiro) para o dia/loja
    let custosFixos = 0;
    let custosVariaveis = 0;
    try {
      const loja = await Loja.findByPk(lojaId, { attributes: ["nome"] });
      if (loja) {
        const contasDoDia = await ContasFinanceiro.findAll({
          where: {
            due_date: dataISO,
            city: loja.nome,
            status: { [Op.ne]: "paid" },
          },
          raw: true,
        });
        for (const conta of contasDoDia) {
          const valor = parseFloat(conta.value || 0);
          const tipo = (conta.bill_type || "").toLowerCase();
          if (tipo.includes("fixo") || tipo === "fixed") {
            custosFixos += valor;
          } else {
            custosVariaveis += valor;
          }
        }
      }
    } catch (finErr) {
      console.warn("⚠️ Erro ao buscar custos financeiros:", finErr.message);
    }

    // 5) Lucro líquido = receita - produtos - comissão - custos
    const lucroTotal =
      receitaBruta -
      custoProdutos -
      comissaoTotal -
      custosFixos -
      custosVariaveis;

    res.json({
      lojaId,
      data: dataISO,
      receitaBruta: parseFloat(receitaBruta.toFixed(2)),
      detalhesReceita: {
        fichasQuantidade: totalFichasQtd,
        fichasValor: parseFloat(totalFichasValor.toFixed(2)),
        dinheiro: parseFloat(totalDinheiro.toFixed(2)),
        pixCartao: parseFloat(totalPix.toFixed(2)),
      },
      custoProdutos: parseFloat(custoProdutos.toFixed(2)),
      comissaoTotal: parseFloat(comissaoTotal.toFixed(2)),
      custosFixos: parseFloat(custosFixos.toFixed(2)),
      custosVariaveis: parseFloat(custosVariaveis.toFixed(2)),
      lucroTotal: parseFloat(lucroTotal.toFixed(2)),
    });
  } catch (error) {
    console.error("Erro no relatório de lucro do dia:", error);
    res.status(500).json({ error: "Erro ao gerar relatório de lucro do dia" });
  }
};

// Relatório de comissão total do dia
// Comissão = receita_por_maquina × comissaoLojaPercentual / 100
// Receita por máquina = (fichas × valorFicha) + dinheiro + pix
export const relatorioComissaoTotalDia = async (req, res) => {
  try {
    const { data, lojaId } = req.query;
    if (!lojaId) {
      return res.status(400).json({ error: "Parâmetro lojaId é obrigatório" });
    }
    const targetDate = data ? new Date(data) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    const dataISO = targetDate.toISOString().split("T")[0];

    const whereMovimentacao = {
      dataColeta: { [Op.between]: [startOfDay, endOfDay] },
      retiradaEstoque: false,
    };
    const whereMaquina = { lojaId };

    // NÃO usar raw:true para garantir nomes corretos (comissaoLojaPercentual vs comissao_loja_percentual)
    const movimentacoesRaw = await Movimentacao.findAll({
      where: whereMovimentacao,
      include: [
        {
          model: Maquina,
          as: "maquina",
          where: whereMaquina,
          attributes: ["id", "nome", "valorFicha", "comissaoLojaPercentual"],
        },
      ],
    });
    const movimentacoes = movimentacoesRaw.map((m) => m.toJSON());

    console.log(
      `[RELATORIO COMISSAO] ${movimentacoes.length} movimentações encontradas para loja ${lojaId} em ${dataISO}`,
    );
    if (movimentacoes.length > 0) {
      console.log("[RELATORIO COMISSAO] Exemplo mov[0]:", {
        fichas: movimentacoes[0].fichas,
        quantidade_notas_entrada: movimentacoes[0].quantidade_notas_entrada,
        valor_entrada_maquininha_pix:
          movimentacoes[0].valor_entrada_maquininha_pix,
        maquina_valorFicha: movimentacoes[0].maquina?.valorFicha,
        maquina_comissao: movimentacoes[0].maquina?.comissaoLojaPercentual,
        maquina_nome: movimentacoes[0].maquina?.nome,
      });
    }

    let comissaoTotal = 0;
    const comissaoPorMaquina = {};

    for (const m of movimentacoes) {
      const fichas = parseInt(m.fichas) || 0;
      const valorFicha = parseFloat(m.maquina?.valorFicha || 0);
      const fichasValor = fichas * valorFicha;
      const dinheiro = parseFloat(m.quantidade_notas_entrada || 0);
      const pix = parseFloat(m.valor_entrada_maquininha_pix || 0);
      const receitaMaquina = fichasValor + dinheiro + pix;

      const percentual = parseFloat(m.maquina?.comissaoLojaPercentual || 0);
      const comissao = (receitaMaquina * percentual) / 100;
      comissaoTotal += comissao;

      console.log(
        `[RELATORIO COMISSAO] Máquina ${m.maquina?.nome}: fichas=${fichas} x R$${valorFicha} = R$${fichasValor}, dinheiro=R$${dinheiro}, pix=R$${pix}, receita=R$${receitaMaquina}, comissao=${percentual}% = R$${comissao.toFixed(2)}`,
      );

      const maqId = m.maquina?.id;
      if (maqId) {
        if (!comissaoPorMaquina[maqId]) {
          comissaoPorMaquina[maqId] = {
            maquinaId: maqId,
            maquinaNome: m.maquina?.nome || "Desconhecida",
            percentualComissao: percentual,
            receitaTotal: 0,
            comissaoTotal: 0,
          };
        }
        comissaoPorMaquina[maqId].receitaTotal += receitaMaquina;
        comissaoPorMaquina[maqId].comissaoTotal += comissao;
      }
    }

    const detalhesPorMaquina = Object.values(comissaoPorMaquina).map((d) => ({
      ...d,
      receitaTotal: parseFloat(d.receitaTotal.toFixed(2)),
      comissaoTotal: parseFloat(d.comissaoTotal.toFixed(2)),
    }));

    console.log(
      `[RELATORIO COMISSAO] Total comissão: R$${comissaoTotal.toFixed(2)}, Máquinas: ${detalhesPorMaquina.length}`,
    );

    res.json({
      lojaId,
      data: dataISO,
      comissaoTotal: parseFloat(comissaoTotal.toFixed(2)),
      detalhesPorMaquina,
    });
  } catch (error) {
    console.error("Erro no relatório de comissão do dia:", error);
    res
      .status(500)
      .json({ error: "Erro ao gerar relatório de comissão do dia" });
  }
};
