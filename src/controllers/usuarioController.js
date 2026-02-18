
import { Usuario, UsuarioLoja, Loja } from "../models/index.js";
import { Op } from "sequelize";

// Listar todos os usuários (apenas ADMIN)
export const listarUsuarios = async (req, res) => {
  try {
    const { role, ativo, busca } = req.query;
    const where = {};

    if (role) {
      where.role = role;
    }

    if (ativo !== undefined) {
      where.ativo = ativo === "true";
    }

    if (busca) {
      where[Op.or] = [
        { nome: { [Op.iLike]: `%${busca}%` } },
        { email: { [Op.iLike]: `%${busca}%` } },
      ];
    }

    const usuarios = await Usuario.findAll({
      where,
      include: [
        {
          model: UsuarioLoja,
          as: "permissoesLojas",
          include: [
            {
              model: Loja,
              attributes: ["id", "nome"],
            },
          ],
        },
      ],
      order: [["nome", "ASC"]],
    });

    res.json(usuarios);
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    res.status(500).json({ error: "Erro ao listar usuários" });
  }
};

// Obter usuário por ID (apenas ADMIN)
export const obterUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      include: [
        {
          model: UsuarioLoja,
          as: "permissoesLojas",
          include: [
            {
              model: Loja,
              attributes: ["id", "nome"],
            },
          ],
        },
      ],
    });

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(usuario);
  } catch (error) {
    console.error("Erro ao obter usuário:", error);
    res.status(500).json({ error: "Erro ao obter usuário" });
  }
};

// Criar novo usuário (apenas ADMIN)
export const criarUsuario = async (req, res) => {
  try {
    const { nome, email, senha, telefone, role, lojasPermitidas } = req.body;

    if (!nome || !email || !senha) {
      return res
        .status(400)
        .json({ error: "Nome, email e senha são obrigatórios" });
    }

    // Verificar se email já existe
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    // Validar role
    const roleValida = ["ADMIN", "FUNCIONARIO", "GERENCIADOR"].includes(role);
    if (!roleValida) {
      return res
        .status(400)
        .json({ error: "Role inválida. Use ADMIN, FUNCIONARIO ou GERENCIADOR" });
    }

    // Criar usuário
    const usuario = await Usuario.create({
      nome,
      email,
      senha,
      telefone,
      role,
    });

    // Se for funcionário e tiver lojas permitidas, criar permissões
    if (
      role === "FUNCIONARIO" &&
      lojasPermitidas &&
      lojasPermitidas.length > 0
    ) {
      const permissoes = lojasPermitidas.map((lojaId) => ({
        usuarioId: usuario.id,
        lojaId,
        permissoes: {
          visualizar: true,
          editar: false,
          registrarMovimentacao: true,
        },
      }));

      await UsuarioLoja.bulkCreate(permissoes);
    }

    // Buscar usuário completo com permissões
    const usuarioCompleto = await Usuario.findByPk(usuario.id, {
      include: [
        {
          model: UsuarioLoja,
          as: "permissoesLojas",
          include: [
            {
              model: Loja,
              attributes: ["id", "nome"],
            },
          ],
        },
      ],
    });

    res.locals.entityId = usuario.id;
    res.status(201).json(usuarioCompleto);
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({ error: "Erro ao criar usuário" });
  }
};

// Atualizar usuário (apenas ADMIN)
export const atualizarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const { nome, email, senha, telefone, role, ativo, lojasPermitidas } =
      req.body;

    // Verificar se novo email já existe em outro usuário
    if (email && email !== usuario.email) {
      const emailExistente = await Usuario.findOne({ where: { email } });
      if (emailExistente) {
        return res.status(400).json({ error: "Email já cadastrado" });
      }
    }

    // Validar role se fornecida
    if (role && !["ADMIN", "FUNCIONARIO", "GERENCIADOR"].includes(role)) {
      return res
        .status(400)
        .json({ error: "Role inválida. Use ADMIN, FUNCIONARIO ou GERENCIADOR" });
    }

    // Atualizar dados básicos
    await usuario.update({
      nome: nome ?? usuario.nome,
      email: email ?? usuario.email,
      senha: senha ?? usuario.senha, // O hook beforeUpdate fará o hash se mudou
      telefone: telefone ?? usuario.telefone,
      role: role ?? usuario.role,
      ativo: ativo ?? usuario.ativo,
    });

    // Se mudou para FUNCIONARIO ou atualizou lojas permitidas
    if (lojasPermitidas !== undefined) {
      // Remover permissões antigas
      await UsuarioLoja.destroy({ where: { usuarioId: usuario.id } });

      // Adicionar novas permissões (apenas se for FUNCIONARIO)
      if (
        (role || usuario.role) === "FUNCIONARIO" &&
        lojasPermitidas.length > 0
      ) {
        const permissoes = lojasPermitidas.map((lojaId) => ({
          usuarioId: usuario.id,
          lojaId,
          permissoes: {
            visualizar: true,
            editar: false,
            registrarMovimentacao: true,
          },
        }));

        await UsuarioLoja.bulkCreate(permissoes);
      }
    }

    // Buscar usuário atualizado com permissões
    const usuarioAtualizado = await Usuario.findByPk(usuario.id, {
      include: [
        {
          model: UsuarioLoja,
          as: "permissoesLojas",
          include: [
            {
              model: Loja,
              attributes: ["id", "nome"],
            },
          ],
        },
      ],
    });

    res.json(usuarioAtualizado);
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
};

// Deletar usuário (apenas ADMIN)
export const deletarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Não permitir deletar a si mesmo
    if (usuario.id === req.usuario.id) {
      return res
        .status(400)
        .json({ error: "Você não pode deletar sua própria conta" });
    }

    // Soft delete
    await usuario.update({ ativo: false });

    res.json({ message: "Usuário desativado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    res.status(500).json({ error: "Erro ao deletar usuário" });
  }
};

// Reativar usuário (apenas ADMIN)
export const reativarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    await usuario.update({ ativo: true });

    res.json({ message: "Usuário reativado com sucesso", usuario });
  } catch (error) {
    console.error("Erro ao reativar usuário:", error);
    res.status(500).json({ error: "Erro ao reativar usuário" });
  }
};

// Listar apenas funcionários
export const listarFuncionarios = async (req, res) => {
  try {
    const funcionarios = await Usuario.findAll({
      where: { role: "FUNCIONARIO", ativo: true },
      order: [["nome", "ASC"]],
    });
    res.json(funcionarios);
  } catch (error) {
    console.error("Erro ao listar funcionários:", error);
    res.status(500).json({ error: "Erro ao listar funcionários" });
  }
};