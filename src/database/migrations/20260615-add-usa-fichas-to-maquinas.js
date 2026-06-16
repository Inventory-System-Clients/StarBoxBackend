export default {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("maquinas", "usa_fichas", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("maquinas", "usa_fichas");
  },
};
