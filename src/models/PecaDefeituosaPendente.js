import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const PecaDefeituosaPendente = sequelize.define(
  "PecaDefeituosaPendente",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    usuarioId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    manutencaoId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "manutencoes",
        key: "id",
      },
    },
    pecaOriginalId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "pecas",
        key: "id",
      },
    },
    nomePecaOriginal: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    nomePecaDefeituosa: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    quantidade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: "pecas_defeituosas_pendentes",
    timestamps: true,
  },
);

export default PecaDefeituosaPendente;
