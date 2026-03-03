import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const WhatsAppAlerta = sequelize.define(
  "WhatsAppAlerta",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tipo: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    mensagem: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    destinatario: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pendente", "enviado", "erro"),
      allowNull: false,
      defaultValue: "pendente",
    },
    erro: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    referenciaTipo: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: "referencia_tipo",
    },
    referenciaId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "referencia_id",
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    enviadoEm: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "enviado_em",
    },
  },
  {
    tableName: "whatsapp_alertas",
    timestamps: true,
  },
);

export default WhatsAppAlerta;
