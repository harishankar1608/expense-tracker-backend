import { DataTypes } from 'sequelize';
import { sequelize } from '../postgres.js';

export const ExpenseTable = sequelize.define(
  'expense_table',
  {
    //     CREATE TABLE expense_table(
    //   lender BIGINT REFERENCES user_table(user_id) NULL,
    //   borrower BIGINT REFERENCES user_table(user_id) NOT NULL,
    //   amount BIGINT NOT NULL,
    //   description VARCHAR(100),
    //   category VARCHAR(50),
    //   group_id VARCHAR(50),
    //   expense_date DATE NOT NULL,
    //   added_by BIGINT REFERENCES user_table(user_id) NOT NULL,
    //   created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    //   updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    // );
    expense_id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    lender: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'user_table',
        key: 'user_id',
      },
    },
    borrower: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user_table',
        key: 'user_id',
      },
    },
    amount: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    group_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expense_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    added_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user_table',
        key: 'user_id',
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
  {
    tableName: 'expense_table',
    timestamps: false,
    schema: 'public',
  }
);
