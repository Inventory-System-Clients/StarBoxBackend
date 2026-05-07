/**
 * Migration: Tabela de ultima localizacao ativa por usuario em roteiro
 * Data: 2026-05-07
 */

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable("roteiro_localizacoes", {
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
      allowNull: false,
      references: {
        model: "usuarios",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    latitude: {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: false,
    },
    longitude: {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: false,
    },
    accuracy: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    altitude: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    heading: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    speed: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    captured_at: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    ativa: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    encerrada_em: {
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

  await queryInterface.addIndex("roteiro_localizacoes", ["roteiro_id", "usuario_id"], {
    unique: true,
    name: "idx_roteiro_localizacoes_roteiro_usuario_unique",
  });

  await queryInterface.addIndex("roteiro_localizacoes", ["ativa", "updated_at"], {
    name: "idx_roteiro_localizacoes_ativa_updated_at",
  });

  await queryInterface.addIndex("roteiro_localizacoes", ["captured_at"], {
    name: "idx_roteiro_localizacoes_captured_at",
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable("roteiro_localizacoes");
};
