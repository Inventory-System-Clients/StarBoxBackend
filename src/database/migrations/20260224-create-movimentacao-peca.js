module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("movimentacao_pecas", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("uuid_generate_v4()"),
        primaryKey: true,
        allowNull: false,
      },
      movimentacaoId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "movimentacaos", key: "id" },
        onDelete: "CASCADE",
      },
      pecaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "pecas", key: "id" },
        onDelete: "CASCADE",
      },
      quantidade: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      nome: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("movimentacao_pecas");
  },
};
