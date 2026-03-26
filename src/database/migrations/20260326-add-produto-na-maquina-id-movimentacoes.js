export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("movimentacoes", "produto_na_maquina_id", {
    type: Sequelize.UUID,
    allowNull: true,
    references: {
      model: "produtos",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });

  await queryInterface.addIndex("movimentacoes", ["produto_na_maquina_id"], {
    name: "idx_movimentacoes_produto_na_maquina_id",
  });
}

export async function down(queryInterface) {
  await queryInterface.removeIndex(
    "movimentacoes",
    "idx_movimentacoes_produto_na_maquina_id",
  );
  await queryInterface.removeColumn("movimentacoes", "produto_na_maquina_id");
}
