import { sequelize } from "./src/database/connection.js";
import { DataTypes } from "sequelize";

console.log("🔄 Conectando ao banco de dados...");

try {
  await sequelize.authenticate();
  console.log("✅ Conexão estabelecida com sucesso!\n");

  const queryInterface = sequelize.getQueryInterface();

  console.log("📝 Adicionando colunas de revisão na tabela veiculos...\n");

  // Verificar se as colunas já existem
  const [columns] = await sequelize.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'veiculos' 
    AND column_name IN ('km_inicial_cadastro', 'proxima_revisao_km', 'ultima_revisao_km')
  `);

  if (columns.length > 0) {
    console.log(`⚠️  Algumas colunas já existem: ${columns.map(c => c.column_name).join(', ')}`);
    console.log("Pulando criação das colunas existentes...\n");
  }

  // Adicionar km_inicial_cadastro
  if (!columns.find(c => c.column_name === 'km_inicial_cadastro')) {
    await queryInterface.addColumn('veiculos', 'km_inicial_cadastro', {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "KM do veículo quando foi cadastrado no sistema",
    });
    console.log("✅ Coluna km_inicial_cadastro adicionada");
  }

  // Adicionar proxima_revisao_km
  if (!columns.find(c => c.column_name === 'proxima_revisao_km')) {
    await queryInterface.addColumn('veiculos', 'proxima_revisao_km', {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Próximo KM que o veículo deve fazer revisão (múltiplo de 10.000)",
    });
    console.log("✅ Coluna proxima_revisao_km adicionada");
  }

  // Adicionar ultima_revisao_km
  if (!columns.find(c => c.column_name === 'ultima_revisao_km')) {
    await queryInterface.addColumn('veiculos', 'ultima_revisao_km', {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Último KM em que foi feita revisão",
    });
    console.log("✅ Coluna ultima_revisao_km adicionada");
  }

  console.log("\n📊 Inicializando valores para veículos existentes...\n");

  // Inicializar km_inicial_cadastro com o km atual de cada veículo
  const [result] = await sequelize.query(`
    UPDATE veiculos 
    SET 
      km_inicial_cadastro = COALESCE(km_inicial_cadastro, km),
      proxima_revisao_km = COALESCE(proxima_revisao_km, ((km / 10000) + 1) * 10000)
    WHERE km_inicial_cadastro IS NULL OR proxima_revisao_km IS NULL
  `);

  console.log(`✅ ${result} veículo(s) atualizado(s) com valores iniciais\n`);

  console.log("✅ Migration executada com sucesso!");
  console.log("\n📋 Colunas adicionadas:");
  console.log("   - km_inicial_cadastro");
  console.log("   - proxima_revisao_km");
  console.log("   - ultima_revisao_km");

  process.exit(0);
} catch (error) {
  console.error("❌ Erro ao executar migration:", error);
  process.exit(1);
}
