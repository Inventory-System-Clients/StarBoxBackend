export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("maquinas", "comissao_loja_percentual", {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Percentual de comissão da loja (0-100%)",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("maquinas", "comissao_loja_percentual");
  },
};
