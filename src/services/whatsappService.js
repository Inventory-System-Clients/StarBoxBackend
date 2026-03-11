const WHATSAPP_PROVIDER = (process.env.WHATSAPP_PROVIDER || "evolution")
  .trim()
  .toLowerCase();

const EVOLUTION_URL_BASE = (
  process.env.EVOLUTION_URL || "http://localhost:8080"
).replace(/\/+$/, "");

const EVOLUTION_INSTANCE_NAME =
  process.env.EVOLUTION_INSTANCE_NAME ||
  process.env.INSTANCE_NAME ||
  "bot_alertas";

const EVOLUTION_API_KEY =
  process.env.EVOLUTION_API_KEY || process.env.AUTHENTICATION_API_KEY || "";

const EVOLUTION_REQUEST_TIMEOUT_MS = Number(
  process.env.EVOLUTION_REQUEST_TIMEOUT_MS || 15000,
);

const EVOLUTION_DEFAULT_DELAY_MS = Number(
  process.env.EVOLUTION_DEFAULT_DELAY_MS || 1200,
);

const EVOLUTION_DEFAULT_PRESENCE =
  process.env.EVOLUTION_DEFAULT_PRESENCE || "composing";

const EVOLUTION_SEND_TEXT_PATH_TEMPLATE =
  process.env.EVOLUTION_SEND_TEXT_PATH_TEMPLATE ||
  "/message/sendText/{instance}";

const META_WHATSAPP_GRAPH_BASE_URL = (
  process.env.META_WHATSAPP_GRAPH_BASE_URL || "https://graph.facebook.com"
).replace(/\/+$/, "");

const META_WHATSAPP_API_VERSION =
  process.env.META_WHATSAPP_API_VERSION || "v22.0";

const META_WHATSAPP_PHONE_NUMBER_ID =
  process.env.META_WHATSAPP_PHONE_NUMBER_ID || "";

const META_WHATSAPP_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || "";

const META_WHATSAPP_REQUEST_TIMEOUT_MS = Number(
  process.env.META_WHATSAPP_REQUEST_TIMEOUT_MS || 15000,
);

const META_WHATSAPP_FORCE_TEMPLATE =
  String(process.env.META_WHATSAPP_FORCE_TEMPLATE || "false").toLowerCase() ===
  "true";

const META_WHATSAPP_DEFAULT_TEMPLATE_NAME =
  process.env.META_WHATSAPP_DEFAULT_TEMPLATE_NAME || "";

const META_WHATSAPP_DEFAULT_TEMPLATE_LANGUAGE =
  process.env.META_WHATSAPP_DEFAULT_TEMPLATE_LANGUAGE || "en_US";

export const normalizePhoneNumber = (numero) => {
  const normalizado = String(numero || "").replace(/\D/g, "");
  return normalizado || null;
};

export const isEvolutionConfigured = () => {
  return Boolean(
    EVOLUTION_URL_BASE && EVOLUTION_INSTANCE_NAME && EVOLUTION_API_KEY,
  );
};

export const isMetaConfigured = () => {
  return Boolean(META_WHATSAPP_PHONE_NUMBER_ID && META_WHATSAPP_ACCESS_TOKEN);
};

export const getWhatsAppProvider = () => WHATSAPP_PROVIDER;

const buildSendTextUrl = () => {
  const path = EVOLUTION_SEND_TEXT_PATH_TEMPLATE.replace(
    "{instance}",
    EVOLUTION_INSTANCE_NAME,
  );
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${EVOLUTION_URL_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
};

const buildMetaMessagesUrl = () => {
  return `${META_WHATSAPP_GRAPH_BASE_URL}/${META_WHATSAPP_API_VERSION}/${META_WHATSAPP_PHONE_NUMBER_ID}/messages`;
};

const parseResponseBody = async (response) => {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
};

const buildMetaPayload = ({ destinatario, texto, options }) => {
  const templateName =
    options.templateName || META_WHATSAPP_DEFAULT_TEMPLATE_NAME;
  const templateLanguage =
    options.templateLanguage || META_WHATSAPP_DEFAULT_TEMPLATE_LANGUAGE;
  const shouldUseTemplate = Boolean(
    options.useTemplate || (META_WHATSAPP_FORCE_TEMPLATE && templateName),
  );

  if (shouldUseTemplate) {
    if (!templateName) {
      throw new Error(
        "META_WHATSAPP_FORCE_TEMPLATE=true, mas META_WHATSAPP_DEFAULT_TEMPLATE_NAME nao foi definido",
      );
    }

    const templateParameters = Array.isArray(options.templateParameters)
      ? options.templateParameters
      : [];

    const payload = {
      messaging_product: "whatsapp",
      to: destinatario,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: templateLanguage,
        },
      },
    };

    if (templateParameters.length > 0) {
      payload.template.components = [
        {
          type: "body",
          parameters: templateParameters.map((value) => ({
            type: "text",
            text: String(value),
          })),
        },
      ];
    }

    return payload;
  }

  return {
    messaging_product: "whatsapp",
    to: destinatario,
    type: "text",
    text: {
      preview_url: Boolean(options.previewUrl),
      body: String(texto),
    },
  };
};

const sendViaEvolution = async ({ destinatario, texto, options }) => {
  if (!isEvolutionConfigured()) {
    throw new Error(
      "Configuracao Evolution ausente (EVOLUTION_URL, EVOLUTION_INSTANCE_NAME e EVOLUTION_API_KEY)",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    EVOLUTION_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(buildSendTextUrl(), {
      method: "POST",
      signal: controller.signal,
      headers: {
        apikey: EVOLUTION_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: destinatario,
        options: {
          delay:
            options.delay !== undefined
              ? Number(options.delay)
              : EVOLUTION_DEFAULT_DELAY_MS,
          presence: options.presence || EVOLUTION_DEFAULT_PRESENCE,
        },
        textMessage: {
          text: String(texto),
        },
      }),
    });

    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(
        `Falha no envio Evolution (${response.status}): ${JSON.stringify(responseBody)}`,
      );
    }

    return responseBody;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Timeout no envio de mensagem para Evolution API");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const sendViaMeta = async ({ destinatario, texto, options }) => {
  if (!isMetaConfigured()) {
    throw new Error(
      "Configuracao Meta ausente (META_WHATSAPP_PHONE_NUMBER_ID e META_WHATSAPP_ACCESS_TOKEN)",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    META_WHATSAPP_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(buildMetaMessagesUrl(), {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildMetaPayload({
          destinatario,
          texto,
          options,
        }),
      ),
    });

    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(
        `Falha no envio Meta (${response.status}): ${JSON.stringify(responseBody)}`,
      );
    }

    return responseBody;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Timeout no envio de mensagem para Meta WhatsApp API");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export async function sendWhatsAppMessage({ numero, texto, options = {} }) {
  const destinatario = normalizePhoneNumber(numero);

  if (!destinatario) {
    throw new Error("Destinatario do WhatsApp nao informado");
  }

  if (!texto || !String(texto).trim()) {
    throw new Error("Texto do WhatsApp nao informado");
  }

  if (WHATSAPP_PROVIDER === "meta") {
    return sendViaMeta({
      destinatario,
      texto,
      options,
    });
  }

  if (WHATSAPP_PROVIDER === "evolution") {
    return sendViaEvolution({
      destinatario,
      texto,
      options,
    });
  }

  throw new Error(
    `WHATSAPP_PROVIDER invalido: ${WHATSAPP_PROVIDER}. Use 'evolution' ou 'meta'`,
  );
}
