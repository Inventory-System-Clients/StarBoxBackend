export default {
  up: async (queryInterface, Sequelize) => {
    const tabela = await queryInterface.describeTable("movimentacoes");

    if (!tabela.contador_in) {
      await queryInterface.addColumn("movimentacoes", "contador_in", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!tabela.contador_out) {
      await queryInterface.addColumn("movimentacoes", "contador_out", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    const tabela = await queryInterface.describeTable("movimentacoes");

    if (tabela.contador_in) {
      await queryInterface.removeColumn("movimentacoes", "contador_in");
    }

    if (tabela.contador_out) {
      await queryInterface.removeColumn("movimentacoes", "contador_out");
    }
  },
};

