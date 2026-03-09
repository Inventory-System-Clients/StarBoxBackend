/**
 * Migration: Ordenação de lojas em roteiros
 * Data: 2026-03-09
 *
 * Adiciona:
 * - Coluna `ordem` na tabela de junção RoteiroLojas
 * - Coluna `justificativa_ordem` na tabela movimentacoes
 * - Tabela `log_ordem_roteiro` para rastrear justificativas de quebra de ordem
 */

export const up = async (queryInterface, Sequelize) => {
  // 1. Adicionar coluna ordem na tabela de junção RoteiroLojas
  await queryInterface.addColumn("RoteiroLojas", "ordem", {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    allowNull: false,
  });

  // 2. Adicionar coluna justificativa_ordem na tabela movimentacoes
  await queryInterface.addColumn("movimentacoes", "justificativa_ordem", {
    type: Sequelize.TEXT,
    allowNull: true,
  });

  // 3. Criar tabela de log de justificativas de quebra de ordem
  await queryInterface.createTable("log_ordem_roteiro", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal("gen_random_uuid()"),
      primaryKey: true,
    },
    roteiro_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "roteiros", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    loja_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "lojas", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    usuario_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "usuarios", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    loja_esperada_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "lojas", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    loja_selecionada_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "lojas", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    justificativa: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    loja_esperada_nome: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    loja_nome: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    created_at: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  });

  // Índices para melhorar performance nas consultas
  await queryInterface.addIndex("log_ordem_roteiro", ["roteiro_id"], {
    name: "idx_log_ordem_roteiro_roteiro",
  });
  await queryInterface.addIndex("log_ordem_roteiro", ["created_at"], {
    name: "idx_log_ordem_roteiro_created",
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable("log_ordem_roteiro");
  await queryInterface.removeColumn("movimentacoes", "justificativa_ordem");
  await queryInterface.removeColumn("RoteiroLojas", "ordem");
};
