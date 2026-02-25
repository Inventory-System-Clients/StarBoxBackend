import { CarrinhoPeca, Usuario, Peca } from "../models/index.js";
import { Op } from "sequelize";

// Função utilitária para remover peça do carrinho após movimentação
export const removerPecaDoCarrinho = async (usuarioId, pecaId) => {
  try {
    const item = await CarrinhoPeca.findOne({ where: { usuarioId, pecaId } });
    if (item) {
      await item.destroy();
      console.log(`[Carrinho] Peça ${pecaId} removida do carrinho do usuário ${usuarioId}`);
    }
  } catch (error) {
    console.error("[Carrinho] Erro ao remover peça do carrinho após movimentação:", error);
  }
};

// Listar peças do carrinho do usuário
export const listarCarrinho = async (req, res) => {
  try {
    const usuarioId = req.params.id;
    console.log("[Carrinho] Listar carrinho usuarioId:", usuarioId);
    // Permitir apenas ADMIN, GERENCIADOR ou o próprio usuário
    if (
      req.usuario.role !== "ADMIN" &&
      req.usuario.role !== "GERENCIADOR" &&
      req.usuario.id !== usuarioId
    ) {
      console.log(
        "[Carrinho] Acesso negado para listar carrinho",
        req.usuario.role,
        req.usuario.id,
      );
      return res.status(403).json({ error: "Acesso negado" });
    }
    const itens = await CarrinhoPeca.findAll({
      where: { usuarioId },
      include: [{ model: Peca }],
    });
    console.log("[Carrinho] Itens encontrados:", itens);
    // Retorna apenas pecaId, quantidade e nome
    const carrinho = itens.map((item) => ({
      pecaId: item.pecaId,
      quantidade: item.quantidade,
      nome: item.Peca ? item.Peca.nome : null,
    }));
    res.json(carrinho);
  } catch (error) {
    console.error("[Carrinho] Erro ao listar carrinho:", error);
    res.status(500).json({ error: "Erro ao listar carrinho" });
  }
};

// Adicionar peça ao carrinho
export const adicionarAoCarrinho = async (req, res) => {
  try {
    const usuarioId = req.params.id;
    const { pecaId, quantidade } = req.body;
    console.log("[Carrinho] Dados recebidos para adicionar ao carrinho:", {
      usuarioId,
      body: req.body,
    });
    if (!pecaId || !quantidade) {
      console.error("[Carrinho] pecaId ou quantidade ausente!", { pecaId, quantidade });
    }
    // Permitir ADMIN, GERENCIADOR ou o próprio FUNCIONARIO
    if (
      req.usuario.role !== "ADMIN" &&
      req.usuario.role !== "GERENCIADOR" &&
      req.usuario.id !== usuarioId
    ) {
      console.log(
        "[Carrinho] Acesso negado para adicionar ao carrinho",
        req.usuario.role,
        req.usuario.id,
      );
      return res.status(403).json({ error: "Acesso negado" });
    }
    // GERENCIADOR só pode manipular carrinho de FUNCIONARIO
    if (req.usuario.role === "GERENCIADOR" && req.usuario.id !== usuarioId) {
      const usuarioAlvo = await Usuario.findByPk(usuarioId);
      if (!usuarioAlvo || usuarioAlvo.role !== "FUNCIONARIO") {
        console.log(
          "[Carrinho] GERENCIADOR só pode manipular carrinho de FUNCIONARIO",
        );
        return res
          .status(403)
          .json({ error: "Só pode manipular carrinho de FUNCIONARIO" });
      }
    }
    let item = await CarrinhoPeca.findOne({ where: { usuarioId, pecaId } });
    if (item) {
      item.quantidade += quantidade;
      await item.save();
      console.log("[Carrinho] Atualizou quantidade:", item);
    } else {
      console.log("[Carrinho] Criando novo item no carrinho:", { usuarioId, pecaId, quantidade });
      item = await CarrinhoPeca.create({ usuarioId, pecaId, quantidade });
      console.log("[Carrinho] Criou novo item:", item);
    }
    res.status(201).json(item);
  } catch (error) {
    console.error("[Carrinho] Erro ao adicionar ao carrinho:", error);
    console.error("[Carrinho] Dados recebidos no erro:", {
      params: req.params,
      body: req.body,
      usuario: req.usuario,
    });
    res.status(500).json({ error: "Erro ao adicionar ao carrinho" });
  }
};

// Remover peça do carrinho
export const removerDoCarrinho = async (req, res) => {
  try {
    const usuarioId = req.params.id;
    const pecaId = req.params.pecaId;
    console.log(
      "[Carrinho] Remover do carrinho usuarioId:",
      usuarioId,
      "pecaId:",
      pecaId,
    );
    // Permitir ADMIN, GERENCIADOR ou o próprio FUNCIONARIO
    if (
      req.usuario.role !== "ADMIN" &&
      req.usuario.role !== "GERENCIADOR" &&
      req.usuario.id !== usuarioId
    ) {
      console.log(
        "[Carrinho] Acesso negado para remover do carrinho",
        req.usuario.role,
        req.usuario.id,
      );
      return res.status(403).json({ error: "Acesso negado" });
    }
    // GERENCIADOR só pode manipular carrinho de FUNCIONARIO
    if (req.usuario.role === "GERENCIADOR" && req.usuario.id !== usuarioId) {
      const usuarioAlvo = await Usuario.findByPk(usuarioId);
      if (!usuarioAlvo || usuarioAlvo.role !== "FUNCIONARIO") {
        console.log(
          "[Carrinho] GERENCIADOR só pode manipular carrinho de FUNCIONARIO",
        );
        return res
          .status(403)
          .json({ error: "Só pode manipular carrinho de FUNCIONARIO" });
      }
    }
    const item = await CarrinhoPeca.findOne({ where: { usuarioId, pecaId } });
    if (!item) {
      console.log("[Carrinho] Item não encontrado para remover:", pecaId);
      return res.status(404).json({ error: "Item não encontrado" });
    }
    await item.destroy();
    console.log("[Carrinho] Item removido:", item);
    res.json({ success: true });
  } catch (error) {
    console.error("[Carrinho] Erro ao remover do carrinho:", error);
    res.status(500).json({ error: "Erro ao remover do carrinho" });
  }
};
