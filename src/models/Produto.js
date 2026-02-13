import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const Produto = sequelize.define(
  "Produto",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    codigo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      comment: "Código do produto para identificação",
    },
    nome: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    categoria: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Ex: Pelúcia, Boneco, Chaveiro",
    },
    tamanho: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: "Ex: Pequeno, Médio, Grande",
    },
    emoji: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: "Emoji visual do produto",
    },
    preco: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: "Preço de venda",
    },
    custoUnitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: "Custo do produto",
    },
    estoqueAtual: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: "Estoque atual disponível",
    },
    estoqueMinimo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: "Estoque mínimo para alertas",
    },
    imagemUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "produtos",
    timestamps: true,
  }
);

export default Produto;
