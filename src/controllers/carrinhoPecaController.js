import { CarrinhoPeca, Usuario, Peca } from "../models/index.js";
import { sequelize } from "../database/connection.js";

const rolesFuncionario = ["FUNCIONARIO", "FUNCIONARIO_TODAS_LOJAS"];
const ehRoleFuncionario = (role) => rolesFuncionario.includes(role);

// Funcao utilitaria para remover peca do carrinho apos movimentacao
export const removerPecaDoCarrinho = async (usuarioId, pecaId) => {
  try {
    const item = await CarrinhoPeca.findOne({ where: { usuarioId, pecaId } });
    if (item) {
      await item.destroy();
      console.log(
        `[Carrinho] Peca ${pecaId} removida do carrinho do usuario ${usuarioId}`,
      );
    }
  } catch (error) {
    console.error(
      "[Carrinho] Erro ao remover peca do carrinho apos movimentacao:",
      error,
    );
  }
};

// Listar pecas do carrinho do usuario
export const listarCarrinho = async (req, res) => {
  try {
    const usuarioId = String(req.params.id);

    if (
      req.usuario.role !== "ADMIN" &&
      req.usuario.role !== "GERENCIADOR" &&
      String(req.usuario.id) !== usuarioId
    ) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const itens = await CarrinhoPeca.findAll({
      where: { usuarioId },
      include: [{ model: Peca }],
    });

    res.json(itens);
  } catch (error) {
    console.error("[listarCarrinho] Erro:", error);
    res.status(500).json({ error: "Erro ao listar carrinho" });
  }
};

// Adicionar peca ao carrinho
export const adicionarAoCarrinho = async (req, res) => {
  try {
    const usuarioId = String(req.params.id);
    const { pecaId, quantidade } = req.body;

    console.log("[Carrinho] Dados recebidos para adicionar ao carrinho:", {
      usuarioId,
      body: req.body,
    });

    if (!pecaId || !quantidade) {
      return res.status(400).json({ error: "pecaId ou quantidade ausente" });
    }

    if (
      req.usuario.role !== "ADMIN" &&
      req.usuario.role !== "GERENCIADOR" &&
      String(req.usuario.id) !== usuarioId
    ) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    if (
      req.usuario.role === "GERENCIADOR" &&
      String(req.usuario.id) !== usuarioId
    ) {
      const usuarioAlvo = await Usuario.findByPk(usuarioId);
      if (!usuarioAlvo || !ehRoleFuncionario(usuarioAlvo.role)) {
        return res
          .status(403)
          .json({ error: "So pode manipular carrinho de FUNCIONARIO" });
      }
    }

    const transaction = await sequelize.transaction();
    try {
      const peca = await Peca.findByPk(pecaId, { transaction });
      if (!peca) {
        await transaction.rollback();
        return res.status(404).json({ error: "Peca nao encontrada" });
      }

      if (peca.quantidade < quantidade) {
        await transaction.rollback();
        return res.status(400).json({
          error: "Estoque insuficiente",
          disponivel: peca.quantidade,
          solicitado: quantidade,
        });
      }

      let item = await CarrinhoPeca.findOne({
        where: { usuarioId, pecaId },
        transaction,
      });
      if (item) {
        item.quantidade += quantidade;
        await item.save({ transaction });
      } else {
        item = await CarrinhoPeca.create(
          { usuarioId, pecaId, quantidade, nomePeca: peca.nome },
          { transaction },
        );
      }

      peca.quantidade -= quantidade;
      await peca.save({ transaction });
      await transaction.commit();

      console.log("[Carrinho] Peca adicionada com sucesso:", {
        pecaId,
        novoEstoque: peca.quantidade,
      });
      res.status(201).json(item);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("[adicionarAoCarrinho] Erro:", error);
    res.status(500).json({ error: "Erro ao adicionar ao carrinho" });
  }
};

// Remover peca do carrinho
export const removerDoCarrinho = async (req, res) => {
  try {
    const usuarioId = String(req.params.id);
    const pecaId = req.params.pecaId;

    if (
      req.usuario.role !== "ADMIN" &&
      req.usuario.role !== "GERENCIADOR" &&
      String(req.usuario.id) !== usuarioId
    ) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    if (
      req.usuario.role === "GERENCIADOR" &&
      String(req.usuario.id) !== usuarioId
    ) {
      const usuarioAlvo = await Usuario.findByPk(usuarioId);
      if (!usuarioAlvo || !ehRoleFuncionario(usuarioAlvo.role)) {
        return res
          .status(403)
          .json({ error: "So pode manipular carrinho de FUNCIONARIO" });
      }
    }

    const transaction = await sequelize.transaction();
    try {
      const item = await CarrinhoPeca.findOne({
        where: { usuarioId, pecaId },
        transaction,
      });
      if (!item) {
        await transaction.rollback();
        return res.status(404).json({ error: "Item nao encontrado" });
      }

      const peca = await Peca.findByPk(pecaId, { transaction });
      if (!peca) {
        await transaction.rollback();
        return res.status(404).json({ error: "Peca nao encontrada" });
      }

      peca.quantidade += item.quantidade;
      await peca.save({ transaction });
      await item.destroy({ transaction });
      await transaction.commit();

      console.log("[Carrinho] Item removido e estoque devolvido:", {
        usuarioId,
        pecaId,
      });
      res.json({ success: true });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("[removerDoCarrinho] Erro:", error);
    res.status(500).json({ error: "Erro ao remover do carrinho" });
  }
};

// Devolver peca do carrinho (remove do carrinho e devolve ao estoque)
export const devolverPecaDoCarrinho = async (req, res) => {
  try {
    const usuarioId = String(req.params.id);
    const pecaId = req.params.pecaId;

    if (
      req.usuario.role !== "ADMIN" &&
      req.usuario.role !== "GERENCIADOR" &&
      String(req.usuario.id) !== usuarioId
    ) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    if (
      req.usuario.role === "GERENCIADOR" &&
      String(req.usuario.id) !== usuarioId
    ) {
      const usuarioAlvo = await Usuario.findByPk(usuarioId);
      if (!usuarioAlvo || !ehRoleFuncionario(usuarioAlvo.role)) {
        return res
          .status(403)
          .json({ error: "So pode manipular carrinho de FUNCIONARIO" });
      }
    }

    const transaction = await sequelize.transaction();
    try {
      const item = await CarrinhoPeca.findOne({
        where: { usuarioId, pecaId },
        transaction,
      });
      if (!item) {
        await transaction.rollback();
        return res.status(404).json({ error: "Item nao encontrado" });
      }

      const peca = await Peca.findByPk(pecaId, { transaction });
      if (!peca) {
        await transaction.rollback();
        return res.status(404).json({ error: "Peca nao encontrada" });
      }

      peca.quantidade += item.quantidade;
      await peca.save({ transaction });
      await item.destroy({ transaction });
      await transaction.commit();

      console.log("[Carrinho] Peca devolvida ao estoque:", {
        usuarioId,
        pecaId,
      });
      res.json({
        success: true,
        devolvida: { pecaId, quantidade: item.quantidade },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("[devolverPecaDoCarrinho] Erro:", error);
    res.status(500).json({ error: "Erro ao devolver peca do carrinho" });
  }
};

// Listar todos os carrinhos (visao consolidada para ADMIN)
export const listarTodosCarrinhos = async (req, res) => {
  try {
    if (req.usuario.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Acesso negado. Apenas administradores." });
    }

    const usuarios = await Usuario.findAll({
      attributes: ["id", "nome", "email", "role"],
      where: { ativo: true },
      include: [
        {
          model: CarrinhoPeca,
          as: "carrinhoPecas",
          required: false,
          include: [
            {
              model: Peca,
              attributes: ["id", "nome", "quantidade", "categoria"],
            },
          ],
        },
      ],
    });

    const resultado = usuarios.map((u) => ({
      usuarioId: u.id,
      nome: u.nome,
      email: u.email,
      role: u.role,
      carrinho: (u.carrinhoPecas || []).map((item) => ({
        pecaId: item.pecaId,
        quantidade: item.quantidade,
        nomePeca: item.nomePeca,
        createdAt: item.createdAt,
        Peca: item.Peca || null,
      })),
    }));

    console.log(
      `[Carrinho] Retornando ${resultado.length} usuarios com seus carrinhos`,
    );
    res.json(resultado);
  } catch (error) {
    console.error("[listarTodosCarrinhos] Erro:", error);
    res.status(500).json({ error: "Erro ao listar todos os carrinhos" });
  }
};
