import { DataTypes } from "sequelize";
import { sequelize } from "../postgres.js";

export const MessageReadsTable = sequelize.define(
  "message_reads",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    conversation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "conversations", key: "id" },
    },
    message_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "messages", key: "id" },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "user_id" },
    },
    read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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
    tableName: "message_reads",
    timestamps: false,
    schema: "public",
  }
);
