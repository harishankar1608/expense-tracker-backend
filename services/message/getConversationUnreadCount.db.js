import { Op } from "sequelize";
import {
  MessageReadsTable,
  MessagesTable,
} from "../../database_models/index.js";

const getMessagesCount = (conversationId, currentUser) => {
  return MessagesTable.count({
    where: {
      conversation_id: conversationId,
      sender_id: {
        [Op.not]: currentUser,
      },
    },
  });
};

const getReadMessagesCount = (conversationId, currentUser) => {
  return MessageReadsTable.count({
    where: {
      conversation_id: conversationId,
      user_id: currentUser,
    },
  });
};

export default { getMessagesCount, getReadMessagesCount };
