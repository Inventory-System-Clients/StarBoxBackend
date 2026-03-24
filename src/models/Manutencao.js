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
    explicacao_nao_fazer: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    explicacao_sem_peca: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    verificadoPorId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "usuarios",
        key: "id",
      },
    },
    verificadoEm: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    pecaUsadaId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "pecas",
        key: "id",
      },
    },
    quantidadePecaUsada: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "manutencoes",
    timestamps: true,
  },
);

export default Manutencao;
