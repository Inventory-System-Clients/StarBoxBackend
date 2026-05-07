/**
 * Migration: Tabela de execucao semanal do roteiro
 * Data: 2026-05-07
 */

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable("roteiro_execucao_semanal", {
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
    usuario_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "usuarios",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    data_inicio: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    iniciado_em: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    em_andamento: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    finalizado_em: {
      type: Sequelize.DATE,
      allowNull: true,
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
    "roteiro_execucao_semanal",
    ["roteiro_id"],
    {
      unique: true,
      name: "idx_roteiro_execucao_semanal_roteiro_unique",
    },
  );

  await queryInterface.addIndex(
    "roteiro_execucao_semanal",
    ["em_andamento"],
    {
      name: "idx_roteiro_execucao_semanal_em_andamento",
    },
  );

  await queryInterface.addIndex(
    "roteiro_execucao_semanal",
    ["data_inicio"],
    {
      name: "idx_roteiro_execucao_semanal_data_inicio",
    },
  );
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable("roteiro_execucao_semanal");
};
