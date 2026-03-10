import { Queue, Worker } from "bullmq";

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(
    String(value).toLowerCase().trim(),
  );
};

const ALERT_QUEUE_ENABLED = parseBoolean(
  process.env.ALERT_QUEUE_ENABLED,
  false,
);
const ALERT_QUEUE_NAME = process.env.ALERT_QUEUE_NAME || "whatsapp-alertas";
const ALERT_QUEUE_CONCURRENCY = Number(
  process.env.ALERT_QUEUE_CONCURRENCY || 2,
);
const ALERT_QUEUE_ATTEMPTS = Number(process.env.ALERT_QUEUE_ATTEMPTS || 5);
const ALERT_QUEUE_BACKOFF_MS = Number(
  process.env.ALERT_QUEUE_BACKOFF_MS || 5000,
);
const ALERT_QUEUE_REMOVE_ON_COMPLETE = Number(
  process.env.ALERT_QUEUE_REMOVE_ON_COMPLETE || 1000,
);
const ALERT_QUEUE_REMOVE_ON_FAIL = Number(
  process.env.ALERT_QUEUE_REMOVE_ON_FAIL || 2000,
);

let alertQueueInstance = null;
let alertWorkerInstance = null;
let alertQueueInitialized = false;

const buildRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    const parsed = new URL(redisUrl);

    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: parsed.pathname ? Number(parsed.pathname.replace("/", "") || 0) : 0,
      tls: parsed.protocol === "rediss:" ? {} : undefined,
      maxRetriesPerRequest: null,
    };
  }

  const connection = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };

  if (parseBoolean(process.env.REDIS_TLS, false)) {
    connection.tls = {};
  }

  return connection;
};

export const isAlertQueueEnabled = () => ALERT_QUEUE_ENABLED;

export const inicializarFilaAlertas = async ({ processador } = {}) => {
  if (!ALERT_QUEUE_ENABLED) {
    return {
      enabled: false,
      reason: "ALERT_QUEUE_ENABLED=false",
    };
  }

  if (alertQueueInitialized) {
    return {
      enabled: true,
      queueName: ALERT_QUEUE_NAME,
    };
  }

  if (typeof processador !== "function") {
    return {
      enabled: false,
      reason: "Processador da fila nao informado",
    };
  }

  try {
    const connection = buildRedisConnection();

    alertQueueInstance = new Queue(ALERT_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: Math.max(1, ALERT_QUEUE_ATTEMPTS),
        backoff: {
          type: "exponential",
          delay: Math.max(100, ALERT_QUEUE_BACKOFF_MS),
        },
        removeOnComplete: Math.max(1, ALERT_QUEUE_REMOVE_ON_COMPLETE),
        removeOnFail: Math.max(1, ALERT_QUEUE_REMOVE_ON_FAIL),
      },
    });

    alertWorkerInstance = new Worker(
      ALERT_QUEUE_NAME,
      async (job) => processador(job),
      {
        connection,
        concurrency: Math.max(1, ALERT_QUEUE_CONCURRENCY),
      },
    );

    alertWorkerInstance.on("completed", (job) => {
      console.log(`✅ [AlertQueue] Job concluido: ${job.id}`);
    });

    alertWorkerInstance.on("failed", (job, error) => {
      console.error(
        `❌ [AlertQueue] Job falhou: ${job?.id || "sem-id"}`,
        error?.message,
      );
    });

    alertWorkerInstance.on("error", (error) => {
      console.error("❌ [AlertQueue] Erro no worker:", error.message);
    });

    alertQueueInstance.waitUntilReady().catch((error) => {
      console.error("❌ [AlertQueue] Falha ao conectar a fila:", error.message);
    });

    alertWorkerInstance.waitUntilReady().catch((error) => {
      console.error(
        "❌ [AlertQueue] Falha ao conectar o worker:",
        error.message,
      );
    });

    alertQueueInitialized = true;

    return {
      enabled: true,
      queueName: ALERT_QUEUE_NAME,
      concurrency: Math.max(1, ALERT_QUEUE_CONCURRENCY),
    };
  } catch (error) {
    alertQueueInstance = null;
    alertWorkerInstance = null;
    alertQueueInitialized = false;

    return {
      enabled: false,
      reason: error.message,
    };
  }
};

export const enfileirarAlertaWhatsApp = async ({ alertaId, options } = {}) => {
  if (!ALERT_QUEUE_ENABLED || !alertQueueInstance) {
    return {
      queued: false,
      reason: "Fila desabilitada ou nao inicializada",
    };
  }

  if (!alertaId) {
    throw new Error("alertaId e obrigatorio para enfileirar alerta");
  }

  const job = await alertQueueInstance.add(
    "send-whatsapp-alert",
    {
      alertaId,
      options: options || {},
    },
    {
      jobId: String(alertaId),
    },
  );

  return {
    queued: true,
    jobId: String(job.id),
  };
};
