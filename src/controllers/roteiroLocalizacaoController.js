import { Op, col, where } from "sequelize";
import {
  Roteiro,
  RoteiroExecucaoSemanal,
  RoteiroLocalizacao,
  Usuario,
} from "../models/index.js";
import { isAdminLikeRole } from "../middlewares/auth.js";

const ROLES_OPERACAO_ROTEIRO = new Set([
  "FUNCIONARIO",
  "FUNCIONARIO_TODAS_LOJAS",
]);
const TEMPO_ATIVO_MS = 10 * 60 * 1000;

const normalizarNumeroOpcional = (valor) => {
  if (valor === undefined || valor === null || valor === "") return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : Number.NaN;
};

const validarCoordenada = (valor, min, max) => {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= min && numero <= max
    ? numero
    : Number.NaN;
};

const formatarLocalizacao = (localizacao, usuario = null) => ({
  roteiroId: localizacao.roteiroId,
  usuarioId: localizacao.usuarioId,
  ...(usuario ? { usuarioNome: usuario.nome } : {}),
  latitude: Number(localizacao.latitude),
  longitude: Number(localizacao.longitude),
  accuracy:
    localizacao.accuracy === null || localizacao.accuracy === undefined
      ? undefined
      : Number(localizacao.accuracy),
  altitude:
    localizacao.altitude === null || localizacao.altitude === undefined
      ? undefined
      : Number(localizacao.altitude),
  heading:
    localizacao.heading === null || localizacao.heading === undefined
      ? undefined
      : Number(localizacao.heading),
  speed:
    localizacao.speed === null || localizacao.speed === undefined
      ? undefined
      : Number(localizacao.speed),
  capturedAt: localizacao.capturedAt?.toISOString?.() || localizacao.capturedAt,
  updatedAt: localizacao.updatedAt?.toISOString?.() || localizacao.updatedAt,
  ativa: Boolean(localizacao.ativa),
});

const usuarioPodeCompartilharLocalizacao = async ({ roteiro, usuario }) => {
  if (isAdminLikeRole(usuario.role)) {
    return true;
  }

  if (!ROLES_OPERACAO_ROTEIRO.has(usuario.role)) {
    return false;
  }

  if (String(roteiro.funcionarioId || "") === String(usuario.id)) {
    return true;
  }

  const execucao = await RoteiroExecucaoSemanal.findOne({
    where: { roteiroId: roteiro.id },
    attributes: ["usuarioId", "emAndamento"],
  });

  return (
    Boolean(execucao?.emAndamento) &&
    String(execucao.usuarioId || "") === String(usuario.id)
  );
};

const montarDadosLocalizacao = ({ roteiroId, usuarioId, body }) => {
  const latitude = validarCoordenada(body?.latitude, -90, 90);
  const longitude = validarCoordenada(body?.longitude, -180, 180);
  const capturedAt = new Date(body?.capturedAt);
  const accuracy = normalizarNumeroOpcional(body?.accuracy);
  const altitude = normalizarNumeroOpcional(body?.altitude);
  const heading = normalizarNumeroOpcional(body?.heading);
  const speed = normalizarNumeroOpcional(body?.speed);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return {
      erro:
        "latitude e longitude sao obrigatorios e devem ser coordenadas validas",
    };
  }

  if (Number.isNaN(capturedAt.getTime())) {
    return { erro: "capturedAt deve ser uma data valida em formato ISO" };
  }

  if (
    [accuracy, altitude, heading, speed].some((valor) => Number.isNaN(valor))
  ) {
    return {
      erro:
        "accuracy, altitude, heading e speed devem ser numeros quando informados",
    };
  }

  return {
    dados: {
      roteiroId,
      usuarioId,
      latitude,
      longitude,
      accuracy,
      altitude,
      heading,
      speed,
      capturedAt,
      ativa: true,
      encerradaEm: null,
    },
  };
};

export const salvarLocalizacaoRoteiro = async (req, res) => {
  try {
    const { roteiroId } = req.params;
    const usuarioId = req.usuario.id;
    const roteiro = await Roteiro.findByPk(roteiroId, {
      attributes: ["id", "funcionarioId"],
    });

    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro nao encontrado" });
    }

    const autorizado = await usuarioPodeCompartilharLocalizacao({
      roteiro,
      usuario: req.usuario,
    });

    if (!autorizado) {
      return res.status(403).json({
        error:
          "Voce nao tem permissao para compartilhar localizacao neste roteiro",
      });
    }

    if (req.body?.roteiroId && String(req.body.roteiroId) !== String(roteiroId)) {
      return res.status(400).json({
        error: "roteiroId do corpo nao confere com o roteiro da URL",
      });
    }

    const { dados, erro } = montarDadosLocalizacao({
      roteiroId,
      usuarioId,
      body: req.body,
    });

    if (erro) {
      return res.status(400).json({ error: erro });
    }

    const localizacaoExistente = await RoteiroLocalizacao.findOne({
      where: { roteiroId, usuarioId },
    });

    const localizacao = localizacaoExistente
      ? await localizacaoExistente.update(dados)
      : await RoteiroLocalizacao.create(dados);

    return res.json(formatarLocalizacao(localizacao));
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      const localizacao = await RoteiroLocalizacao.findOne({
        where: {
          roteiroId: req.params.roteiroId,
          usuarioId: req.usuario.id,
        },
      });

      if (localizacao) {
        const { dados } = montarDadosLocalizacao({
          roteiroId: req.params.roteiroId,
          usuarioId: req.usuario.id,
          body: req.body,
        });

        await localizacao.update(dados);
        return res.json(formatarLocalizacao(localizacao));
      }
    }

    console.error("Erro ao salvar localizacao do roteiro:", error);
    return res.status(500).json({ error: "Erro ao salvar localizacao" });
  }
};

export const encerrarLocalizacaoAtiva = async ({ roteiroId, usuarioId }) => {
  const where = {
    roteiroId,
    ativa: true,
  };

  if (usuarioId) {
    where.usuarioId = usuarioId;
  }

  await RoteiroLocalizacao.update(
    {
      ativa: false,
      encerradaEm: new Date(),
    },
    { where },
  );
};

export const encerrarLocalizacaoRoteiro = async (req, res) => {
  try {
    const { roteiroId } = req.params;
    const roteiro = await Roteiro.findByPk(roteiroId, {
      attributes: ["id"],
    });

    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro nao encontrado" });
    }

    await encerrarLocalizacaoAtiva({
      roteiroId,
      usuarioId: req.usuario.id,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Erro ao encerrar localizacao do roteiro:", error);
    return res.status(500).json({ error: "Erro ao encerrar localizacao" });
  }
};

export const listarLocalizacoesAtivas = async (req, res) => {
  try {
    const limiteAtivo = new Date(Date.now() - TEMPO_ATIVO_MS);

    await RoteiroLocalizacao.update(
      {
        ativa: false,
        encerradaEm: new Date(),
      },
      {
        where: {
          ativa: true,
          [Op.or]: [
            where(col("updated_at"), Op.lt, limiteAtivo),
            { capturedAt: { [Op.lt]: limiteAtivo } },
          ],
        },
      },
    );

    const localizacoes = await RoteiroLocalizacao.findAll({
      where: {
        ativa: true,
        [Op.and]: [
          where(col("updated_at"), Op.gte, limiteAtivo),
          { capturedAt: { [Op.gte]: limiteAtivo } },
        ],
      },
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nome"],
        },
      ],
      order: [[col("updated_at"), "DESC"]],
    });

    return res.json(
      localizacoes.map((localizacao) =>
        formatarLocalizacao(localizacao, localizacao.usuario),
      ),
    );
  } catch (error) {
    console.error("Erro ao listar localizacoes ativas:", error);
    return res.status(500).json({ error: "Erro ao listar localizacoes ativas" });
  }
};
