import {
  ConversationParticipantsTable,
  ConversationTable,
} from "../../database_models/index.js";

const getConversationWithParticipant = (conversationId, userId) => {
  return ConversationTable.findByPk(conversationId, {
    attributes: ["id"],
    include: [
      {
        model: ConversationParticipantsTable,
        as: "conversation_participant",
        attributes: ["user_id"],
        where: { user_id: userId },
      },
    ],
  });
};

const findParticipantsInConversation = (conversationId, userId) => {
  return ConversationParticipantsTable.findAll({
    where: {
      user_id: {
        [Op.not]: userId,
      },
      conversation_id: conversationId,
    },
    attributes: ["user_id"],
  });
};

const createMessage = (payload) => {
  return MessagesTable.create(payload);
};

const updateConversationWithMessage = (conversationId, lastMessageId) => {
  return ConversationTable.update(
    { last_message_id: lastMessageId },
    {
      where: {
        id: conversationId,
      },
    }
  );
};

export default {
  getConversationWithParticipant,
  findParticipantsInConversation,
  createMessage,
  updateConversationWithMessage,
};
