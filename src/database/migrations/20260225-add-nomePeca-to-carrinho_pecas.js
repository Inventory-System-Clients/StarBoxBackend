"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("carrinho_pecas", "nomePeca", {
      type: Sequelize.STRING(100),
      allowNull: false,
      defaultValue: "",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("carrinho_pecas", "nomePeca");
  },
};
