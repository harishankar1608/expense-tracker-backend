import { DataTypes } from 'sequelize';
import { sequelize } from '../postgres.js';

export const RequestTable = sequelize.define(
  'request_table',
  {
    request_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    user1: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user_table',
        key: 'user_id',
      },
    },
    user2: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user_table',
        key: 'user_id',
      },
    },
    status: {
      //requested, accepted, cancelled, rejected, blocked
      type: DataTypes.STRING,
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
    tableName: 'request_table',
    timestamps: false,
    schema: 'public',
  }
);
