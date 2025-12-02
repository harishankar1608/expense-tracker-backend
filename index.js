import express from "express";
import dotenv from "dotenv";
import { router } from "./routes/router.js";
import cors from "cors";
import cookieParser from "cookie-parser";

dotenv.config();
const app = express();

app.get("/", (req, res) => {
  return res
    .status(200)
    .send({ message: "Node js application running successfully" });
});

app.get("/health-check", (req, res) => {
  return res.status(200).send({ message: "Node js application healthy" });
});

app.use(cors({ credentials: true, origin: process.env.FRONT_END_URL }));
app.use(express.json());
app.use(cookieParser());

app.use(router);

app.listen(process.env.PORT, () => {
  console.log(`Server is running at PORT ${process.env.PORT}`);
});
