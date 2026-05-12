import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const valorVazio = (valor) =>
  valor === null || valor === undefined || String(valor).trim() === "";

const manterFuncionarioAnteriorAoLimpar = (roteiro) => {
  const funcionarioAnterior = roteiro.previous("funcionarioId");

  if (
    roteiro.changed("funcionarioId") &&
    valorVazio(roteiro.funcionarioId) &&
    !valorVazio(funcionarioAnterior)
  ) {
    roteiro.funcionarioId = funcionarioAnterior;
    roteiro.funcionarioNome = roteiro.previous("funcionarioNome");
  }
};

const Roteiro = sequelize.define(
  "Roteiro",
  {
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "observacao",
    },
    orcamentoDiario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 2000,
      field: "orcamento_diario",
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
    veiculoId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "veiculoId",
    },
    diasSemana: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      field: "dias_semana",
    },
  },
  {
    hooks: {
      beforeValidate: manterFuncionarioAnteriorAoLimpar,
      beforeUpdate: manterFuncionarioAnteriorAoLimpar,
    },
  },
);

Roteiro.associate = (models) => {
  Roteiro.belongsTo(models.Usuario, {
    as: "funcionario",
    foreignKey: "funcionarioId",
  });
  Roteiro.belongsTo(models.Veiculo, {
    as: "veiculo",
    foreignKey: "veiculoId",
  });
  Roteiro.belongsToMany(models.Loja, {
    through: models.RoteiroLoja,
    foreignKey: "RoteiroId",
    otherKey: "LojaId",
    as: "lojas",
  });
};

export default Roteiro;
