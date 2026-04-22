import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const RoteiroPontoPulado = sequelize.define(
  "RoteiroPontoPulado",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    roteiroId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "roteiro_id",
      references: {
        model: "Roteiros",
        key: "id",
      },
    },
    lojaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "loja_id",
      references: {
        model: "lojas",
        key: "id",
      },
    },
    data: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    foiPulado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "foi_pulado",
    },
    justificativaEnviada: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "justificativa_enviada",
    },
    justificativa: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    primeiraQuebraEm: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "primeira_quebra_em",
    },
    ultimaQuebraEm: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "ultima_quebra_em",
    },
    primeiroUsuarioId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "primeiro_usuario_id",
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    ultimoUsuarioId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "ultimo_usuario_id",
      references: {
        model: "usuarios",
        key: "id",
      },
    },
  },
  {
    tableName: "roteiro_ponto_pulado",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["roteiro_id", "loja_id", "data"],
      },
      {
        fields: ["roteiro_id", "data"],
      },
    ],
  },
);

export default RoteiroPontoPulado;
