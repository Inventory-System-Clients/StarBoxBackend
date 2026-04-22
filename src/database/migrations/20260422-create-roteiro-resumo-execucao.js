/**
 * Migration: Tabela de resumo persistente da execucao de roteiro
 * Data: 2026-04-22
 */

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable("roteiro_resumo_execucao", {
    id: {
      type: Sequelize.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.literal("gen_random_uuid()"),
    },
    roteiro_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "Roteiros",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    data: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    status: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "em_andamento",
    },
    fechado_em: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    fechado_por_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "usuarios",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    roteiro_nome: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    pontos_feitos: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    pontos_nao_feitos: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    maquinas_feitas: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    maquinas_nao_feitas: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    estoque_inicial_total: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    estoque_final_total: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    consumo_total_produtos: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    despesa_total: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    sobra_valor_despesa: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total_manutencoes_realizadas: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lojas_com_manutencao_realizada: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    manutencoes_realizadas: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    manutencoes_nao_realizadas: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    manutencoes_nao_realizadas_por_ponto: {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  });

  await queryInterface.addIndex(
    "roteiro_resumo_execucao",
    ["roteiro_id", "data"],
    {
      unique: true,
      name: "idx_roteiro_resumo_execucao_roteiro_data_unique",
    },
  );

  await queryInterface.addIndex("roteiro_resumo_execucao", ["status"], {
    name: "idx_roteiro_resumo_execucao_status",
  });

  await queryInterface.addIndex("roteiro_resumo_execucao", ["data"], {
    name: "idx_roteiro_resumo_execucao_data",
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable("roteiro_resumo_execucao");
};
