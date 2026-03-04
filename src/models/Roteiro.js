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
    field: "funcionarioId",
  },
  funcionarioNome: {
    type: DataTypes.STRING,
    allowNull: true,
    field: "funcionarioNome",
  },
  diasSemana: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    field: "dias_semana",
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
