import { DataTypes } from "sequelize";
import { sequelize } from "../postgres.js";

export const ConversationTable = sequelize.define(
  "conversations",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    last_message_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "messages",
        key: "id",
      },
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
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
  { tableName: "conversations", timestamps: false, schema: "public" }
);
//conversation table
// create table conversations(
//   id bigserial primary key not null,
//   type varchar(10),
//   created_at timestamptz default now(),
//   updated_at timestamptz default now()
// )
