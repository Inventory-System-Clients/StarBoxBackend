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
    // Retorna pecaId, quantidade e nome da peça
    const carrinho = itens.map((item) => ({
      pecaId: item.pecaId,
      quantidade: item.quantidade,
      nome: item.nomePeca || (item.Peca ? item.Peca.nome : null),
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
    // Validação de tipo para pecaId
    if (!pecaId || !quantidade) {
      console.error("[Carrinho] pecaId ou quantidade ausente!", { pecaId, quantidade });
      return res.status(400).json({ error: "pecaId ou quantidade ausente" });
    }
    if (typeof pecaId !== "string" || !pecaId.match(/^([0-9a-fA-F-]{36})$/)) {
      console.error("[Carrinho] pecaId deve ser string UUID!", { pecaId });
      return res.status(400).json({ error: "pecaId deve ser string UUID" });
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
    // Buscar nome da peça
    const peca = await Peca.findByPk(pecaId);
    if (!peca) {
      return res.status(404).json({ error: "Peça não encontrada" });
    }
    let item = await CarrinhoPeca.findOne({ where: { usuarioId, pecaId } });
    if (item) {
      item.quantidade += quantidade;
      await item.save();
      console.log("[Carrinho] Atualizou quantidade:", item);
    } else {
      console.log("[Carrinho] Criando novo item no carrinho:", { usuarioId, pecaId, quantidade, nomePeca: peca.nome });
      item = await CarrinhoPeca.create({ usuarioId, pecaId, quantidade, nomePeca: peca.nome });
      console.log("[Carrinho] Criou novo item:", item);
    }
    // Descontar do estoque da peça
    peca.quantidade -= quantidade;
    if (peca.quantidade < 0) peca.quantidade = 0;
    await peca.save();
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


// Remover peça do carrinho (mantém lógica antiga)
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

// Devolver peça do carrinho (remove do carrinho e devolve ao estoque)
export const devolverPecaDoCarrinho = async (req, res) => {
  try {
    const usuarioId = req.params.id;
    const pecaId = req.params.pecaId;
    console.log("[Carrinho] Devolver peça do carrinho usuarioId:", usuarioId, "pecaId:", pecaId);

    // Permitir ADMIN, GERENCIADOR ou o próprio FUNCIONARIO
    if (
      req.usuario.role !== "ADMIN" &&
      req.usuario.role !== "GERENCIADOR" &&
      req.usuario.id !== usuarioId
    ) {
      console.log(
        "[Carrinho] Acesso negado para devolver peça do carrinho",
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

    // Buscar item do carrinho
    const item = await CarrinhoPeca.findOne({ where: { usuarioId, pecaId } });
    if (!item) {
      console.log("[Carrinho] Item não encontrado para devolver:", pecaId);
      return res.status(404).json({ error: "Item não encontrado" });
    }

    // Buscar peça
    const peca = await Peca.findByPk(pecaId);
    if (!peca) {
      return res.status(404).json({ error: "Peça não encontrada" });
    }

    // Atualizar estoque
    peca.quantidade += item.quantidade;
    await peca.save();

    // Remover item do carrinho
    await item.destroy();
    console.log("[Carrinho] Peça devolvida ao estoque e removida do carrinho:", { usuarioId, pecaId, quantidade: item.quantidade });
    res.json({ success: true, devolvida: { pecaId, quantidade: item.quantidade } });
  } catch (error) {
    console.error("[Carrinho] Erro ao devolver peça do carrinho:", error);
    res.status(500).json({ error: "Erro ao devolver peça do carrinho" });
  }
};
