import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

export const sequelize = new Sequelize(process.env.PG_DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  dialectOptions: {
    ssl: process.env.ENVIRONMENT === "production" && {
      require: true,
      rejectUnauthorized: false,
    },
  }, //Allow ssl connection only in deployed enviroments
});
