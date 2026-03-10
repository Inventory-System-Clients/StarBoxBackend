import { DataTypes } from "sequelize";

export const up = async (queryInterface) => {
  // Adicionar campos de controle de revisão
  await queryInterface.addColumn("veiculos", "km_inicial_cadastro", {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "KM do veículo quando foi cadastrado no sistema",
  });

  await queryInterface.addColumn("veiculos", "proxima_revisao_km", {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Próximo KM que o veículo deve fazer revisão (múltiplo de 10.000)",
  });

  await queryInterface.addColumn("veiculos", "ultima_revisao_km", {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Último KM em que foi feita revisão",
  });

  // Inicializar km_inicial_cadastro com o km atual de cada veículo
  await queryInterface.sequelize.query(`
    UPDATE veiculos 
    SET 
      km_inicial_cadastro = km,
      proxima_revisao_km = ((km / 10000) + 1) * 10000
    WHERE km_inicial_cadastro IS NULL
  `);
};

export const down = async (queryInterface) => {
  await queryInterface.removeColumn("veiculos", "km_inicial_cadastro");
  await queryInterface.removeColumn("veiculos", "proxima_revisao_km");
  await queryInterface.removeColumn("veiculos", "ultima_revisao_km");
};
