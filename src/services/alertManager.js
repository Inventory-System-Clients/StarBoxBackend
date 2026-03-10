import { Op } from "sequelize";
import { WhatsAppAlerta } from "../models/index.js";
import {
  enfileirarAlertaWhatsApp,
  isAlertQueueEnabled,
} from "./alertQueueService.js";
import {
  normalizePhoneNumber,
  sendWhatsAppMessage,
} from "./whatsappService.js";

const ALERT_DEDUPLICATION_MINUTES = Number(
  process.env.ALERT_DEDUPLICATION_MINUTES || 10,
);

const formatarValorMoeda = (valor) => {
  const numero = Number(valor || 0);
  return numero.toFixed(2).replace(".", ",");
};

const resolverDestinatario = (destinatario) => {
  const destino =
    normalizePhoneNumber(destinatario) ||
    normalizePhoneNumber(process.env.WHATSAPP_ALERT_DESTINO);

  if (!destino) {
    throw new Error("Destinatario de alerta WhatsApp nao informado");
  }

  return destino;
};

const buscarAlertaRecente = async ({
  tipo,
  destinatario,
  referenciaTipo,
  referenciaId,
}) => {
  if (!ALERT_DEDUPLICATION_MINUTES || ALERT_DEDUPLICATION_MINUTES <= 0) {
    return null;
  }

  const janelaInicio = new Date(
    Date.now() - ALERT_DEDUPLICATION_MINUTES * 60 * 1000,
  );

  return WhatsAppAlerta.findOne({
    where: {
      tipo,
      destinatario,
      referenciaTipo: referenciaTipo || null,
      referenciaId: referenciaId || null,
      createdAt: {
        [Op.gte]: janelaInicio,
      },
      status: {
        [Op.in]: ["pendente", "enviado"],
      },
    },
    order: [["createdAt", "DESC"]],
  });
};

const executarEnvioAlerta = async ({
  alerta,
  options,
  contextoEnvio = "sincrono",
  throwOnError = false,
  metadataExtra = {},
}) => {
  try {
    const retornoEnvio = await sendWhatsAppMessage({
      numero: alerta.destinatario,
      texto: alerta.mensagem,
      options,
    });

    await alerta.update({
      status: "enviado",
      erro: null,
      enviadoEm: new Date(),
      metadata: {
        ...(alerta.metadata || {}),
        ...metadataExtra,
        envio: retornoEnvio,
        ultimoContextoEnvio: contextoEnvio,
      },
    });

    return alerta;
  } catch (error) {
    await alerta.update({
      status: "erro",
      erro: error.message,
      metadata: {
        ...(alerta.metadata || {}),
        ...metadataExtra,
        erroTecnico: error.message,
        ultimoContextoEnvio: contextoEnvio,
      },
    });

    if (throwOnError) {
      throw error;
    }

    return alerta;
  }
};

export const processarJobAlertaWhatsApp = async (job) => {
  const alertaId = job?.data?.alertaId;
  const options = job?.data?.options || {};

  if (!alertaId) {
    throw new Error("Job de alerta sem alertaId");
  }

  const alerta = await WhatsAppAlerta.findByPk(alertaId);

  if (!alerta) {
    return {
      status: "nao_encontrado",
      alertaId,
    };
  }

  if (alerta.status === "enviado") {
    return {
      status: "ja_enviado",
      alertaId,
    };
  }

  await executarEnvioAlerta({
    alerta,
    options,
    contextoEnvio: "fila",
    throwOnError: true,
    metadataExtra: {
      fila: {
        ...(alerta.metadata?.fila || {}),
        processadoEm: new Date().toISOString(),
        tentativas: Number(job.attemptsMade || 0) + 1,
      },
    },
  });

  return {
    status: "enviado",
    alertaId,
  };
};

const dispatchAlert = async ({
  tipo,
  mensagem,
  destinatario,
  referenciaTipo,
  referenciaId,
  metadata,
  options,
}) => {
  const destinoFinal = resolverDestinatario(destinatario);

  const alertaRecente = await buscarAlertaRecente({
    tipo,
    destinatario: destinoFinal,
    referenciaTipo,
    referenciaId,
  });

  if (alertaRecente) {
    return alertaRecente;
  }

  const alerta = await WhatsAppAlerta.create({
    tipo,
    mensagem,
    destinatario: destinoFinal,
    referenciaTipo,
    referenciaId,
    metadata,
    status: "pendente",
  });

  if (isAlertQueueEnabled()) {
    try {
      const fila = await enfileirarAlertaWhatsApp({
        alertaId: alerta.id,
        options,
      });

      if (fila.queued) {
        await alerta.update({
          metadata: {
            ...(alerta.metadata || {}),
            fila: {
              status: "enfileirado",
              jobId: fila.jobId,
              enfileiradoEm: new Date().toISOString(),
            },
          },
        });

        return alerta;
      }
    } catch (error) {
      await alerta.update({
        metadata: {
          ...(alerta.metadata || {}),
          fila: {
            status: "erro_ao_enfileirar",
            erro: error.message,
          },
        },
      });
    }
  }

  return executarEnvioAlerta({
    alerta,
    options,
    contextoEnvio: "sincrono",
  });
};

const montarMensagemRoteiroPendente = ({
  roteiroNome,
  maquinasPendentes = [],
}) => {
  const listaPendencias = maquinasPendentes
    .map((item) => `${item.maquinaNome} (${item.lojaNome})`)
    .join(", ");

  return `⚠️ *ALERTA DE ROTEIRO*\n\nRoteiro: *${roteiroNome}*\nMaquinas nao realizadas: ${listaPendencias || "Nenhuma informada"}.`;
};

const AlertManager = {
  enviarCustom: async ({
    tipo,
    mensagem,
    destinatario,
    referenciaTipo,
    referenciaId,
    metadata,
    options,
  }) => {
    return dispatchAlert({
      tipo,
      mensagem,
      destinatario,
      referenciaTipo,
      referenciaId,
      metadata,
      options,
    });
  },

  estoqueCritico: async ({
    nomeUsuario,
    telefoneChefe,
    nomeMaquina,
    produto,
    quantidadeAtual,
    estoqueMinimo,
    referenciaTipo,
    referenciaId,
  }) => {
    const mensagem = `🚨 *ALERTA DE ESTOQUE*\n\nUsuario: *${nomeUsuario || "Sistema"}*\nOrigem: *${nomeMaquina || "Nao informado"}*\nProduto: *${produto}*\nSaldo atual: *${quantidadeAtual}*\nEstoque minimo: *${estoqueMinimo}*\n\nProvidencie reposicao.`;

    return dispatchAlert({
      tipo: "ESTOQUE_CRITICO",
      mensagem,
      destinatario: telefoneChefe,
      referenciaTipo,
      referenciaId,
      metadata: {
        nomeUsuario,
        nomeMaquina,
        produto,
        quantidadeAtual,
        estoqueMinimo,
      },
    });
  },

  equipamentoOffline: async ({
    telefoneChefe,
    nomeEquipamento,
    tempoOffline,
    referenciaTipo,
    referenciaId,
  }) => {
    const mensagem = `⚠️ *ALERTA DE SISTEMA*\n\nEquipamento: *${nomeEquipamento}*\nSem comunicacao ha *${tempoOffline}* minutos.\n\nVerifique a conexao no local.`;

    return dispatchAlert({
      tipo: "EQUIPAMENTO_OFFLINE",
      mensagem,
      destinatario: telefoneChefe,
      referenciaTipo,
      referenciaId,
      metadata: {
        nomeEquipamento,
        tempoOffline,
      },
    });
  },

  vendaEstornada: async ({
    nomeUsuario,
    telefoneChefe,
    valor,
    motivo,
    referenciaTipo,
    referenciaId,
  }) => {
    const mensagem = `💸 *ALERTA FINANCEIRO*\n\nUsuario: *${nomeUsuario || "Nao informado"}*\nValor estornado/perda: *R$ ${formatarValorMoeda(valor)}*\nMotivo: ${motivo || "Nao informado"}`;

    return dispatchAlert({
      tipo: "VENDA_ESTORNADA",
      mensagem,
      destinatario: telefoneChefe,
      referenciaTipo,
      referenciaId,
      metadata: {
        nomeUsuario,
        valor,
        motivo,
      },
    });
  },

  roteiroComPendencia: async ({
    roteiroId,
    roteiroNome,
    maquinasPendentes,
    destinatario,
  }) => {
    const mensagem = montarMensagemRoteiroPendente({
      roteiroNome,
      maquinasPendentes,
    });

    return dispatchAlert({
      tipo: "ROTEIRO_FINALIZADO_COM_PENDENCIA",
      mensagem,
      destinatario,
      referenciaTipo: "roteiro",
      referenciaId: roteiroId,
      metadata: {
        maquinasPendentes,
      },
    });
  },
};

export default AlertManager;
