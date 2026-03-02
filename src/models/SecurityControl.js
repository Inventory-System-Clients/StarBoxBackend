import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const SecurityControl = sequelize.define(
  "SecurityControl",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: false,
      defaultValue: 1,
    },
    isLocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    authVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: "security_control",
    timestamps: true,
  },
);

export default SecurityControl;
