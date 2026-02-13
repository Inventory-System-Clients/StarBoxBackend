import { sequelize } from "./src/database/connection.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log("🔄 Conectando ao banco de dados...");
    await sequelize.authenticate();
    console.log("✅ Conexão estabelecida com sucesso!");

    console.log("\n📝 Executando migration: create-estoque-lojas.sql");

    // Ler o arquivo SQL
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "create-estoque-lojas.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    // Executar a migration
    await sequelize.query(sql);

    console.log("✅ Migration executada com sucesso!");
    console.log("\n📊 Tabela 'estoque_lojas' criada no banco de dados");

    // Verificar se a tabela foi criada
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'estoque_lojas'
    `);

    if (tables.length > 0) {
      console.log("✅ Confirmado: Tabela estoque_lojas existe no banco");

      // Mostrar estrutura da tabela
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'estoque_lojas'
        ORDER BY ordinal_position
      `);

      console.log("\n📋 Estrutura da tabela:");
      console.table(columns);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    process.exit(1);
  }
}

runMigration();
