// 4. Editar movimentação (placeholder)
export const editarMovimentacaoEstoqueLoja = async (req, res) => {
  return res.status(501).json({ error: "Função de edição não implementada." });
};
import MovimentacaoEstoqueLoja from "../models/MovimentacaoEstoqueLoja.js";
import MovimentacaoEstoqueLojaProduto from "../models/MovimentacaoEstoqueLojaProduto.js";
import { Loja, Usuario, Produto } from "../models/index.js";
import { sequelize } from "../database/connection.js"; // Importe o sequelize para transações

// 1. Listar todas as movimentações
export const listarMovimentacoesEstoqueLoja = async (req, res) => {
  try {
    const movimentacoes = await MovimentacaoEstoqueLoja.findAll({
      order: [["dataMovimentacao", "DESC"]],
      include: [
        { model: Loja, as: "loja", attributes: ["id", "nome"] },
        { model: Usuario, as: "usuario", attributes: ["id", "nome"] },
        {
          model: MovimentacaoEstoqueLojaProduto,
          as: "produtosEnviados",
          include: [
            { model: Produto, as: "produto", attributes: ["id", "nome"] },
          ],
        },
      ],
    });
    res.json(movimentacoes);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar movimentações" });
  }
};

// 2. Criar nova movimentação (com Transação)
export const criarMovimentacaoEstoqueLoja = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { lojaId, produtos, observacao, dataMovimentacao } = req.body;
    const usuarioId = req.usuario?.id;
    const { EstoqueLoja } = await import("../models/index.js");

    if (!lojaId || !Array.isArray(produtos) || produtos.length === 0) {
      return res
        .status(400)
        .json({ error: "Loja e Produtos são obrigatórios." });
    }

    const movimentacao = await MovimentacaoEstoqueLoja.create(
      {
        lojaId,
        usuarioId,
        observacao,
        dataMovimentacao: dataMovimentacao || new Date(),
      },
      { transaction: t },
    );

    for (const item of produtos) {
      const tipo = item.tipoMovimentacao || "saida";
      const qtd = Number(item.quantidade);

      await MovimentacaoEstoqueLojaProduto.create(
        {
          movimentacaoEstoqueLojaId: movimentacao.id,
          produtoId: item.produtoId,
          quantidade: qtd,
          tipoMovimentacao: tipo,
        },
        { transaction: t },
      );

      const [estoque, created] = await EstoqueLoja.findOrCreate({
        where: { lojaId, produtoId: item.produtoId },
        defaults: { quantidade: 0 },
        transaction: t,
      });

      let novaQtd =
        tipo === "entrada"
          ? estoque.quantidade + qtd
          : estoque.quantidade - qtd;
      await estoque.update(
        { quantidade: Math.max(0, novaQtd) },
        { transaction: t },
      );
    }

    await t.commit();

    // Busca os dados completos para retornar
    const resultado = await MovimentacaoEstoqueLoja.findByPk(movimentacao.id, {
      include: [
        "loja",
        "usuario",
        {
          model: MovimentacaoEstoqueLojaProduto,
          as: "produtosEnviados",
          include: ["produto"],
        },
      ],
    });
    res.status(201).json(resultado);
  } catch (error) {
    await t.rollback();
    res
      .status(500)
      .json({ error: "Erro ao criar movimentação", details: error.message });
  }
};

// 3. Deletar movimentação (Estorno de estoque)
export const deletarMovimentacaoEstoqueLoja = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { EstoqueLoja } = await import("../models/index.js");

    const movimentacao = await MovimentacaoEstoqueLoja.findByPk(id, {
      include: [
        { model: MovimentacaoEstoqueLojaProduto, as: "produtosEnviados" },
      ],
    });

    if (!movimentacao) return res.status(404).json({ error: "Não encontrada" });

    // Estornar quantidades no estoque
    for (const item of movimentacao.produtosEnviados) {
      const estoque = await EstoqueLoja.findOne({
        where: { lojaId: movimentacao.lojaId, produtoId: item.produtoId },
        transaction: t,
      });

      if (estoque) {
        let novaQtd =
          item.tipoMovimentacao === "entrada"
            ? estoque.quantidade - item.quantidade
            : estoque.quantidade + item.quantidade;
        await estoque.update(
          { quantidade: Math.max(0, novaQtd) },
          { transaction: t },
        );
      }
    }

    await MovimentacaoEstoqueLojaProduto.destroy({
      where: { movimentacaoEstoqueLojaId: id },
      transaction: t,
    });
    await movimentacao.destroy({ transaction: t });

    await t.commit();
    res.json({ message: "Excluída e estoque estornado com sucesso" });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: "Erro ao excluir", details: error.message });
  }
};
