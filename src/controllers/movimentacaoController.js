import {
  Movimentacao,
  MovimentacaoProduto,
  Maquina,
  Usuario,
  Produto,
  EstoqueLoja,
  Loja,
  CarrinhoPeca,
} from "../models/index.js";
import { Op } from "sequelize";
import { registrarMovimentacaoPecas } from "./movimentacaoPecaController.js";
import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";

// US08, US09, US10 - Registrar movimentação completa
export const registrarMovimentacao = async (req, res) => {
  // Validação aprimorada de campos obrigatórios
  const requiredFields = [
    "maquinaId",
    "roteiroId",
    "totalPre",
    "abastecidas",
    "fichas",
    "contadorIn",
    "contadorOut",
    "quantidade_notas_entrada",
    "valor_entrada_maquininha_pix",
    "retiradaEstoque",
    "retiradaProduto",
    "observacoes",
    "produtos",
  ];
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
      contadorInManual,
      contadorOutManual,
      contadorInDigital,
      contadorOutDigital,
      observacoes,
      tipoOcorrencia,
      retiradaEstoque,
      produtos, // Array de { produtoId, quantidadeSaiu, quantidadeAbastecida }
      roteiroId, // deve ser enviado pelo frontend
      // fichas removido
      quantidade_notas_entrada, // <-- adicionado para corrigir erro
    } = req.body;

    // (Removido alerta/bloqueio de pular loja: agora permite movimentação em qualquer loja do roteiro)

    // Validações
    if (!maquinaId || totalPre === undefined || abastecidas === undefined) {
      return res.status(400).json({
        error: "maquinaId, totalPre e abastecidas são obrigatórios",
      });
    }

    // --- REGRA DE SEGURANÇA: Não permitir total maior que totalPos da última movimentação, exceto para ADMIN ---
    const ultimaMov = await Movimentacao.findOne({
      where: { maquinaId },
      order: [["createdAt", "DESC"]],
    });
    // Validação: contadorIn/contadorOut digitais não pode ser menor que o anterior, exceto ADMIN, ou se não enviado ou zero
    if (ultimaMov) {
      // contadorInDigital
      if (
        typeof contadorInDigital === "number" &&
        contadorInDigital > 0 &&
        typeof ultimaMov.contadorInDigital === "number" &&
        ultimaMov.contadorInDigital !== null &&
        contadorInDigital < ultimaMov.contadorInDigital &&
        req.usuario.role !== "ADMIN"
      ) {
        return res.status(400).json({
          error: `O contador IN Digital (${contadorInDigital}) não pode ser menor que o anterior. Verifique o valor digitado ou peça ajuda ao gestor.`,
        });
      }
      // contadorOutDigital
      if (
        typeof contadorOutDigital === "number" &&
        contadorOutDigital > 0 &&
        typeof ultimaMov.contadorOutDigital === "number" &&
        ultimaMov.contadorOutDigital !== null &&
        contadorOutDigital < ultimaMov.contadorOutDigital &&
        req.usuario.role !== "ADMIN"
      ) {
        return res.status(400).json({
          error: `O contador OUT Digital (${contadorOutDigital}) não pode ser menor que o anterior. Verifique o valor digitado ou peça ajuda ao gestor.`,
        });
      }
    }
    if (
      ultimaMov &&
      typeof ultimaMov.totalPos === "number" &&
      totalPre > ultimaMov.totalPos &&
      req.usuario.role !== "ADMIN"
    ) {
      return res.status(400).json({
        error: `Não é permitido abastecer a máquina com uma quantidade maior (${totalPre}) do que o total pós da última movimentação. Confira o que você digitou.`,
      });
    }

    // --- Recalcular saída (sairam) para garantir consistência ---
    // Usar contadores digitais para cálculo
    let saidaRecalculada = 0;
    if (
      typeof contadorInDigital === "number" &&
      typeof contadorOutDigital === "number"
    ) {
      saidaRecalculada = Math.max(0, contadorOutDigital - contadorInDigital);
    } else if (ultimaMov && typeof ultimaMov.totalPos === "number") {
      saidaRecalculada = Math.max(0, ultimaMov.totalPos - totalPre);
    }
    // Se não houver movimentação anterior, saída é zero

    // Buscar máquina para pegar valorFicha
    const maquina = await Maquina.findByPk(maquinaId);
    if (!maquina) {
      return res.status(404).json({ error: "Máquina não encontrada" });
    }

    // valorFaturado removido (não é mais calculado nem usado)

    console.log("📝 [registrarMovimentacao] Criando movimentação:", {
      maquinaId,
      totalPre,
      sairam: saidaRecalculada,
      abastecidas,
      totalPosCalculado: totalPre - saidaRecalculada + abastecidas,
    });

    // Criar movimentação
    const movimentacao = await Movimentacao.create({
      maquinaId,
      usuarioId: req.usuario.id,
      dataColeta: dataColeta || new Date(),
      totalPre,
      sairam: saidaRecalculada,
      abastecidas,
      contadorInManual,
      contadorOutManual,
      contadorInDigital,
      contadorOutDigital,
      observacoes,
      tipoOcorrencia: tipoOcorrencia || "Normal",
      retiradaEstoque: retiradaEstoque || false,
    });

    // Registrar peças usadas, se houver
    if (req.body.pecasUsadas && Array.isArray(req.body.pecasUsadas) && req.body.pecasUsadas.length > 0) {
      await registrarMovimentacaoPecas(movimentacao.id, req.body.pecasUsadas);
    }

    console.log("✅ [registrarMovimentacao] Movimentação criada:", {
      id: movimentacao.id,
      totalPre: movimentacao.totalPre,
      sairam: movimentacao.sairam,
      abastecidas: movimentacao.abastecidas,
      totalPos: movimentacao.totalPos,
    });

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
            // Remove do carrinho do usuário
            if (typeof req.usuario.id !== 'undefined') {
              try {
                const { removerPecaDoCarrinho } = await import("./carrinhoPecaController.js");
                await removerPecaDoCarrinho(req.usuario.id, p.produtoId);
              } catch (err) {
                console.error("Erro ao remover peça do carrinho:", err);
              }
            }
          }
        }
      }
      if (detalhesProdutos.length > 0) {
        await MovimentacaoProduto.bulkCreate(detalhesProdutos);
        // Atualiza estoque da loja para produtos
        for (const produto of detalhesProdutos) {
          if (produto.quantidadeAbastecida && produto.quantidadeAbastecida > 0) {
            const estoqueLoja = await EstoqueLoja.findOne({
              where: {
                lojaId: maquina.lojaId,
                produtoId: produto.produtoId,
              },
            });
            if (estoqueLoja) {
              const novaQuantidade = Math.max(0, estoqueLoja.quantidade - produto.quantidadeAbastecida);
              await estoqueLoja.update({ quantidade: novaQuantidade });
            }
          }
        }
      }
      if (pecasParaMovimentacao.length > 0) {
        await registrarMovimentacaoPecas(movimentacao.id, pecasParaMovimentacao);
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

    // Impedir movimentação duplicada para máquina/roteiro/data
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
    // LOG para status diário
    console.log("[MovStatusDiario] Tentando registrar status:", {
      maquina_id: maquinaId,
      roteiro_id: roteiroId,
      data: dataHoje,
      concluida: true,
    });
    const statusExistente = await MovimentacaoStatusDiario.findOne({
      where: {
        maquina_id: maquinaId,
        roteiro_id: roteiroId,
        data: dataHoje,
        concluida: true,
      },
    });
    console.log("[LOG] Status existente MovimentacaoStatusDiario:", statusExistente);
    if (statusExistente) {
      if (statusExistente.dataValues) {
        console.log("[MovStatusDiario] Já existe status para esta máquina/roteiro/data:", statusExistente.dataValues);
      } else {
        console.log("[LOG] Movimentação já registrada para esta máquina hoje. Bloqueando duplicidade.");
      }
      res.status(400).json({ error: "Movimentação já registrada para esta máquina hoje." });
      return;
    }
    // Após registrar movimentação, marcar como concluída
    const upsertResult = await MovimentacaoStatusDiario.upsert({
      maquina_id: maquinaId,
      roteiro_id: roteiroId,
      data: dataHoje,
      concluida: true,
    });
    console.log("[LOG] Resultado do upsert MovimentacaoStatusDiario:", upsertResult);
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
    res.locals.entityId = movimentacao.id;
    res.status(201).json(movimentacaoCompleta);
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
      maquinaId,
      lojaId,
      dataInicio,
      dataFim,
      usuarioId,
      limite = 50,
    } = req.query;

    const where = {};

    if (maquinaId) {
      where.maquinaId = maquinaId;
    }

    if (usuarioId) {
      where.usuarioId = usuarioId;
    }

    if (dataInicio || dataFim) {
      where.dataColeta = {};
      if (dataInicio) {
        where.dataColeta[Op.gte] = new Date(dataInicio);
      }
      if (dataFim) {
        where.dataColeta[Op.lte] = new Date(dataFim);
      }
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
    ];

    const movimentacoes = await Movimentacao.findAll({
      where,
      include,
      order: [["dataColeta", "DESC"]],
      limit: parseInt(limite),
    });

    res.json(movimentacoes);
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

// Atualizar movimentação (apenas observações e detalhes menores)
export const atualizarMovimentacao = async (req, res) => {
  try {
    const movimentacao = await Movimentacao.findByPk(req.params.id);

    if (!movimentacao) {
      return res.status(404).json({ error: "Movimentação não encontrada" });
    }

    // Apenas admin ou o próprio usuário que criou pode editar
    if (
      req.usuario.role !== "ADMIN" &&
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
      abastecidas,
      contadorIn,
      contadorOut,
      quantidade_notas_entrada,
      valor_entrada_maquininha_pix,
    } = req.body;

    // Preparar dados para atualização
    const updateData = {
      observacoes: observacoes ?? movimentacao.observacoes,
      tipoOcorrencia: tipoOcorrencia ?? movimentacao.tipoOcorrencia,
      fichas:
        fichas !== undefined ? parseInt(fichas) || 0 : movimentacao.fichas,
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
      quantidade_notas_entrada:
        quantidade_notas_entrada !== undefined
          ? parseInt(quantidade_notas_entrada) || null
          : movimentacao.quantidade_notas_entrada,
      valor_entrada_maquininha_pix:
        valor_entrada_maquininha_pix !== undefined
          ? parseFloat(valor_entrada_maquininha_pix) || null
          : movimentacao.valor_entrada_maquininha_pix,
    };

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

    res.json(movimentacao);
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
