import { UserTable } from "./userTable.js";
import { RequestTable } from "./requestTable.js";
import { ExpenseTable } from "./expenseTable.js";
import { ConversationTable } from "./conversationTable.js";
import { ConversationParticipantsTable } from "./participantsTable.js";
import { MessagesTable } from "./messagesTable.js";
import { MessageReadsTable } from "./messageReadsTable.js";

// UserTable.hasMany(RequestTable);
// RequestTable.belongsTo(UserTable);

ConversationTable.hasMany(ConversationParticipantsTable, {
  foreignKey: "conversation_id",
  as: "conversation_participant",
});
ConversationParticipantsTable.belongsTo(ConversationTable, {
  foreignKey: "conversation_id",
  as: "conversation",
});

UserTable.hasMany(ConversationTable, {
  as: "created_by_user",
  foreignKey: "created_by",
});
ConversationTable.belongsTo(UserTable, {
  as: "create_by_user",
  foreignKey: "created_by",
});

UserTable.hasMany(ConversationParticipantsTable, {
  as: "user",
  foreignKey: "user_id",
});
ConversationParticipantsTable.belongsTo(UserTable, {
  as: "user",
  foreignKey: "user_id",
});

UserTable.hasMany(ExpenseTable, {
  as: "lender_user",
  foreignKey: "lender",
});
ExpenseTable.belongsTo(UserTable, {
  as: "lender_user",
  foreignKey: "lender",
});

UserTable.hasMany(ExpenseTable, {
  as: "borrower_user",
  foreignKey: "borrower",
});
ExpenseTable.belongsTo(UserTable, {
  as: "borrower_user",
  foreignKey: "borrower",
});

UserTable.hasMany(MessagesTable, {
  as: "sender_user",
  foreignKey: "sender_id",
});
MessagesTable.belongsTo(UserTable, {
  as: "sender_user",
  foreignKey: "sender_id",
});

ConversationTable.hasMany(MessagesTable, {
  as: "message_conversation",
  foreignKey: "conversation_id",
});
MessagesTable.belongsTo(ConversationTable, {
  as: "message_conversation",
  foreignKey: "conversation_id",
});

MessagesTable.hasOne(ConversationTable, {
  as: "last_message",
  foreignKey: "last_message_id",
});
ConversationTable.belongsTo(MessagesTable, {
  as: "last_message",
  foreignKey: "last_message_id",
});

export {
  UserTable,
  RequestTable,
  ExpenseTable,
  ConversationTable,
  ConversationParticipantsTable,
  MessagesTable,
  MessageReadsTable,
};
