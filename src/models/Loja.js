import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const Loja = sequelize.define(
  "Loja",
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
    endereco: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    numero: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    bairro: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    cidade: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    estado: {
      type: DataTypes.STRING(2),
      allowNull: true,
    },
    responsavel: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    telefone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isDepositoPrincipal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_deposito_principal",
      comment: "Indica se esta loja é o depósito principal que distribui para todas as outras",
    },
  },
  {
    tableName: "lojas",
    timestamps: true,
  },
);

export default Loja;
