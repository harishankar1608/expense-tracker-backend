import express from "express";
import dotenv from "dotenv";
import { router } from "./routes/router.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { WebSocket, WebSocketServer } from "ws";
import { decodeUserId } from "./utils.js/decode.js";
import { validateFriends, validateUser } from "./utils.js/validate.js";
import { ulid } from "ulid";
import { handleSendMessage } from "./controller/webSocket/message.js";

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

const server = app.listen(process.env.PORT, () => {
  console.log(`Server is running at PORT ${process.env.PORT}`);
});

const wss = new WebSocketServer({ server, path: "/messages" });

const users = new Map(); // {user_id: socket}

wss.on("connection", async (ws, req) => {
  const headerCookies = req.headers.cookie || "";
  const cookies = headerCookies.split(";") || [];
  const sessionIdCookie = cookies.find(
    (cookie) => cookie.trim().split("=")[0] === "session_id"
  );

  if (!sessionIdCookie) {
    console.log("No session id found for user");
    ws.close(3003, { message: "No session id found for user" });
    return;
  }

  const sessionId = sessionIdCookie.split("=")[1];

  const userId = decodeUserId(sessionId);

  if (!userId) {
    console.log("No user found 1");
    ws.close(3003, { message: "No user found" });
    return;
  }

  if (!(await validateUser(userId))) {
    console.log("No user found 2");
    ws.close(3003, { message: "No user found" });
    return;
  }

  users.set(userId, ws);

  ws.on("message", async (rawEvent) => {
    //parse message data
    const eventString = rawEvent.toString();
    const eventData = JSON.parse(eventString);

    console.log(eventData, "Message Data");

    // { requestType:'send_message' , data:{to: '3', message: 'Hello JErry', conversationId: null} }
    switch (eventData.requestType) {
      case "send_message":
        await handleSendMessage(ws, users, eventData.data, userId);
        break;
    }

    // ws.send(JSON.stringify({ status: true, id: messageId }));

    //store message in db
  });

  ws.on("close", () => {
    users.delete(userId);
  });
});

//message table
//id- ulid
//from - user relation
//conversation_id - 'dm_u1_u2' || `group_123`
//message - 65356 character
//sent_at - timestamp
//edited- boolean
//is_deleted - boolean
//created_at - timestamp
//updated at - timestamp

//read table
//message_id- ulid from message table
//receiver - user_id
//read - boolean
//created_at - timestamp
//updated_at - timestamp
