import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { sequelize } from "./database/connection.js";
import routes from "./routes/index.js";
import { processarJobAlertaWhatsApp } from "./services/alertManager.js";
import { inicializarFilaAlertas } from "./services/alertQueueService.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Permitir recursos inline para a página de relatório
  }),
);

// Configurar CORS para aceitar localhost e produção
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174",
  "https://starbox.selfmachine.com.br",
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
].filter(Boolean); // Remove undefined se FRONTEND_URL não estiver definida

const permiteVercelPreviews = ["1", "true", "yes", "on"].includes(
  String(process.env.ALLOW_VERCEL_PREVIEWS || "false")
    .toLowerCase()
    .trim(),
);

const vercelPreviewRegex = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

const origemPermitida = (origin) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (permiteVercelPreviews && vercelPreviewRegex.test(origin)) {
    return true;
  }

  return false;
};

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requisições sem origin (como mobile apps, Postman, curl)
      if (origemPermitida(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Security-Token"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }),
);

// Middleware para garantir headers CORS em todas as respostas, inclusive OPTIONS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origemPermitida(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Security-Token",
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos da pasta public
app.use("/public", express.static(path.join(__dirname, "..", "public")));

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Agarra Mais API",
    version: "1.0.0",
    status: "online",
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      usuarios: "/api/usuarios",
      lojas: "/api/lojas",
      maquinas: "/api/maquinas",
      produtos: "/api/produtos",
      movimentacoes: "/api/movimentacoes",
      relatorios: "/api/relatorios",
    },
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Debug endpoint - remover em produção
app.get("/debug/admin", async (req, res) => {
  const { Usuario } = await import("./models/index.js");
  const admin = await Usuario.findOne({
    where: { email: process.env.ADMIN_EMAIL || "admin@agarramais.com" },
  });
  res.json({
    adminExists: !!admin,
    email: admin?.email,
    role: admin?.role,
    ativo: admin?.ativo,
  });
});

// Routes
app.use("/api", routes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || "Erro interno do servidor",
      status: err.status || 500,
    },
  });
});

// Database connection and server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexão com PostgreSQL estabelecida com sucesso!");

    // Sync database - cria novas tabelas/colunas mas não altera existentes
    // Para evitar erros de sintaxe SQL ao adicionar constraints
    await sequelize.sync();
    console.log("✅ Database sincronizado!");

    // --- Migrations inline: ajustes de colunas existentes ---
    try {
      await sequelize.query(`
        ALTER TYPE "enum_usuarios_role"
        ADD VALUE IF NOT EXISTS 'FUNCIONARIO_TODAS_LOJAS'
      `);
      await sequelize.query(`
        ALTER TYPE "enum_usuarios_role"
        ADD VALUE IF NOT EXISTS 'CONTROLADOR_ESTOQUE'
      `);
      console.log(
        "✅ Migration: roles FUNCIONARIO_TODAS_LOJAS e CONTROLADOR_ESTOQUE adicionados ao enum de usuarios",
      );
    } catch (migErr) {
      console.warn("⚠️ Migration inline (enum_usuarios_role):", migErr.message);
    }

    try {
      // Alterar quantidade_notas_entrada de INTEGER para DECIMAL(10,2) se necessário
      const [colInfo] = await sequelize.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'movimentacoes' AND column_name = 'quantidade_notas_entrada'
      `);
      if (colInfo.length > 0 && colInfo[0].data_type === "integer") {
        await sequelize.query(`
          ALTER TABLE movimentacoes
          ALTER COLUMN quantidade_notas_entrada TYPE DECIMAL(10,2)
          USING quantidade_notas_entrada::DECIMAL(10,2)
        `);
        console.log(
          "✅ Migration: quantidade_notas_entrada alterada para DECIMAL(10,2)",
        );
      }
    } catch (migErr) {
      console.warn(
        "⚠️ Migration inline (quantidade_notas_entrada):",
        migErr.message,
      );
    }

    // Criar admin padrão se não existir
    const { Usuario } = await import("./models/index.js");
    const adminEmail = process.env.ADMIN_EMAIL || "admin@agarramais.com";
    const adminExistente = await Usuario.findOne({
      where: { email: adminEmail },
    });

    if (!adminExistente) {
      const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
      await Usuario.create({
        nome: "Administrador",
        email: adminEmail,
        senha: adminPassword,
        role: "ADMIN",
        telefone: "(11) 99999-9999",
        ativo: true,
      });
      console.log("✅ Usuário admin criado:", adminEmail);
    }

    const statusFilaAlertas = await inicializarFilaAlertas({
      processador: processarJobAlertaWhatsApp,
    });

    if (statusFilaAlertas.enabled) {
      console.log(
        `✅ Fila de alertas inicializada (${statusFilaAlertas.queueName}) com concorrencia ${statusFilaAlertas.concurrency}`,
      );
    } else {
      console.log(`ℹ️ Fila de alertas desativada: ${statusFilaAlertas.reason}`);
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📍 http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);

      // Agendar limpeza automática de dados antigos (diariamente às 3h da manhã)
      if (process.env.NODE_ENV === "production") {
        iniciarLimpezaAutomatica();
        iniciarResetRoteirosDiario();
      }
    });

    // Função para resetar status dos roteiros diariamente às 00h
    const iniciarResetRoteirosDiario = async () => {
      const { resetarRoteirosDiarios } =
        await import("./utils/resetRoteiros.js");

      const executarReset = async () => {
        const agora = new Date();
        const horas = agora.getHours();
        const minutos = agora.getMinutes();
        // Executar apenas à 00:00
        if (horas === 0 && minutos < 5) {
          // tolerância de 5 minutos
          console.log("🔄 Resetando status diário dos roteiros...");
          try {
            await resetarRoteirosDiarios();
          } catch (error) {
            console.error("❌ Erro no reset diário dos roteiros:", error);
          }
        }
      };
      // Executar a cada 5 minutos para garantir reset próximo da meia-noite
      setInterval(executarReset, 5 * 60 * 1000);
      console.log(
        "⏰ Reset diário dos roteiros agendado para 00:00 (meia-noite)",
      );
    };
  } catch (error) {
    console.error("❌ Erro ao conectar com o banco de dados:", error);
    process.exit(1);
  }
};

// Função para executar limpeza automática diariamente
const iniciarLimpezaAutomatica = async () => {
  const { limparDadosAntigos } = await import("./utils/dataRetention.js");

  const executarLimpeza = async () => {
    const agora = new Date();
    const horas = agora.getHours();

    // Executar apenas às 3h da manhã
    if (horas === 3) {
      console.log("🗑️  Executando limpeza automática de dados antigos...");
      try {
        await limparDadosAntigos();
      } catch (error) {
        console.error("❌ Erro na limpeza automática:", error);
      }
    }
  };

  // Executar a cada 1 hora para verificar se é 3h da manhã
  setInterval(executarLimpeza, 60 * 60 * 1000); // 1 hora em ms
  console.log("⏰ Limpeza automática agendada para 3h da manhã (diariamente)");
};

startServer();

export default app;
