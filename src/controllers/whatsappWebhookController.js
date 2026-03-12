import { Op } from "sequelize";
import { WhatsAppAlerta } from "../models/index.js";

const META_WHATSAPP_WEBHOOK_VERIFY_TOKEN =
  process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN || "";

const WEBHOOK_LOOKBACK_DAYS = Number(
  process.env.META_WHATSAPP_WEBHOOK_LOOKBACK_DAYS || 90,
);

const WEBHOOK_LOOKBACK_LIMIT = Number(
  process.env.META_WHATSAPP_WEBHOOK_LOOKBACK_LIMIT || 2000,
);

const toIsoFromUnix = (unixSeconds) => {
  const value = Number(unixSeconds);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return new Date(value * 1000).toISOString();
};

const extractMessageIdFromAlert = (alerta) => {
  const mensagens = alerta?.metadata?.envio?.messages;
  if (!Array.isArray(mensagens)) {
    return null;
  }

  const itemComId = mensagens.find((item) => item?.id);
  return itemComId?.id ? String(itemComId.id) : null;
};

const extractStatusEvents = (payload) => {
  const eventos = [];
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];

    for (const change of changes) {
      const value = change?.value || {};
      const statuses = Array.isArray(value?.statuses) ? value.statuses : [];

      for (const status of statuses) {
        if (!status?.id) {
          continue;
        }

        eventos.push({
          messageId: String(status.id),
          status: String(status.status || "desconhecido"),
          recipientId: status.recipient_id ? String(status.recipient_id) : null,
          timestampIso:
            toIsoFromUnix(status.timestamp) || new Date().toISOString(),
          errors: Array.isArray(status.errors) ? status.errors : [],
          raw: status,
        });
      }
    }
  }

  return eventos;
};

const findAlertByMessageId = async ({ messageId, cache }) => {
  if (cache.has(messageId)) {
    return cache.get(messageId);
  }

  const startDate = new Date(
    Date.now() - WEBHOOK_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  );

  const candidatos = await WhatsAppAlerta.findAll({
    where: {
      createdAt: {
        [Op.gte]: startDate,
      },
    },
    order: [["createdAt", "DESC"]],
    limit: WEBHOOK_LOOKBACK_LIMIT,
  });

  const alertaEncontrado =
    candidatos.find((item) => extractMessageIdFromAlert(item) === messageId) ||
    null;

  cache.set(messageId, alertaEncontrado);
  return alertaEncontrado;
};

const extractErrorMessage = (errors = []) => {
  if (!Array.isArray(errors) || errors.length === 0) {
    return null;
  }

  const first = errors[0] || {};
  return (
    first?.title ||
    first?.message ||
    first?.error_data?.details ||
    JSON.stringify(first)
  );
};

const buildWebhookMetadata = ({ alerta, evento }) => {
  const metadataAtual = alerta.metadata || {};
  const webhookAtual = metadataAtual.webhook || {};
  const historicoAtual = Array.isArray(webhookAtual.statusHistory)
    ? webhookAtual.statusHistory
    : [];

  const erroDetalhado = extractErrorMessage(evento.errors);

  const itemHistorico = {
    provider: "meta",
    messageId: evento.messageId,
    status: evento.status,
    recipientId: evento.recipientId,
    timestamp: evento.timestampIso,
    error: erroDetalhado,
    receivedAt: new Date().toISOString(),
  };

  return {
    ...metadataAtual,
    webhook: {
      ...webhookAtual,
      provider: "meta",
      lastStatus: evento.status,
      lastMessageId: evento.messageId,
      lastRecipientId: evento.recipientId,
      lastEventAt: itemHistorico.receivedAt,
      lastStatusPayload: evento.raw,
      statusHistory: [...historicoAtual, itemHistorico].slice(-50),
    },
  };
};

const resolveAlertStatus = ({ status }) => {
  if (status === "failed") {
    return "erro";
  }
  return "enviado";
};

const processStatusEvent = async ({ evento, cache }) => {
  const alerta = await findAlertByMessageId({
    messageId: evento.messageId,
    cache,
  });

  if (!alerta) {
    return {
      matched: false,
      messageId: evento.messageId,
    };
  }

  const novoStatus = resolveAlertStatus({ status: evento.status });
  const erroDetalhado = extractErrorMessage(evento.errors);

  const payloadUpdate = {
    status: novoStatus,
    erro:
      novoStatus === "erro"
        ? erroDetalhado || "Falha reportada pela Meta"
        : null,
    metadata: buildWebhookMetadata({ alerta, evento }),
  };

  if (novoStatus === "enviado" && !alerta.enviadoEm) {
    payloadUpdate.enviadoEm = new Date();
  }

  await alerta.update(payloadUpdate);

  return {
    matched: true,
    alertaId: alerta.id,
    messageId: evento.messageId,
    status: evento.status,
    persistedStatus: novoStatus,
  };
};

export const verificarWebhookMeta = (req, res) => {
  const mode = req.query["hub.mode"];
  const verifyToken = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (!META_WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return res
      .status(500)
      .json({ error: "META_WHATSAPP_WEBHOOK_VERIFY_TOKEN nao configurado" });
  }

  if (
    mode === "subscribe" &&
    verifyToken === META_WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

export const receberWebhookMeta = async (req, res) => {
  try {
    const payload = req.body;

    if (payload?.object !== "whatsapp_business_account") {
      return res.status(200).send("IGNORED");
    }

    const eventos = extractStatusEvents(payload);

    if (!eventos.length) {
      return res.status(200).send("NO_STATUS_EVENTS");
    }

    const cache = new Map();
    for (const evento of eventos) {
      await processStatusEvent({ evento, cache });
    }

    return res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.error("Erro ao processar webhook da Meta:", error);
    return res.status(500).json({ error: "Erro ao processar webhook da Meta" });
  }
};
