import { Loja, Maquina, UsuarioLoja } from "../models/index.js";

// US04 - Listar todas as lojas
export const listarLojas = async (req, res) => {
  try {
    let lojas;

    // Se for ADMIN, vê todas as lojas
    if (req.usuario.role === "ADMIN") {
      lojas = await Loja.findAll({
        include: [
          {
            model: Maquina,
            as: "maquinas",
            attributes: ["id", "codigo", "nome", "tipo", "ativo"],
          },
        ],
        order: [["nome", "ASC"]],
      });
    } else {
      // Funcionário vê apenas lojas permitidas
      const permissoes = await UsuarioLoja.findAll({
        where: { usuarioId: req.usuario.id },
        include: [
          {
            model: Loja,
            include: [
              {
                model: Maquina,
                as: "maquinas",
                attributes: ["id", "codigo", "nome", "tipo", "ativo"],
              },
            ],
          },
        ],
      });

      lojas = permissoes.map((p) => p.Loja);
    }

    res.json(lojas);
  } catch (error) {
    console.error("Erro ao listar lojas:", error);
    res.status(500).json({ error: "Erro ao listar lojas" });
  }
};

// US04 - Obter loja por ID
export const obterLoja = async (req, res) => {
  try {
    const loja = await Loja.findByPk(req.params.id, {
      include: [
        {
          model: Maquina,
          as: "maquinas",
        },
      ],
    });

    if (!loja) {
      return res.status(404).json({ error: "Loja não encontrada" });
    }

    res.json(loja);
  } catch (error) {
    console.error("Erro ao obter loja:", error);
    res.status(500).json({ error: "Erro ao obter loja" });
  }
};

// US04 - Criar loja
export const criarLoja = async (req, res) => {
  try {
    const { nome, endereco, cidade, estado, responsavel, telefone } = req.body;

    if (!nome) {
      return res.status(400).json({ error: "Nome da loja é obrigatório" });
    }

    const loja = await Loja.create({
      nome,
      endereco,
      cidade,
      estado,
      responsavel,
      telefone,
    });

    res.locals.entityId = loja.id;
    res.status(201).json(loja);
  } catch (error) {
    console.error("Erro ao criar loja:", error);
    res.status(500).json({ error: "Erro ao criar loja" });
  }
};

// US04 - Atualizar loja
export const atualizarLoja = async (req, res) => {
  try {
    const loja = await Loja.findByPk(req.params.id);

    if (!loja) {
      return res.status(404).json({ error: "Loja não encontrada" });
    }

    const { nome, endereco, cidade, estado, responsavel, telefone, ativo } =
      req.body;

    await loja.update({
      nome: nome ?? loja.nome,
      endereco: endereco ?? loja.endereco,
      cidade: cidade ?? loja.cidade,
      estado: estado ?? loja.estado,
      responsavel: responsavel ?? loja.responsavel,
      telefone: telefone ?? loja.telefone,
      ativo: ativo ?? loja.ativo,
    });

    res.json(loja);
  } catch (error) {
    console.error("Erro ao atualizar loja:", error);
    res.status(500).json({ error: "Erro ao atualizar loja" });
  }
};

// US04 - Deletar loja
export const deletarLoja = async (req, res) => {
  try {
    const loja = await Loja.findByPk(req.params.id);

    if (!loja) {
      return res.status(404).json({ error: "Loja não encontrada" });
    }

    // Verificar se já está inativa (segunda tentativa = hard delete)
    if (!loja.ativo) {
      // Hard delete - deletar permanentemente
      await Maquina.destroy({ where: { lojaId: loja.id } });
      await loja.destroy();
      return res.json({ message: "Loja deletada permanentemente" });
    }

    // Primeira tentativa: Soft delete (marcar como inativo)
    await loja.update({ ativo: false });
    res.json({ message: "Loja desativada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar loja:", error);
    res.status(500).json({ error: "Erro ao deletar loja" });
  }
};
