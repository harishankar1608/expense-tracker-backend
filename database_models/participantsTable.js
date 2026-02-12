import { DataTypes } from "sequelize";
import { sequelize } from "../postgres.js";

export const ConversationParticipantsTable = sequelize.define(
  "conversation_participants",
  {
    conversation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: "conversations",
        key: "id",
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primary_key: true,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
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
    tableName: "conversation_participants",
    timestamps: false,
    schema: "public",
  }
);
//participants
//  create table conversation_participants(
//   conversation_id bigint references conversations(id) not null,
//   user_id bigint references users(user_id) not null,
//   role varchar(20) not null,
//   created_at timestamptz default now(),
//   updated_at timestamptz default now(),
//   primary key(conversation_id,user_id)
// )
