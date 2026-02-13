import dotenv from "dotenv";
import { sequelize } from "./connection.js";
import {
  Usuario,
  Loja,
  Maquina,
  Produto,
  Movimentacao,
  MovimentacaoProduto,
  UsuarioLoja,
} from "../models/index.js";

dotenv.config();

const lojasSeed = [
  {
    nome: "Aricanduva",
    endereco: "Shopping Aricanduva",
    cidade: "São Paulo",
    estado: "SP",
  },
  {
    nome: "Boulevard",
    endereco: "Boulevard Tatuapé",
    cidade: "São Paulo",
    estado: "SP",
  },
  {
    nome: "Interlagos",
    endereco: "Shopping Interlagos",
    cidade: "São Paulo",
    estado: "SP",
  },
  {
    nome: "Itupeva",
    endereco: "Itupeva Shopping",
    cidade: "Itupeva",
    estado: "SP",
  },
  {
    nome: "Osasco",
    endereco: "Shopping Osasco",
    cidade: "Osasco",
    estado: "SP",
  },
  {
    nome: "Tatuapé",
    endereco: "Tatuapé Plaza Shopping",
    cidade: "São Paulo",
    estado: "SP",
  },
  {
    nome: "Vila Olímpia",
    endereco: "Shopping Vila Olímpia",
    cidade: "São Paulo",
    estado: "SP",
  },
];

const produtosSeed = [
  {
    nome: "Capivara",
    categoria: "Pelúcia",
    tamanho: "Médio",
    custoUnitario: 15.0,
  },
  {
    nome: "Stitch",
    categoria: "Pelúcia",
    tamanho: "Grande",
    custoUnitario: 25.0,
  },
  {
    nome: "PicPic",
    categoria: "Pelúcia",
    tamanho: "Pequeno",
    custoUnitario: 10.0,
  },
  {
    nome: "Fuggler",
    categoria: "Pelúcia",
    tamanho: "Médio",
    custoUnitario: 18.0,
  },
  {
    nome: "Minion",
    categoria: "Pelúcia",
    tamanho: "Grande",
    custoUnitario: 22.0,
  },
  {
    nome: "Pokémon",
    categoria: "Pelúcia",
    tamanho: "Médio",
    custoUnitario: 20.0,
  },
  {
    nome: "Sonic",
    categoria: "Pelúcia",
    tamanho: "Grande",
    custoUnitario: 24.0,
  },
  {
    nome: "Hello Kitty",
    categoria: "Pelúcia",
    tamanho: "Pequeno",
    custoUnitario: 12.0,
  },
];

async function seed() {
  try {
    console.log("🌱 Iniciando seed do banco de dados...\n");

    // Sincronizar banco (CUIDADO: isso apaga os dados existentes)
    await sequelize.sync({ force: true });
    console.log("✅ Banco sincronizado\n");

    // Criar usuário admin
    console.log("👤 Criando usuário administrador...");
    const admin = await Usuario.create({
      nome: "Administrador",
      email: process.env.ADMIN_EMAIL || "admin@agarramais.com",
      senha: process.env.ADMIN_PASSWORD || "Admin@123",
      role: "ADMIN",
      telefone: "(11) 99999-9999",
    });
    console.log(`✅ Admin criado: ${admin.email}\n`);

    // Criar funcionário de teste
    console.log("👤 Criando funcionário de teste...");
    const funcionario = await Usuario.create({
      nome: "João Silva",
      email: "joao@agarramais.com",
      senha: "Func@123",
      role: "FUNCIONARIO",
      telefone: "(11) 98888-8888",
    });
    console.log(`✅ Funcionário criado: ${funcionario.email}\n`);

    // Criar lojas
    console.log("🏪 Criando lojas...");
    const lojas = await Loja.bulkCreate(lojasSeed);
    console.log(`✅ ${lojas.length} lojas criadas\n`);

    // Criar produtos
    console.log("🎁 Criando produtos...");
    const produtos = await Produto.bulkCreate(produtosSeed);
    console.log(`✅ ${produtos.length} produtos criados\n`);

    // Criar máquinas para cada loja
    console.log("🎰 Criando máquinas...");
    const maquinas = [];
    for (const loja of lojas) {
      // 2-3 máquinas por loja
      const numMaquinas = Math.floor(Math.random() * 2) + 2;

      for (let i = 1; i <= numMaquinas; i++) {
        const maquina = await Maquina.create({
          codigo: `${loja.nome.substring(0, 3).toUpperCase()}M${String(
            i
          ).padStart(2, "0")}`,
          nome: i === numMaquinas ? "TakeBall" : `Agarra Mais ${i}`,
          tipo: i === numMaquinas ? "TakeBall" : "Agarra Mais",
          lojaId: loja.id,
          capacidadePadrao: 100,
          valorFicha: 5.0,
          percentualAlertaEstoque: 30,
        });
        maquinas.push(maquina);
      }
    }
    console.log(`✅ ${maquinas.length} máquinas criadas\n`);

    // Dar permissão ao funcionário para algumas lojas
    console.log("🔐 Configurando permissões...");
    const lojasParaFuncionario = lojas.slice(0, 3); // Primeiras 3 lojas
    for (const loja of lojasParaFuncionario) {
      await UsuarioLoja.create({
        usuarioId: funcionario.id,
        lojaId: loja.id,
        permissoes: {
          visualizar: true,
          editar: false,
          registrarMovimentacao: true,
        },
      });
    }
    console.log(
      `✅ Funcionário autorizado em ${lojasParaFuncionario.length} lojas\n`
    );

    // Criar algumas movimentações de exemplo (últimos 7 dias)
    console.log("📊 Criando movimentações de exemplo...");
    const hoje = new Date();
    let totalMovimentacoes = 0;

    for (let dia = 0; dia < 7; dia++) {
      const data = new Date(hoje);
      data.setDate(data.getDate() - dia);

      // Algumas máquinas têm movimentação neste dia
      const maquinasDoDay = maquinas.filter(() => Math.random() > 0.3);

      for (const maquina of maquinasDoDay) {
        const totalPre = Math.floor(Math.random() * 50) + 30;
        const sairam = Math.floor(Math.random() * 20) + 5;
        const abastecidas = Math.floor(Math.random() * 30) + 10;
        const fichas = Math.floor(Math.random() * 40) + 20;

        const movimentacao = await Movimentacao.create({
          maquinaId: maquina.id,
          usuarioId: Math.random() > 0.5 ? admin.id : funcionario.id,
          dataColeta: data,
          totalPre,
          sairam,
          abastecidas,
          fichas,
          valorFaturado: fichas * parseFloat(maquina.valorFicha),
          observacoes: dia === 0 ? "Tudo funcionando bem" : null,
          tipoOcorrencia: "Normal",
        });

        // Adicionar produtos à movimentação
        const produtosAleatorios = produtos
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);
        for (const produto of produtosAleatorios) {
          await MovimentacaoProduto.create({
            movimentacaoId: movimentacao.id,
            produtoId: produto.id,
            quantidadeSaiu: Math.floor(Math.random() * 5) + 1,
            quantidadeAbastecida: Math.floor(Math.random() * 10) + 5,
          });
        }

        totalMovimentacoes++;
      }
    }
    console.log(`✅ ${totalMovimentacoes} movimentações criadas\n`);

    console.log("========================================");
    console.log("🎉 Seed concluído com sucesso!");
    console.log("========================================\n");
    console.log("📝 Credenciais:");
    console.log("   Admin:");
    console.log(`   Email: ${admin.email}`);
    console.log(`   Senha: ${process.env.ADMIN_PASSWORD || "Admin@123"}`);
    console.log("\n   Funcionário:");
    console.log(`   Email: ${funcionario.email}`);
    console.log("   Senha: Func@123\n");
    console.log("========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar seed:", error);
    process.exit(1);
  }
}

seed();
