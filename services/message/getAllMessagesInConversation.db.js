import {
  ConversationParticipantsTable,
  ConversationTable,
} from "../../database_models/index.js";

const validateParticipant = (conversationId, currentUser) => {
  return ConversationTable.findByPk(conversationId, {
    attributes: ["id"],
    include: [
      {
        model: ConversationParticipantsTable,
        as: "conversation_participant",
        attributes: ["user_id"],
        where: { user_id: currentUser },
      },
    ],
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

export default { validateParticipant, getAllMessages, getMessageReads };
