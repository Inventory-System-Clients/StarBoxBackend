// Migration para adicionar roteiroId em Movimentacao

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("movimentacoes", "roteiroId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "Roteiros",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("movimentacoes", "roteiroId");
  },
};
