/**
 * Migration: KM inicial semanal da execucao do roteiro
 * Data: 2026-05-12
 */

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn("roteiro_execucao_semanal", "veiculo_id", {
    type: Sequelize.UUID,
    allowNull: true,
    references: {
      model: "veiculos",
      key: "id",
    },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  });

  await queryInterface.addColumn(
    "roteiro_execucao_semanal",
    "km_inicial_veiculo",
    {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  );

  await queryInterface.addColumn(
    "roteiro_execucao_semanal",
    "km_inicial_registrado_em",
    {
      type: Sequelize.DATE,
      allowNull: true,
    },
  );

  await queryInterface.addIndex(
    "roteiro_execucao_semanal",
    ["veiculo_id"],
    {
      name: "idx_roteiro_execucao_semanal_veiculo_id",
    },
  );
};

export const down = async (queryInterface) => {
  await queryInterface.removeIndex(
    "roteiro_execucao_semanal",
    "idx_roteiro_execucao_semanal_veiculo_id",
  );
  await queryInterface.removeColumn(
    "roteiro_execucao_semanal",
    "km_inicial_registrado_em",
  );
  await queryInterface.removeColumn(
    "roteiro_execucao_semanal",
    "km_inicial_veiculo",
  );
  await queryInterface.removeColumn("roteiro_execucao_semanal", "veiculo_id");
};
