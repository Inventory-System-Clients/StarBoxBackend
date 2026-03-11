import { Op } from "sequelize";
import {
  EstoqueUsuario,
  MovimentacaoEstoqueUsuario,
  Produto,
  Usuario,
} from "../models/index.js";

const ROLES_GESTAO_ESTOQUE = ["ADMIN", "CONTROLADOR_ESTOQUE"];

const podeGerenciarTodosEstoques = (usuario) =>
  ROLES_GESTAO_ESTOQUE.includes(usuario?.role);

const podeAcessarEstoqueUsuario = (req, usuarioId) =>
  podeGerenciarTodosEstoques(req.usuario) || req.usuario?.id === usuarioId;

const validarQuantidade = (quantidade) =>
  Number.isFinite(Number(quantidade)) && Number(quantidade) >= 0;

const buscarUsuario = async (usuarioId) => {
  return Usuario.findByPk(usuarioId, {
    attributes: ["id", "nome", "email", "role", "ativo"],
  });
};

const buscarProduto = async (produtoId) => {
  return Produto.findByPk(produtoId, {
    attributes: ["id", "nome", "codigo", "emoji", "estoqueMinimo"],
  });
};

const mapearAlertas = (estoques = []) => {
  return estoques
    .map((item) => {
      const minimoPadrao = Number(item.produto?.estoqueMinimo ?? 0);
      const minimoConfigurado = Number(item.estoqueMinimo ?? minimoPadrao);
      const quantidadeAtual = Number(item.quantidade ?? 0);

      if (quantidadeAtual > minimoConfigurado) {
        return null;
      }

      return {
        id: item.id,
        usuarioId: item.usuarioId,
        produtoId: item.produtoId,
        quantidade: quantidadeAtual,
        estoqueMinimo: minimoConfigurado,
        deficit: minimoConfigurado - quantidadeAtual,
        produto: item.produto,
      };
    })
    .filter(Boolean);
};

export const listarMeuEstoqueUsuario = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const estoque = await EstoqueUsuario.findAll({
      where: { usuarioId },
      include: [
        {
          model: Produto,
          as: "produto",
          attributes: ["id", "nome", "codigo", "emoji", "estoqueMinimo"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      usuario: {
        id: req.usuario.id,
        nome: req.usuario.nome,
        email: req.usuario.email,
        role: req.usuario.role,
      },
      estoque,
    });
  } catch (error) {
    console.error("Erro ao listar meu estoque:", error);
    return res.status(500).json({ error: "Erro ao listar estoque do usuario" });
  }
};

export const listarMeusAlertasEstoqueUsuario = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const estoque = await EstoqueUsuario.findAll({
      where: { usuarioId, ativo: true },
      include: [
        {
          model: Produto,
          as: "produto",
          attributes: ["id", "nome", "codigo", "emoji", "estoqueMinimo"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json(mapearAlertas(estoque));
  } catch (error) {
    console.error("Erro ao listar alertas do meu estoque:", error);
    return res.status(500).json({ error: "Erro ao listar alertas do estoque" });
  }
};

export const listarEstoqueUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;

    if (!podeAcessarEstoqueUsuario(req, usuarioId)) {
      return res.status(403).json({
        error: "Voce nao tem permissao para visualizar este estoque",
      });
    }

    const usuario = await buscarUsuario(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    const estoque = await EstoqueUsuario.findAll({
      where: { usuarioId },
      include: [
        {
          model: Produto,
          as: "produto",
          attributes: ["id", "nome", "codigo", "emoji", "estoqueMinimo"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json({ usuario, estoque });
  } catch (error) {
    console.error("Erro ao listar estoque do usuario:", error);
    return res.status(500).json({ error: "Erro ao listar estoque do usuario" });
  }
};

export const listarAlertasEstoqueUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;

    if (!podeAcessarEstoqueUsuario(req, usuarioId)) {
      return res.status(403).json({
        error: "Voce nao tem permissao para visualizar alertas deste estoque",
      });
    }

    const usuario = await buscarUsuario(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    const estoque = await EstoqueUsuario.findAll({
      where: { usuarioId, ativo: true },
      include: [
        {
          model: Produto,
          as: "produto",
          attributes: ["id", "nome", "codigo", "emoji", "estoqueMinimo"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      usuario,
      alertas: mapearAlertas(estoque),
    });
  } catch (error) {
    console.error("Erro ao listar alertas de estoque do usuario:", error);
    return res.status(500).json({ error: "Erro ao listar alertas do estoque" });
  }
};

export const listarEstoquesUsuarios = async (req, res) => {
  try {
    if (!podeGerenciarTodosEstoques(req.usuario)) {
      return res.status(403).json({
        error:
          "Somente ADMIN e CONTROLADOR_ESTOQUE podem visualizar todos os estoques",
      });
    }

    const { usuarioId } = req.query;
    const where = usuarioId ? { usuarioId } : {};

    const estoques = await EstoqueUsuario.findAll({
      where,
      include: [
        {
          model: Produto,
          as: "produto",
          attributes: ["id", "nome", "codigo", "emoji", "estoqueMinimo"],
        },
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nome", "email", "role", "ativo"],
        },
      ],
      order: [
        ["usuarioId", "ASC"],
        ["createdAt", "DESC"],
      ],
    });

    return res.json(estoques);
  } catch (error) {
    console.error("Erro ao listar estoques de usuarios:", error);
    return res.status(500).json({ error: "Erro ao listar estoques" });
  }
};

export const listarUsuariosDisponiveisEstoque = async (req, res) => {
  try {
    if (!podeGerenciarTodosEstoques(req.usuario)) {
      return res.status(403).json({
        error:
          "Somente ADMIN e CONTROLADOR_ESTOQUE podem listar usuarios para estoque",
      });
    }

    const usuarios = await Usuario.findAll({
      where: { ativo: true },
      attributes: ["id", "nome", "email", "role", "ativo"],
      order: [["nome", "ASC"]],
    });

    return res.json(usuarios);
  } catch (error) {
    console.error("Erro ao listar usuarios para estoque:", error);
    return res.status(500).json({ error: "Erro ao listar usuarios" });
  }
};

export const listarMovimentacoesEstoqueUsuario = async (req, res) => {
  try {
    if (!podeGerenciarTodosEstoques(req.usuario)) {
      return res.status(403).json({
        error:
          "Somente ADMIN e CONTROLADOR_ESTOQUE podem visualizar movimentacoes de estoque do usuario",
      });
    }

    const { usuarioId, dataInicio, dataFim } = req.query;

    // Regra do front: sem filtros completos nao deve aparecer nada.
    if (!usuarioId || !dataInicio || !dataFim) {
      return res.json([]);
    }

    const usuario = await buscarUsuario(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    const inicio = new Date(`${dataInicio}T00:00:00`);
    const fim = new Date(`${dataFim}T23:59:59.999`);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
      return res.status(400).json({
        error: "dataInicio e dataFim devem estar no formato YYYY-MM-DD",
      });
    }

    if (inicio > fim) {
      return res.status(400).json({
        error: "dataInicio nao pode ser maior que dataFim",
      });
    }

    const movimentacoes = await MovimentacaoEstoqueUsuario.findAll({
      where: {
        usuarioId,
        dataMovimentacao: {
          [Op.between]: [inicio, fim],
        },
      },
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nome", "email", "role"],
        },
        {
          model: Usuario,
          as: "lancadoPor",
          attributes: ["id", "nome", "email", "role"],
        },
        {
          model: Produto,
          as: "produto",
          attributes: ["id", "nome", "codigo", "emoji"],
        },
      ],
      order: [["dataMovimentacao", "DESC"]],
      limit: 500,
    });

    return res.json(movimentacoes);
  } catch (error) {
    console.error("Erro ao listar movimentacoes de estoque do usuario:", error);
    return res
      .status(500)
      .json({ error: "Erro ao listar movimentacoes de estoque" });
  }
};

export const criarOuAtualizarProdutoEstoqueUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { produtoId, quantidade, estoqueMinimo } = req.body;

    if (!produtoId) {
      return res.status(400).json({ error: "produtoId e obrigatorio" });
    }

    if (!validarQuantidade(quantidade)) {
      return res.status(400).json({
        error: "Quantidade deve ser um numero maior ou igual a zero",
      });
    }

    const usuario = await buscarUsuario(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    const produto = await buscarProduto(produtoId);
    if (!produto) {
      return res.status(404).json({ error: "Produto nao encontrado" });
    }

    const quantidadeNumerica = Number(quantidade);
    const estoqueMinimoNumerico =
      estoqueMinimo !== undefined ? Number(estoqueMinimo) : 0;

    if (
      Number.isNaN(estoqueMinimoNumerico) ||
      !Number.isFinite(estoqueMinimoNumerico) ||
      estoqueMinimoNumerico < 0
    ) {
      return res.status(400).json({
        error: "estoqueMinimo deve ser um numero maior ou igual a zero",
      });
    }

    const [estoque, created] = await EstoqueUsuario.findOrCreate({
      where: { usuarioId, produtoId },
      defaults: {
        quantidade: quantidadeNumerica,
        estoqueMinimo: estoqueMinimoNumerico,
      },
    });

    if (!created) {
      estoque.quantidade = quantidadeNumerica;
      if (estoqueMinimo !== undefined) {
        estoque.estoqueMinimo = estoqueMinimoNumerico;
      }
      await estoque.save();
    }

    const estoqueAtualizado = await EstoqueUsuario.findByPk(estoque.id, {
      include: [
        {
          model: Produto,
          as: "produto",
          attributes: ["id", "nome", "codigo", "emoji", "estoqueMinimo"],
        },
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nome", "email", "role", "ativo"],
        },
      ],
    });

    return res.json({
      message: created
        ? "Estoque do usuario criado com sucesso"
        : "Estoque do usuario atualizado com sucesso",
      estoque: estoqueAtualizado,
    });
  } catch (error) {
    console.error("Erro ao criar/atualizar estoque do usuario:", error);
    return res
      .status(500)
      .json({ error: "Erro ao processar estoque do usuario" });
  }
};

export const atualizarEstoqueUsuario = async (req, res) => {
  try {
    const { usuarioId, produtoId } = req.params;
    const { quantidade, estoqueMinimo } = req.body;

    if (!validarQuantidade(quantidade)) {
      return res.status(400).json({
        error: "Quantidade deve ser um numero maior ou igual a zero",
      });
    }

    const usuario = await buscarUsuario(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    const produto = await buscarProduto(produtoId);
    if (!produto) {
      return res.status(404).json({ error: "Produto nao encontrado" });
    }

    const [estoque, created] = await EstoqueUsuario.findOrCreate({
      where: { usuarioId, produtoId },
      defaults: {
        quantidade: Number(quantidade),
        estoqueMinimo:
          estoqueMinimo !== undefined && Number.isFinite(Number(estoqueMinimo))
            ? Number(estoqueMinimo)
            : 0,
      },
    });

    if (!created) {
      estoque.quantidade = Number(quantidade);

      if (estoqueMinimo !== undefined) {
        if (
          !Number.isFinite(Number(estoqueMinimo)) ||
          Number(estoqueMinimo) < 0
        ) {
          return res.status(400).json({
            error: "estoqueMinimo deve ser um numero maior ou igual a zero",
          });
        }
        estoque.estoqueMinimo = Number(estoqueMinimo);
      }

      await estoque.save();
    }

    const estoqueAtualizado = await EstoqueUsuario.findByPk(estoque.id, {
      include: [
        {
          model: Produto,
          as: "produto",
          attributes: ["id", "nome", "codigo", "emoji", "estoqueMinimo"],
        },
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nome", "email", "role", "ativo"],
        },
      ],
    });

    return res.json({
      message: created
        ? "Estoque do usuario criado com sucesso"
        : "Estoque do usuario atualizado com sucesso",
      estoque: estoqueAtualizado,
    });
  } catch (error) {
    console.error("Erro ao atualizar estoque do usuario:", error);
    return res
      .status(500)
      .json({ error: "Erro ao atualizar estoque do usuario" });
  }
};

export const atualizarVariosEstoquesUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { estoques } = req.body;

    if (!Array.isArray(estoques) || estoques.length === 0) {
      return res.status(400).json({ error: "Array de estoques e obrigatorio" });
    }

    const usuario = await buscarUsuario(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    const resultados = [];
    const erros = [];

    for (const item of estoques) {
      const { produtoId, quantidade, estoqueMinimo } = item || {};

      if (!produtoId || !validarQuantidade(quantidade)) {
        erros.push({
          produtoId: produtoId || null,
          erro: "produtoId e quantidade valida sao obrigatorios",
        });
        continue;
      }

      const produto = await buscarProduto(produtoId);
      if (!produto) {
        erros.push({ produtoId, erro: "Produto nao encontrado" });
        continue;
      }

      const estoqueMinimoNumerico =
        estoqueMinimo !== undefined ? Number(estoqueMinimo) : 0;

      if (
        Number.isNaN(estoqueMinimoNumerico) ||
        !Number.isFinite(estoqueMinimoNumerico) ||
        estoqueMinimoNumerico < 0
      ) {
        erros.push({
          produtoId,
          erro: "estoqueMinimo deve ser um numero maior ou igual a zero",
        });
        continue;
      }

      const [estoque, created] = await EstoqueUsuario.findOrCreate({
        where: { usuarioId, produtoId },
        defaults: {
          quantidade: Number(quantidade),
          estoqueMinimo: estoqueMinimoNumerico,
        },
      });

      if (!created) {
        estoque.quantidade = Number(quantidade);
        if (estoqueMinimo !== undefined) {
          estoque.estoqueMinimo = estoqueMinimoNumerico;
        }
        await estoque.save();
      }

      resultados.push({
        id: estoque.id,
        usuarioId,
        produtoId,
        quantidade: estoque.quantidade,
        estoqueMinimo: estoque.estoqueMinimo,
      });
    }

    return res.json({
      message: `${resultados.length} estoques processados com sucesso`,
      estoques: resultados,
      erros,
    });
  } catch (error) {
    console.error("Erro ao atualizar varios estoques do usuario:", error);
    return res.status(500).json({ error: "Erro ao atualizar estoques" });
  }
};

export const movimentarEstoqueUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const movimentacoesEntrada = Array.isArray(req.body?.movimentacoes)
      ? req.body.movimentacoes
      : [
          {
            produtoId: req.body?.produtoId,
            tipoMovimentacao: req.body?.tipoMovimentacao,
            quantidade: req.body?.quantidade,
          },
        ];

    if (movimentacoesEntrada.length === 0) {
      return res.status(400).json({
        error: "Informe ao menos uma movimentacao",
      });
    }

    const movimentacoesNormalizadas = [];

    for (let index = 0; index < movimentacoesEntrada.length; index += 1) {
      const item = movimentacoesEntrada[index] || {};
      const tipoNormalizado = String(item.tipoMovimentacao || "").toLowerCase();
      const quantidadeNumerica = Number(item.quantidade);

      if (!item.produtoId) {
        return res.status(400).json({
          error: `Linha ${index + 1}: produtoId e obrigatorio`,
        });
      }

      if (!["entrada", "saida"].includes(tipoNormalizado)) {
        return res.status(400).json({
          error: `Linha ${index + 1}: tipoMovimentacao deve ser 'entrada' ou 'saida'`,
        });
      }

      if (
        Number.isNaN(quantidadeNumerica) ||
        !Number.isFinite(quantidadeNumerica) ||
        quantidadeNumerica <= 0
      ) {
        return res.status(400).json({
          error: `Linha ${index + 1}: quantidade deve ser um numero maior que zero`,
        });
      }

      movimentacoesNormalizadas.push({
        produtoId: item.produtoId,
        tipoMovimentacao: tipoNormalizado,
        quantidade: quantidadeNumerica,
      });
    }

    const usuario = await buscarUsuario(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    const produtoIds = [
      ...new Set(
        movimentacoesNormalizadas.map((item) => String(item.produtoId)),
      ),
    ];

    const produtos = await Produto.findAll({
      where: { id: produtoIds },
      attributes: ["id", "nome", "codigo", "emoji", "estoqueMinimo"],
    });

    const produtosMap = new Map(
      produtos.map((item) => [String(item.id), item]),
    );
    const produtoNaoEncontrado = produtoIds.find((id) => !produtosMap.has(id));
    if (produtoNaoEncontrado) {
      return res.status(404).json({
        error: `Produto nao encontrado: ${produtoNaoEncontrado}`,
      });
    }

    const estoquesExistentes = await EstoqueUsuario.findAll({
      where: { usuarioId, produtoId: produtoIds },
    });

    const estoqueMap = new Map(
      estoquesExistentes.map((item) => [String(item.produtoId), item]),
    );
    const saldoSimulado = new Map(
      produtoIds.map((produtoIdAtual) => [
        produtoIdAtual,
        Number(estoqueMap.get(produtoIdAtual)?.quantidade || 0),
      ]),
    );

    const movimentacoesProcessadas = [];
    const registrosHistorico = [];

    for (let index = 0; index < movimentacoesNormalizadas.length; index += 1) {
      const item = movimentacoesNormalizadas[index];
      const produtoKey = String(item.produtoId);
      const saldoAnterior = Number(saldoSimulado.get(produtoKey) || 0);

      if (
        item.tipoMovimentacao === "saida" &&
        item.quantidade > saldoAnterior
      ) {
        const produtoNome = produtosMap.get(produtoKey)?.nome || produtoKey;
        return res.status(400).json({
          error: `Linha ${index + 1}: nao e possivel retirar ${item.quantidade} de ${produtoNome}. Estoque atual: ${saldoAnterior}`,
        });
      }

      const saldoAtual =
        item.tipoMovimentacao === "entrada"
          ? saldoAnterior + item.quantidade
          : saldoAnterior - item.quantidade;

      saldoSimulado.set(produtoKey, saldoAtual);
      movimentacoesProcessadas.push({
        linha: index + 1,
        usuarioId,
        produtoId: item.produtoId,
        produtoNome: produtosMap.get(produtoKey)?.nome || null,
        tipoMovimentacao: item.tipoMovimentacao,
        quantidade: item.quantidade,
        quantidadeAnterior: saldoAnterior,
        quantidadeAtual: saldoAtual,
      });

      registrosHistorico.push({
        usuarioId,
        lancadoPorId: req.usuario.id,
        produtoId: item.produtoId,
        tipoMovimentacao: item.tipoMovimentacao,
        quantidade: item.quantidade,
        quantidadeAnterior: saldoAnterior,
        quantidadeAtual: saldoAtual,
      });
    }

    for (const produtoIdAtual of produtoIds) {
      const saldoFinal = Number(saldoSimulado.get(produtoIdAtual) || 0);
      const estoqueExistente = estoqueMap.get(produtoIdAtual);

      if (estoqueExistente) {
        estoqueExistente.quantidade = saldoFinal;
        if (!estoqueExistente.ativo) {
          estoqueExistente.ativo = true;
        }
        await estoqueExistente.save();
        continue;
      }

      if (saldoFinal > 0) {
        const produtoAtual = produtosMap.get(produtoIdAtual);
        await EstoqueUsuario.create({
          usuarioId,
          produtoId: produtoAtual.id,
          quantidade: saldoFinal,
          estoqueMinimo: Number(produtoAtual.estoqueMinimo || 0),
          ativo: true,
        });
      }
    }

    if (registrosHistorico.length > 0) {
      await MovimentacaoEstoqueUsuario.bulkCreate(registrosHistorico);
    }

    // 🔥 LÓGICA NOVA: Descontar do depósito principal quando houver ENTRADA para usuário
    const { Loja, EstoqueLoja } = await import("../models/index.js");
    const lojaDepositoPrincipal = await Loja.findOne({
      where: { isDepositoPrincipal: true },
    });

    if (lojaDepositoPrincipal) {
      for (
        let index = 0;
        index < movimentacoesNormalizadas.length;
        index += 1
      ) {
        const item = movimentacoesNormalizadas[index];

        // Se for ENTRADA para usuário, desconta do depósito
        if (item.tipoMovimentacao === "entrada") {
          console.log(
            `🏭 Descontando ${item.quantidade} unidades do depósito principal (usuário: ${usuario.nome})`,
          );

          const [estoqueDeposito, createdDeposito] =
            await EstoqueLoja.findOrCreate({
              where: {
                lojaId: lojaDepositoPrincipal.id,
                produtoId: item.produtoId,
              },
              defaults: { quantidade: 0 },
            });

          // Descontar do depósito
          const novaQtdDeposito = Math.max(
            0,
            estoqueDeposito.quantidade - item.quantidade,
          );

          if (estoqueDeposito.quantidade < item.quantidade) {
            console.warn(
              `⚠️ Estoque insuficiente no depósito para produto ${item.produtoId}. Disponível: ${estoqueDeposito.quantidade}, Solicitado: ${item.quantidade}`,
            );
            // Continua mesmo com estoque insuficiente (zera o estoque)
          }

          await estoqueDeposito.update({ quantidade: novaQtdDeposito });

          console.log(
            `✅ Estoque depósito atualizado: ${estoqueDeposito.quantidade} → ${novaQtdDeposito}`,
          );
        }
      }
    }

    return res.json({
      message: `${movimentacoesProcessadas.length} movimentacao(oes) registrada(s) com sucesso`,
      movimentacoes: movimentacoesProcessadas,
    });
  } catch (error) {
    console.error("Erro ao movimentar estoque do usuario:", error);
    return res.status(500).json({ error: "Erro ao movimentar estoque" });
  }
};

export const deletarEstoqueUsuario = async (req, res) => {
  try {
    const { usuarioId, produtoId } = req.params;

    const estoque = await EstoqueUsuario.findOne({
      where: { usuarioId, produtoId },
    });

    if (!estoque) {
      return res.status(404).json({ error: "Estoque nao encontrado" });
    }

    await estoque.destroy();

    return res.json({ message: "Estoque removido com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar estoque do usuario:", error);
    return res.status(500).json({ error: "Erro ao remover estoque" });
  }
};
