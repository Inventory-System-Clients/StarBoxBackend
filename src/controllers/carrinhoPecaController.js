import { CarrinhoPeca, Usuario, Peca } from "../models/index.js";
import { Op } from "sequelize";

// Listar peças do carrinho do usuário
export const listarCarrinho = async (req, res) => {
  try {
    const usuarioId = req.params.id;
    // Permitir apenas ADMIN, GERENCIADOR ou o próprio usuário
    if (
      req.usuario.role !== "ADMIN" &&
      req.usuario.role !== "GERENCIADOR" &&
      req.usuario.id !== usuarioId
    ) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    const itens = await CarrinhoPeca.findAll({
      where: { usuarioId },
      include: [{ model: Peca }],
    });
    res.json(itens);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar carrinho" });
  }
};

// Adicionar peça ao carrinho
export const adicionarAoCarrinho = async (req, res) => {
  try {
    const usuarioId = req.params.id;
    const { pecaId, quantidade } = req.body;
    // Permitir ADMIN, GERENCIADOR ou o próprio FUNCIONARIO
    if (
      req.usuario.role !== "ADMIN" &&
      req.usuario.role !== "GERENCIADOR" &&
      req.usuario.id !== usuarioId
    ) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    // GERENCIADOR só pode manipular carrinho de FUNCIONARIO
    if (
      req.usuario.role === "GERENCIADOR" &&
      req.usuario.id !== usuarioId
    ) {
      const usuarioAlvo = await Usuario.findByPk(usuarioId);
      if (!usuarioAlvo || usuarioAlvo.role !== "FUNCIONARIO") {
        return res.status(403).json({ error: "Só pode manipular carrinho de FUNCIONARIO" });
      }
    }
    let item = await CarrinhoPeca.findOne({ where: { usuarioId, pecaId } });
    if (item) {
      item.quantidade += quantidade;
      await item.save();
    } else {
      item = await CarrinhoPeca.create({ usuarioId, pecaId, quantidade });
    }
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: "Erro ao adicionar ao carrinho" });
  }
};

// Remover peça do carrinho
export const removerDoCarrinho = async (req, res) => {
  try {
    const usuarioId = req.params.id;
    const pecaId = req.params.pecaId;
    // Permitir ADMIN, GERENCIADOR ou o próprio FUNCIONARIO
    if (
      req.usuario.role !== "ADMIN" &&
      req.usuario.role !== "GERENCIADOR" &&
      req.usuario.id !== usuarioId
    ) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    // GERENCIADOR só pode manipular carrinho de FUNCIONARIO
    if (
      req.usuario.role === "GERENCIADOR" &&
      req.usuario.id !== usuarioId
    ) {
      const usuarioAlvo = await Usuario.findByPk(usuarioId);
      if (!usuarioAlvo || usuarioAlvo.role !== "FUNCIONARIO") {
        return res.status(403).json({ error: "Só pode manipular carrinho de FUNCIONARIO" });
      }
    }
    const item = await CarrinhoPeca.findOne({ where: { usuarioId, pecaId } });
    if (!item) return res.status(404).json({ error: "Item não encontrado" });
    await item.destroy();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao remover do carrinho" });
  }
};
