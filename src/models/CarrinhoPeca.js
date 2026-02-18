import { Usuario } from "../models/index.js";

// Carrinho de peças: cada usuário tem um array de peças (id, quantidade)
// Simples implementação em tabela separada (ideal: model CarrinhoPeca)
import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const CarrinhoPeca = sequelize.define(
  "CarrinhoPeca",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    pecaId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quantidade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: "carrinho_pecas",
    timestamps: true,
  }
);

export default CarrinhoPeca;
