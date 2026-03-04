import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const Roteiro = sequelize.define("Roteiro", {
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  funcionarioId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  funcionarioNome: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  diasSemana: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    field: "dias_semana",
    comment: 'Array de dias: ["SEG","TER","QUA","QUI","SEX","SAB","DOM"]',
  },
});

Roteiro.associate = (models) => {
  Roteiro.belongsTo(models.Usuario, {
    as: "funcionario",
    foreignKey: "funcionarioId",
  });
  Roteiro.belongsToMany(models.Loja, {
    through: "RoteiroLojas",
    as: "lojas",
  });
};

export default Roteiro;
