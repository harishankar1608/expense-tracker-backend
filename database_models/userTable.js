import { DataTypes } from 'sequelize';
import { sequelize } from '../postgres.js';
import { RequestTable } from './requestTable.js';

export const UserTable = sequelize.define(
  'user_table',
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
    tableName: 'user_table',
    timestamps: false,
    schema: 'public',
  }
);
