import { Op } from "sequelize";
import {
  ConversationParticipantsTable,
  ConversationTable,
  MessagesTable,
  MessageReadsTable,
} from "../../database_models/index.js";

const getAllParticipants = (conversationId) => {
  return ConversationParticipantsTable.findAll({
    where: { conversation_id: conversationId },
    attributes: ["user_id"],
  });
};

const getAllMessages = (conversationId) => {
  return MessagesTable.findAll({
    where: { conversation_id: conversationId },
    order: [["sent_at", "ASC"]],
    attributes: [
      "id",
      "conversation_id",
      "content",
      "type",
      "edited",
      "is_deleted",
      "sender_id",
      "sent_at",
    ],
  });
};

const getMessageReads = (messageIds, currentUser) => {
  return MessageReadsTable.findAll({
    where: {
      message_id: { [Op.in]: messageIds },
      user_id: currentUser,
    },
    attributes: ["message_id", "read", "user_id"],
  });
};

export default { getAllParticipants, getAllMessages, getMessageReads };
