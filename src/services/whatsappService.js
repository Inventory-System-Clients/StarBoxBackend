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

export const normalizePhoneNumber = (numero) => {
  const normalizado = String(numero || "").replace(/\D/g, "");
  return normalizado || null;
};

export const isEvolutionConfigured = () => {
  return Boolean(
    EVOLUTION_URL_BASE && EVOLUTION_INSTANCE_NAME && EVOLUTION_API_KEY,
  );
};

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

export async function sendWhatsAppMessage({ numero, texto, options = {} }) {
  const destinatario = normalizePhoneNumber(numero);

  if (!destinatario) {
    throw new Error("Destinatario do WhatsApp nao informado");
  }

  if (!texto || !String(texto).trim()) {
    throw new Error("Texto do WhatsApp nao informado");
  }

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
}
