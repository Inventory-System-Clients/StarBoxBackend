import jwt from "jsonwebtoken";
import { Usuario, LogAtividade } from "../models/index.js";

// US01 - Login
export const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    const usuario = await Usuario.findOne({ where: { email } });

    if (!usuario) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    if (!usuario.ativo) {
      return res.status(401).json({ error: "Usuário inativo" });
    }

    const senhaValida = await usuario.verificarSenha(senha);

    if (!senhaValida) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, role: usuario.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Registrar log de login
    await LogAtividade.create({
      usuarioId: usuario.id,
      acao: "LOGIN",
      entidade: "Usuario",
      entidadeId: usuario.id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
    });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        telefone: usuario.telefone,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro ao realizar login" });
  }
};

// US01 - Registro de novo usuário
export const registrar = async (req, res) => {
  try {
    const { nome, email, senha, telefone, role } = req.body;

    if (!nome || !email || !senha) {
      return res
        .status(400)
        .json({ error: "Nome, email e senha são obrigatórios" });
    }

    const usuarioExistente = await Usuario.findOne({ where: { email } });

    if (usuarioExistente) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    // Registro público sempre cria FUNCIONARIO (apenas ADMIN pode criar outros ADMINs)
    const roleUsuario = "FUNCIONARIO";

    const usuario = await Usuario.create({
      nome,
      email,
      senha,
      telefone,
      role: roleUsuario,
    });

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, role: usuario.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.status(201).json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        telefone: usuario.telefone,
      },
    });
  } catch (error) {
    console.error("Erro no registro:", error);
    res.status(500).json({ error: "Erro ao registrar usuário" });
  }
};

// Obter perfil do usuário logado
export const perfil = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, {
      attributes: { exclude: ["senha"] },
    });

    res.json(usuario);
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    res.status(500).json({ error: "Erro ao buscar perfil" });
  }
};

// Atualizar perfil
export const atualizarPerfil = async (req, res) => {
  try {
    const { nome, telefone, senhaAtual, novaSenha } = req.body;
    const usuario = await Usuario.findByPk(req.usuario.id);

    if (nome) usuario.nome = nome;
    if (telefone) usuario.telefone = telefone;

    if (novaSenha) {
      if (!senhaAtual) {
        return res
          .status(400)
          .json({ error: "Senha atual é obrigatória para alterar a senha" });
      }

      const senhaValida = await usuario.verificarSenha(senhaAtual);
      if (!senhaValida) {
        return res.status(401).json({ error: "Senha atual incorreta" });
      }

      usuario.senha = novaSenha;
    }

    await usuario.save();

    res.json({
      message: "Perfil atualizado com sucesso",
      usuario: usuario.toJSON(),
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    res.status(500).json({ error: "Erro ao atualizar perfil" });
  }
};
