import { Router } from "express";
import {
  loginUser,
  createAccount,
  logoutHandler,
} from "../controller/account.js";
import {
  verifyUserCredentials,
  verifyUserMiddleWare,
} from "../controller/authenticate.js";
import {
  createFriendRequest,
  findFriendsWithEmail,
  findUsersForFriendRequest,
} from "../controller/user.js";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  getMyRequests,
  getRequestedList,
  rejectFriendRequest,
} from "../controller/request.js";
import {
  addExpense,
  getFriendsExpense,
  getSelfExpenses,
} from "../controller/expense.js";
import {
  createConversation,
  getAllConversations,
  getAllMessagesInConversation,
  markMessageRead,
  sendMessage,
  getConversationUnreadCount,
} from "../controller/message.js";
export const router = Router();

// router.get('/test-db-connection', testDbConnection);

router.post("/create-account", createAccount);

router.post("/login", loginUser);

router.get("/authenticate-user", verifyUserCredentials);

//authenticated route
router.use(verifyUserMiddleWare);

router.get("/find-users", findUsersForFriendRequest);

router.post("/send-friend-request", createFriendRequest);

router.get("/requested-list", getRequestedList);

router.get("/friend-requests", getMyRequests);

router.put("/accept-request", acceptFriendRequest);

router.put("/cancel-request", cancelFriendRequest);

router.put("/reject-request", rejectFriendRequest);

router.get("/find-friends", findFriendsWithEmail);

router.post("/add-expense", addExpense);

router.get("/get-friend-expenses", getFriendsExpense);

router.get("/get-self-expenses", getSelfExpenses);

//messaging
router.post("/start-conversation", createConversation);

router.get("/conversations", getAllConversations);

router.get("/messages", getAllMessagesInConversation);

router.post("/message", sendMessage);

router.post("/read-message", markMessageRead);

router.get("/conversation-unreads", getConversationUnreadCount);

router.get("/logout", logoutHandler);

// CREATE TABLE expense_table(lender BIGINT REFERENCES user_table(user_id) NULL, borrower BIGINT REFERENCES user_table(user_id), expense_date TIMESTAMPTZ NOT NULL, added_by BIGINT REFERENCES user_table(user_id), created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
