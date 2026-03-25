import {
  PecaDefeituosaPendente,
  PecaDefeituosaBase,
  Usuario,
} from "../models/index.js";
import { sequelize } from "../database/connection.js";

const podeVisualizarUsuario = (req, usuarioId) => {
  return (
    req.usuario.role === "ADMIN" ||
    req.usuario.role === "GERENCIADOR" ||
    String(req.usuario.id) === String(usuarioId)
  );
};

const montarPendencia = (item) => ({
  id: item.id,
  usuarioId: item.usuarioId,
  manutencaoId: item.manutencaoId,
  pecaOriginalId: item.pecaOriginalId,
  nomePecaOriginal: item.nomePecaOriginal,
  nomePecaDefeituosa: item.nomePecaDefeituosa,
  quantidade: item.quantidade,
  criadoEm: item.createdAt,
});

const montarBase = (item) => ({
  id: item.id,
  usuarioId: item.usuarioId,
  manutencaoId: item.manutencaoId,
  pecaOriginalId: item.pecaOriginalId,
  nomePecaOriginal: item.nomePecaOriginal,
  nomePecaDefeituosa: item.nomePecaDefeituosa,
  quantidade: item.quantidade,
  confirmadoEm: item.confirmadoEm,
  confirmadoPorId: item.confirmadoPorId,
});

export const listarPecasDefeituosasUsuario = async (req, res) => {
  try {
    const usuarioId = String(req.params.id);

    if (!podeVisualizarUsuario(req, usuarioId)) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const [pendentes, naBase] = await Promise.all([
      PecaDefeituosaPendente.findAll({
        where: { usuarioId },
        order: [["createdAt", "DESC"]],
      }),
      PecaDefeituosaBase.findAll({
        where: { usuarioId },
        order: [["confirmadoEm", "DESC"]],
      }),
    ]);

    return res.json({
      usuarioId,
      pendentes: pendentes.map(montarPendencia),
      naBase: naBase.map(montarBase),
      totais: {
        pendentes: pendentes.reduce((acc, item) => acc + item.quantidade, 0),
        naBase: naBase.reduce((acc, item) => acc + item.quantidade, 0),
      },
    });
  } catch (error) {
    console.error("[listarPecasDefeituosasUsuario] Erro:", error);
    return res.status(500).json({ error: "Erro ao listar pecas defeituosas" });
  }
};

export const listarMinhasPecasDefeituosasDashboard = async (req, res) => {
  req.params.id = req.usuario.id;
  return listarPecasDefeituosasUsuario(req, res);
};

export const listarResumoPecasDefeituosasAdmin = async (req, res) => {
  try {
    if (!["ADMIN", "GERENCIADOR"].includes(req.usuario.role)) {
      return res
        .status(403)
        .json({ error: "Acesso negado. Apenas ADMIN ou GERENCIADOR." });
    }

    const usuarios = await Usuario.findAll({
      attributes: ["id", "nome", "email", "role"],
      where: { ativo: true },
      order: [["nome", "ASC"]],
    });

    const usuarioIds = usuarios.map((usuario) => usuario.id);

    const [pendentes, naBase] = await Promise.all([
      PecaDefeituosaPendente.findAll({
        where: { usuarioId: usuarioIds },
        order: [["createdAt", "DESC"]],
      }),
      PecaDefeituosaBase.findAll({
        where: { usuarioId: usuarioIds },
        order: [["confirmadoEm", "DESC"]],
      }),
    ]);

    const pendentesPorUsuario = new Map();
    const basePorUsuario = new Map();

    for (const item of pendentes) {
      if (!pendentesPorUsuario.has(item.usuarioId)) {
        pendentesPorUsuario.set(item.usuarioId, []);
      }
      pendentesPorUsuario.get(item.usuarioId).push(montarPendencia(item));
    }

    for (const item of naBase) {
      if (!basePorUsuario.has(item.usuarioId)) {
        basePorUsuario.set(item.usuarioId, []);
      }
      basePorUsuario.get(item.usuarioId).push(montarBase(item));
    }

    const resultado = usuarios.map((usuario) => {
      const listaPendentes = pendentesPorUsuario.get(usuario.id) || [];
      const listaBase = basePorUsuario.get(usuario.id) || [];

      return {
        usuarioId: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        pendentes: listaPendentes,
        naBase: listaBase,
        totais: {
          pendentes: listaPendentes.reduce(
            (acc, item) => acc + item.quantidade,
            0,
          ),
          naBase: listaBase.reduce((acc, item) => acc + item.quantidade, 0),
        },
      };
    });

    return res.json({ usuarios: resultado });
  } catch (error) {
    console.error("[listarResumoPecasDefeituosasAdmin] Erro:", error);
    return res.status(500).json({ error: "Erro ao listar resumo de devolucoes" });
  }
};

export const confirmarDevolucaoPecaDefeituosa = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    if (!["ADMIN", "GERENCIADOR"].includes(req.usuario.role)) {
      await transaction.rollback();
      return res
        .status(403)
        .json({ error: "Acesso negado. Apenas ADMIN ou GERENCIADOR." });
    }

    const pendenciaId = req.params.id;

    const pendencia = await PecaDefeituosaPendente.findByPk(pendenciaId, {
      transaction,
    });

    if (!pendencia) {
      await transaction.rollback();
      return res.status(404).json({ error: "Pendencia nao encontrada" });
    }

    const registroBase = await PecaDefeituosaBase.create(
      {
        usuarioId: pendencia.usuarioId,
        confirmadoPorId: req.usuario.id,
        manutencaoId: pendencia.manutencaoId,
        pecaOriginalId: pendencia.pecaOriginalId,
        nomePecaOriginal: pendencia.nomePecaOriginal,
        nomePecaDefeituosa: pendencia.nomePecaDefeituosa,
        quantidade: pendencia.quantidade,
        confirmadoEm: new Date(),
      },
      { transaction },
    );

    await pendencia.destroy({ transaction });
    await transaction.commit();

    return res.json({
      success: true,
      message: "Devolucao confirmada com sucesso",
      registro: montarBase(registroBase),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("[confirmarDevolucaoPecaDefeituosa] Erro:", error);
    return res.status(500).json({ error: "Erro ao confirmar devolucao" });
  }
};

export const confirmarDevolucaoPorFuncionario = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    if (!["ADMIN", "GERENCIADOR"].includes(req.usuario.role)) {
      await transaction.rollback();
      return res
        .status(403)
        .json({ error: "Acesso negado. Apenas ADMIN ou GERENCIADOR." });
    }

    const usuarioId = String(req.params.usuarioId);

    const pendencias = await PecaDefeituosaPendente.findAll({
      where: { usuarioId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!pendencias.length) {
      await transaction.rollback();
      return res.status(404).json({ error: "Nenhuma pendencia para este funcionario" });
    }

    const payloadBase = pendencias.map((pendencia) => ({
      usuarioId: pendencia.usuarioId,
      confirmadoPorId: req.usuario.id,
      manutencaoId: pendencia.manutencaoId,
      pecaOriginalId: pendencia.pecaOriginalId,
      nomePecaOriginal: pendencia.nomePecaOriginal,
      nomePecaDefeituosa: pendencia.nomePecaDefeituosa,
      quantidade: pendencia.quantidade,
      confirmadoEm: new Date(),
    }));

    await PecaDefeituosaBase.bulkCreate(payloadBase, { transaction });

    await PecaDefeituosaPendente.destroy({
      where: { usuarioId },
      transaction,
    });

    await transaction.commit();

    return res.json({
      success: true,
      message: "Devolucao em lote confirmada com sucesso",
      totalConfirmadas: payloadBase.reduce((acc, item) => acc + item.quantidade, 0),
      registrosMovidos: payloadBase.length,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("[confirmarDevolucaoPorFuncionario] Erro:", error);
    return res.status(500).json({ error: "Erro ao confirmar devolucao em lote" });
  }
};

export const esvaziarBasePecasDefeituosas = async (req, res) => {
  try {
    if (!["ADMIN", "GERENCIADOR"].includes(req.usuario.role)) {
      return res
        .status(403)
        .json({ error: "Acesso negado. Apenas ADMIN ou GERENCIADOR." });
    }

    const removidos = await PecaDefeituosaBase.destroy({ where: {} });

    return res.json({
      success: true,
      message: "Base de pecas defeituosas esvaziada com sucesso",
      registrosRemovidos: removidos,
    });
  } catch (error) {
    console.error("[esvaziarBasePecasDefeituosas] Erro:", error);
    return res.status(500).json({ error: "Erro ao esvaziar base de pecas defeituosas" });
  }
};
