import { DataTypes } from "sequelize";

export const up = async (queryInterface) => {
  await queryInterface.addColumn("veiculos", "intervalo_revisao_km", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10000,
    comment: "Intervalo em KM para disparar alerta de revisão por veículo",
  });

  await queryInterface.sequelize.query(`
    UPDATE veiculos
    SET intervalo_revisao_km = 10000
    WHERE intervalo_revisao_km IS NULL OR intervalo_revisao_km <= 0
  `);

  await queryInterface.sequelize.query(`
    UPDATE veiculos
    SET proxima_revisao_km = ((km / intervalo_revisao_km) + 1) * intervalo_revisao_km
    WHERE proxima_revisao_km IS NULL
  `);
};

export const down = async (queryInterface) => {
  await queryInterface.removeColumn("veiculos", "intervalo_revisao_km");
};
