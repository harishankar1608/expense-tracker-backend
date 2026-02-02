import { Op } from "sequelize";
import {
  ConversationParticipantsTable,
  MessagesTable,
  MessageReadsTable,
} from "../../database_models/index.js";

const getMessagesWithIds = (messageIds) => {
  return MessagesTable.findAll({
    where: {
      id: {
        [Op.in]: messageIds,
      },
    },
    attributes: ["conversation_id", "id"],
  });
};

const getExistingReadMessages = (messageIds, userId) => {
  return MessageReadsTable.findAll({
    where: {
      message_id: {
        [Op.in]: messageIds,
      },
      user_id: userId,
    },
    attributes: ["message_id", "id"],
  });
};

const getConversationParticipant = (conversations, userId) => {
  return ConversationParticipantsTable.findAll({
    where: {
      user_id: userId,
      conversation_id: {
        [Op.in]: conversations,
      },
    },
    attributes: ["conversation_id"],
  });
};

const bulkCreateMessageReads = (payload) => {
  return MessageReadsTable.bulkCreate(payload);
};

export default {
  getMessagesWithIds,
  getExistingReadMessages,
  getConversationParticipant,
  bulkCreateMessageReads,
};
