import { CarrinhoPeca, Usuario, Peca } from "../models/index.js";
import { Op } from "sequelize";
import { sequelize } from "../database/connection.js";

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
    // Permitir ADMIN, GERENCIADOR, ou FUNCIONARIO acessar carrinho de FUNCIONARIO
    console.log('[Carrinho] Permissão: usuario autenticado', req.usuario.role, req.usuario.id, '| usuario alvo', usuarioId);
    if (
      req.usuario.role !== "ADMIN" &&
      req.usuario.role !== "GERENCIADOR" &&
      req.usuario.role !== "FUNCIONARIO"
    ) {
      console.log(
        "[Carrinho] Acesso negado para listar carrinho: role não permitida",
        req.usuario.role,
        try {
          const usuarioId = String(req.params.id);
          // Permitir apenas ADMIN, GERENCIADOR ou o próprio usuário
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
      String(req.usuario.id) !== String(usuarioId)
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
    // USAR TRANSAÇÃO PARA GARANTIR ATOMICIDADE
    const transaction = await sequelize.transaction();
    
    try {
      // Buscar peça e validar estoque disponível
      const peca = await Peca.findByPk(pecaId, { transaction });
      if (!peca) {
        await transaction.rollback();
        return res.status(404).json({ error: "Peça não encontrada" });
      }
      
      // VALIDAÇÃO CRÍTICA: Verificar se há estoque disponível
      if (peca.quantidade < quantidade) {
        await transaction.rollback();
        console.log("[Carrinho] Estoque insuficiente:", {
          pecaId,
          disponivel: peca.quantidade,
          solicitado: quantidade
        });
        return res.status(400).json({
          error: "Estoque insuficiente",
          disponivel: peca.quantidade,
          solicitado: quantidade
        });
      }
      
      // Buscar ou criar item no carrinho
      let item = await CarrinhoPeca.findOne({ 
        where: { usuarioId, pecaId },
        transaction 
      });
      
      if (item) {
        item.quantidade += quantidade;
        await item.save({ transaction });
        console.log("[Carrinho] Atualizou quantidade:", item);
      try {
        const usuarioId = String(req.params.id);
        const { pecaId, quantidade } = req.body;
        // Permitir ADMIN, GERENCIADOR ou o próprio FUNCIONARIO
        if (
          req.usuario.role !== "ADMIN" &&
          req.usuario.role !== "GERENCIADOR" &&
          String(req.usuario.id) !== usuarioId
        ) {
          return res.status(403).json({ error: "Acesso negado" });
        }
        // GERENCIADOR só pode manipular carrinho de FUNCIONARIO
        if (
          req.usuario.role === "GERENCIADOR" &&
          String(req.usuario.id) !== usuarioId
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
        console.error("[adicionarAoCarrinho] Erro:", error);
        res.status(500).json({ error: "Erro ao adicionar ao carrinho" });
      }
      
      // Commit da transação
      await transaction.commit();
      console.log("[Carrinho] Peça adicionada com sucesso. Estoque atualizado:", {
        pecaId,
        novoEstoque: peca.quantidade
      });
      
      res.status(201).json(item);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
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
      String(req.usuario.id) !== String(usuarioId)
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
    // USAR TRANSAÇÃO PARA GARANTIR ATOMICIDADE
    const transaction = await sequelize.transaction();
    
    try {
      // Buscar item do carrinho
      const item = await CarrinhoPeca.findOne({ 
        where: { usuarioId, pecaId },
        transaction 
      });
      if (!item) {
        await transaction.rollback();
        console.log("[Carrinho] Item não encontrado para remover:", pecaId);
        return res.status(404).json({ error: "Item não encontrado" });
      }
      
      // Buscar peça
      const peca = await Peca.findByPk(pecaId, { transaction });
      if (!peca) {
        await transaction.rollback();
        return res.status(404).json({ error: "Peça não encontrada" });
      }
      
      // Devolver quantidade ao estoque
      peca.quantidade += item.quantidade;
      await peca.save({ transaction });
      
      // Remover item do carrinho
      await item.destroy({ transaction });
      
      // Commit da transação
      await transaction.commit();
      console.log("[Carrinho] Item removido e estoque devolvido:", { 
        usuarioId, 
        pecaId, 
        quantidade: item.quantidade,
        novoEstoque: peca.quantidade
      });
      
      res.json({ success: true });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
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
      String(req.usuario.id) !== String(usuarioId)
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

    // USAR TRANSAÇÃO PARA GARANTIR ATOMICIDADE
    const transaction = await sequelize.transaction();
    
    try {
      // Buscar item do carrinho
      const item = await CarrinhoPeca.findOne({ 
        where: { usuarioId, pecaId },
        transaction 
      });
      if (!item) {
        await transaction.rollback();
        console.log("[Carrinho] Item não encontrado para devolver:", pecaId);
        return res.status(404).json({ error: "Item não encontrado" });
      }

      // Buscar peça
      const peca = await Peca.findByPk(pecaId, { transaction });
      if (!peca) {
        await transaction.rollback();
        return res.status(404).json({ error: "Peça não encontrada" });
      }

      // Atualizar estoque
      peca.quantidade += item.quantidade;
      await peca.save({ transaction });

      // Remover item do carrinho
      await item.destroy({ transaction });
      
      // Commit da transação
      await transaction.commit();
      console.log("[Carrinho] Peça devolvida ao estoque e removida do carrinho:", { 
        usuarioId, 
        pecaId, 
        quantidade: item.quantidade,
        novoEstoque: peca.quantidade 
      });
      
      res.json({ success: true, devolvida: { pecaId, quantidade: item.quantidade } });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("[Carrinho] Erro ao devolver peça do carrinho:", error);
    res.status(500).json({ error: "Erro ao devolver peça do carrinho" });
  }
};

// Listar todos os carrinhos (visão consolidada para ADMIN)
export const listarTodosCarrinhos = async (req, res) => {
  try {
    console.log("[Carrinho] Listar todos os carrinhos - usuário:", req.usuario.role);
    
    // Apenas ADMIN pode acessar este endpoint
    if (req.usuario.role !== "ADMIN") {
      console.log("[Carrinho] Acesso negado para listar todos os carrinhos");
      return res.status(403).json({ error: "Acesso negado. Apenas administradores." });
    }
    
    // Buscar todos os usuários com seus carrinhos
    const usuarios = await Usuario.findAll({
      attributes: ['id', 'nome', 'email', 'role'],
      where: {
        ativo: true
      },
      include: [
        {
          model: CarrinhoPeca,
          as: 'carrinhoPecas',
          required: false, // LEFT JOIN para incluir usuários sem carrinho
          include: [
            {
              model: Peca,
              attributes: ['id', 'nome', 'codigo', 'quantidade', 'categoria']
            }
          ]
        }
      ],
      try {
        const usuarioId = String(req.params.id);
        const pecaId = req.params.pecaId;
        // Permitir ADMIN, GERENCIADOR ou o próprio FUNCIONARIO
        if (
          req.usuario.role !== "ADMIN" &&
          req.usuario.role !== "GERENCIADOR" &&
          String(req.usuario.id) !== usuarioId
        ) {
          return res.status(403).json({ error: "Acesso negado" });
        }
        // GERENCIADOR só pode manipular carrinho de FUNCIONARIO
        if (
          req.usuario.role === "GERENCIADOR" &&
          String(req.usuario.id) !== usuarioId
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
        console.error("[removerDoCarrinho] Erro:", error);
        res.status(500).json({ error: "Erro ao remover do carrinho" });
      }
          nomePeca: item.nomePeca,
          createdAt: item.createdAt,
          Peca: item.Peca ? {
            id: item.Peca.id,
            nome: item.Peca.nome,
            codigo: item.Peca.codigo,
            quantidade: item.Peca.quantidade,
            categoria: item.Peca.categoria
          } : null
        }))
      };
    });
    
    console.log(`[Carrinho] Retornando ${resultado.length} usuários com seus carrinhos`);
    res.json(resultado);
  } catch (error) {
    console.error("[Carrinho] Erro ao listar todos os carrinhos:", error);
    res.status(500).json({ error: "Erro ao listar todos os carrinhos" });
  }
};
