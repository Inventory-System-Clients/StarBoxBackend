import jwt from "jsonwebtoken";
import { Usuario } from "../models/index.js";
import LogAtividade from "../models/LogAtividade.js";

// US01 - Middleware de Autenticação
export const autenticar = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findByPk(decoded.id);

    if (!usuario || !usuario.ativo) {
      return res
        .status(401)
        .json({ error: "Usuário não encontrado ou inativo" });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
};

// US02 - Middleware de Autorização por Role

// Aceita array ou lista de roles
export const autorizar = (...rolesPermitidas) => {
  const roles = rolesPermitidas.flat();
  return (req, res, next) => {
    if (!roles.includes(req.usuario.role)) {
      return res.status(403).json({
        error: "Acesso negado. Você não tem permissão para esta ação.",
      });
    }
    next();
  };
};

// US02 - Middleware de Verificação de Permissão em Loja
export const verificarPermissaoLoja = (acao = "visualizar") => {
  return async (req, res, next) => {
    try {
      // Admin tem acesso total
      if (req.usuario.role === "ADMIN") {
        return next();
      }

      const lojaId = req.params.lojaId || req.body.lojaId;

      if (!lojaId) {
        return res.status(400).json({ error: "ID da loja não fornecido" });
      }

      const { UsuarioLoja } = await import("../models/index.js");
      const permissao = await UsuarioLoja.findOne({
        where: {
          usuarioId: req.usuario.id,
          lojaId: lojaId,
        },
      });

      if (!permissao) {
        return res.status(403).json({
          error: "Você não tem permissão para acessar esta loja",
        });
      }

      // Verificar permissão específica
      if (acao === "editar" && !permissao.permissoes.editar) {
        return res.status(403).json({
          error: "Você não tem permissão para editar nesta loja",
        });
      }

      if (
        acao === "registrarMovimentacao" &&
        !permissao.permissoes.registrarMovimentacao
      ) {
        return res.status(403).json({
          error:
            "Você não tem permissão para registrar movimentações nesta loja",
        });
      }

      next();
    } catch (error) {
      console.error("Erro ao verificar permissão:", error);
      return res.status(500).json({ error: "Erro ao verificar permissões" });
    }
  };
};

// US03 - Middleware de Log de Atividades
export const registrarLog = (acao, entidade = null) => {
  return async (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      res.send = originalSend;

      // Só registra log em caso de sucesso (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        LogAtividade.create({
          usuarioId: req.usuario?.id,
          acao,
          entidade,
          entidadeId: req.params.id || res.locals.entityId,
          detalhes: {
            method: req.method,
            path: req.path,
            body: req.method !== "GET" ? req.body : undefined,
            params: req.params,
            query: req.query,
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get("user-agent"),
        }).catch((err) => console.error("Erro ao criar log:", err));
      }

      return res.send(data);
    };

    next();
  };
};

// Alias para verificar se é ADMIN (convenção)
export const verificarAdmin = autorizar("ADMIN");
