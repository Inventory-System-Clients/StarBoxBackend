// Script de teste para verificar se a tabela estoque_lojas existe
import { sequelize } from "./src/database/connection.js";

async function testarTabela() {
  try {
    console.log("🔄 Conectando ao banco...");
    await sequelize.authenticate();
    console.log("✅ Conexão OK");

    // Verificar se a tabela existe
    console.log("\n📊 Verificando tabela estoque_lojas...");
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'estoque_lojas'
    `);

    if (tables.length === 0) {
      console.log("❌ ERRO: Tabela 'estoque_lojas' NÃO existe no banco!");
      console.log("\n🔧 Execute a migration primeiro:");
      console.log(
        "   - Copie o SQL do arquivo migrations/create-estoque-lojas.sql"
      );
      console.log("   - Execute no DBeaver");
      process.exit(1);
    }

    console.log("✅ Tabela 'estoque_lojas' existe!");

    // Mostrar estrutura
    console.log("\n📋 Estrutura da tabela:");
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'estoque_lojas'
      ORDER BY ordinal_position
    `);
    console.table(columns);

    // Testar rota
    console.log("\n🧪 Testando rotas...");
    const { default: routes } = await import("./src/routes/index.js");
    console.log("✅ Rotas carregadas com sucesso");

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  }
}

testarTabela();
