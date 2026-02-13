// Script para criar banco de dados e tabelas para uma nova empresa
// Uso: node create-company-db.js <nome_empresa>

const mysql = require("mysql2/promise");
const fs = require("fs");

const DB_HOST = "localhost"; // Altere conforme necessário
const DB_USER = "root"; // Altere conforme necessário
const DB_PASS = "sua_senha"; // Altere conforme necessário
const SQL_FILE = "./src/database/schema.sql"; // Arquivo SQL com CREATE TABLEs

async function main() {
  const nomeEmpresa = process.argv[2];
  if (!nomeEmpresa) {
    console.error(
      "Informe o nome da empresa. Ex: node create-company-db.js empresa1"
    );
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
  });

  // Cria o banco de dados
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${nomeEmpresa}\``);
  console.log(`Banco de dados '${nomeEmpresa}' criado ou já existe.`);

  // Usa o novo banco
  await connection.changeUser({ database: nomeEmpresa });

  // Executa o script SQL para criar as tabelas
  const sql = fs.readFileSync(SQL_FILE, "utf8");
  await connection.query(sql);
  console.log("Tabelas criadas com sucesso!");

  await connection.end();
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
