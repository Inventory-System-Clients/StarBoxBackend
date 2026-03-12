import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const ManutencaoWhatsAppPrompt = sequelize.define(
  "ManutencaoWhatsAppPrompt",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    manutencaoId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "manutencao_id",
    },
    lojaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "loja_id",
    },
    maquinaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "maquina_id",
    },
    roteiroId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "roteiro_id",
    },
    funcionarioId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "funcionario_id",
    },
    criadoPorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "criado_por_id",
    },
    destinatarioTelefone: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: "destinatario_telefone",
    },
    mensagem: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    whatsappUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "whatsapp_url",
    },
    origemResponsavel: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "nao_encontrado",
      field: "origem_responsavel",
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "manutencao_whatsapp_prompts",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

export default ManutencaoWhatsAppPrompt;
