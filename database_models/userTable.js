import { DataTypes } from "sequelize";
import { sequelize } from "../postgres.js";

export const UserTable = sequelize.define(
  "users",
  {
    email: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.STRING,
      autoIncrement: true,
      primaryKey: true,
    },
    profile_picture: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: Date.now(),
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: Date.now(),
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: false,
    schema: "public",
  }
);
