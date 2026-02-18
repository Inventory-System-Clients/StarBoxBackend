import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";
import bcrypt from "bcryptjs";

const Usuario = sequelize.define(
  "Usuario",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nome: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    senha: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("ADMIN", "FUNCIONARIO", "GERENCIADOR"),
      allowNull: false,
      defaultValue: "FUNCIONARIO",
    },
    telefone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "usuarios",
    timestamps: true,
    hooks: {
      beforeCreate: async (usuario) => {
        if (usuario.senha) {
          usuario.senha = await bcrypt.hash(usuario.senha, 10);
        }
      },
      beforeUpdate: async (usuario) => {
        if (usuario.changed("senha")) {
          usuario.senha = await bcrypt.hash(usuario.senha, 10);
        }
      },
    },
  }
);

// Método para verificar senha
Usuario.prototype.verificarSenha = async function (senha) {
  return await bcrypt.compare(senha, this.senha);
};

// Método para esconder senha ao serializar
Usuario.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.senha;
  return values;
};

export default Usuario;
