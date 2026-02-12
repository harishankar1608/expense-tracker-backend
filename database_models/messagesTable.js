import { DataTypes } from "sequelize";
import { sequelize } from "../postgres.js";

export const MessagesTable = sequelize.define(
  "messages",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    conversation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "conversations",
        key: "id",
      },
    },
    content: {
      type: DataTypes.STRING(65535),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "TEXT",
    },
    edited: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Date.now(),
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
  { tableName: "messages", timestamps: false, schema: "public" }
);

//messages
//  create table messages(
//   id varchar(26) primary key not null,
//   conversation_id bigint references conversations(id) not null,
//   content varchar(65535) not null,
//   type varchar(20) default 'message',
//   edited boolean default false,
//   is_deleted default false,
//   sender_id bigint references users(user_id) not null,
//   sent_at timestamptz default now(),
//   created_at timestamptz default now(),
//   updated_at timestamptz default now()
//  )
