import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const EstoqueUsuario = sequelize.define(
  "EstoqueUsuario",
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
    produtoId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "produtos",
        key: "id",
      },
    },
    quantidade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      comment: "Quantidade em estoque do usuario",
    },
    estoqueMinimo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: "Estoque minimo para alerta do usuario",
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Produto ativo no estoque do usuario",
    },
  },
  {
    tableName: "estoque_usuarios",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["usuarioId", "produtoId"],
      },
    ],
  },
);

export default EstoqueUsuario;
