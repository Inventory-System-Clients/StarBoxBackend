module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("carrinho_peca", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      usuario_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "usuarios",
          key: "id",
        },
      },
      peca_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "pecas",
          key: "id",
        },
      },
      quantidade: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      data: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("carrinho_peca");
  },
};
