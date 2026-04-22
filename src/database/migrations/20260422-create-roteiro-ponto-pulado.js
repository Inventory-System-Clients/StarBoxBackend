/**
 * Migration: Tabela para controlar pontos pulados por roteiro/dia
 * Data: 2026-04-22
 */

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable("roteiro_ponto_pulado", {
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
    loja_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "lojas",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    data: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    foi_pulado: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    justificativa_enviada: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    justificativa: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    primeira_quebra_em: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    ultima_quebra_em: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    primeiro_usuario_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "usuarios",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    ultimo_usuario_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "usuarios",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
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
    "roteiro_ponto_pulado",
    ["roteiro_id", "loja_id", "data"],
    {
      unique: true,
      name: "idx_roteiro_ponto_pulado_unique",
    },
  );

  await queryInterface.addIndex("roteiro_ponto_pulado", ["roteiro_id", "data"], {
    name: "idx_roteiro_ponto_pulado_roteiro_data",
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable("roteiro_ponto_pulado");
};
