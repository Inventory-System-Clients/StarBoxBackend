import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { sequelize } from "./database/connection.js";
import routes from "./routes/index.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Permitir recursos inline para a página de relatório
  })
);

// Configurar CORS para aceitar localhost e produção
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174",
  "https://starbox.selfmachine.com.br",
  process.env.FRONTEND_URL,
].filter(Boolean); // Remove undefined se FRONTEND_URL não estiver definida

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requisições sem origin (como mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      if (
        [
          "https://starbox.selfmachine.com.br",
          "http://localhost:5173",
        ].includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Middleware para garantir headers CORS em todas as respostas, inclusive OPTIONS
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://starbox.selfmachine.com.br",
    "http://localhost:5173",
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
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

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📍 http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);

      // Agendar limpeza automática de dados antigos (diariamente às 3h da manhã)
      if (process.env.NODE_ENV === "production") {
        iniciarLimpezaAutomatica();
      }
    });
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
