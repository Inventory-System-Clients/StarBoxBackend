import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Roteiro = sequelize.define("Roteiro", {
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    funcionarioId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    funcionarioNome: {
      type: DataTypes.STRING,
      allowNull: true,
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

  return Roteiro;
};
