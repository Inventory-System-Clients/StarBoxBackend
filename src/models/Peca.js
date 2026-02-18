import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const Peca = sequelize.define(
  "Peca",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nome: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    categoria: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    quantidade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    preco: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "pecas",
    timestamps: true,
  }
);

export default Peca;
