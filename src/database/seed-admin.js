import dotenv from "dotenv";
import { sequelize } from "./connection.js";
import "../models/index.js"; // Importa todos os models para criar as tabelas
import Usuario from "../models/Usuario.js";

dotenv.config();

const createAdmin = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Conectado ao banco de dados");

    await sequelize.sync();
    console.log("✅ Tabelas sincronizadas");

    const adminEmail = process.env.ADMIN_EMAIL || "admin@agarramais.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";

    // Verificar se já existe um admin
    const adminExistente = await Usuario.findOne({
      where: { email: adminEmail },
    });

    if (adminExistente) {
      console.log("ℹ️  Usuário admin já existe");
      process.exit(0);
    }

    // Criar admin
    await Usuario.create({
      nome: "Administrador",
      email: adminEmail,
      senha: adminPassword,
      role: "ADMIN",
      telefone: "(11) 99999-9999",
      ativo: true,
    });

    console.log("✅ Usuário admin criado com sucesso!");
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Senha: ${adminPassword}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao criar admin:", error);
    process.exit(1);
  }
};

createAdmin();
