export default {
  up: async (queryInterface, Sequelize) => {
    // Alterar tipo de quantidade_notas_entrada de INTEGER para DECIMAL(10,2)
    // para aceitar valores float enviados pelo frontend
    await queryInterface.changeColumn("movimentacoes", "quantidade_notas_entrada", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: "Quantidade/valor de notas inseridas na máquina",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("movimentacoes", "quantidade_notas_entrada", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: "Quantidade de notas inseridas na máquina",
    });
  },
};
