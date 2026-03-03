import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const Manutencao = sequelize.define(
  "Manutencao",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "pendente",
    },
    lojaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "lojas",
        key: "id",
      },
    },
    maquinaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "maquinas",
        key: "id",
      },
    },
    funcionarioId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    roteiroId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "roteiros",
        key: "id",
      },
    },
    criadoPorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    concluidoPorId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    concluidoEm: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "manutencoes",
    timestamps: true,
  },
);

export default Manutencao;
