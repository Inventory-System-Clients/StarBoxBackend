/**
 * Migration: orçamento diário em roteiros + tabela de gastos de roteiro
 * Data: 2026-03-13
 */

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn("Roteiros", "orcamento_diario", {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 2000,
  });

  await queryInterface.createTable("gastos_roteiro", {
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
      onDelete: "RESTRICT",
    },
    categoria: {
      type: Sequelize.ENUM(
        "transporte",
        "estadia",
        "abastecimento",
        "alimentacao",
        "outros",
      ),
      allowNull: false,
    },
    valor: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    },
    observacao: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    data_hora: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  });

  await queryInterface.addIndex("gastos_roteiro", ["roteiro_id"], {
    name: "idx_gastos_roteiro_roteiro_id",
  });
  await queryInterface.addIndex("gastos_roteiro", ["usuario_id"], {
    name: "idx_gastos_roteiro_usuario_id",
  });
  await queryInterface.addIndex("gastos_roteiro", ["data_hora"], {
    name: "idx_gastos_roteiro_data_hora",
  });
};

export const down = async (queryInterface) => {
  await queryInterface.dropTable("gastos_roteiro");
  await queryInterface.removeColumn("Roteiros", "orcamento_diario");

  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_gastos_roteiro_categoria";',
  );
};
