import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

// US02 - Controle de Permissões (RBAC)
// Define quais lojas cada funcionário pode acessar
const UsuarioLoja = sequelize.define(
  "UsuarioLoja",
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
    lojaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "lojas",
        key: "id",
      },
    },
    permissoes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        visualizar: true,
        editar: false,
        registrarMovimentacao: true,
      },
    },
  },
  {
    tableName: "usuario_lojas",
    timestamps: true,
  }
);

export default UsuarioLoja;
