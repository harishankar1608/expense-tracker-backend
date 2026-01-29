import { Op, Sequelize } from "sequelize";
import {
  ConversationParticipantsTable,
  ConversationTable,
  MessagesTable,
  UserTable,
} from "../../database_models/index.js";
import { CONVERSATION_TYPE } from "../../enum/messages.js";
import { MessageReadsTable } from "../../database_models/messageReadsTable.js";

const getAllDmParticipants = (currentUser) => {
  return ConversationParticipantsTable.findAll({
    where: {
      user_id: currentUser,
    },
    include: [
      {
        model: ConversationTable,
        as: "conversation",
        where: {
          type: CONVERSATION_TYPE.DM,
        },
        include: [
          {
            model: ConversationParticipantsTable,
            as: "conversation_participant",
            where: {
              user_id: {
                [Op.not]: currentUser,
              },
            },
            attributes: ["user_id"],
          },
          {
            model: MessagesTable,
            as: "last_message",
            attributes: ["content", "type", "sender_id"],
            order: [["sent_at", "DESC"]],
          },
        ],
      },
    ],
  });
};

const getAllMessageCountForConversation = (conversationIds, currentUser) => {
  return MessagesTable.findAll({
    where: {
      conversation_id: {
        [Op.in]: conversationIds,
      },
      sender_id: {
        [Op.not]: currentUser,
      },
    },
    group: "conversation_id",
    attributes: [
      "conversation_id",
      [Sequelize.fn("COUNT", Sequelize.col("conversation_id")), "count"],
    ],
  });
};

const getReadMessageCountForConversation = (conversationIds, currentUser) => {
  return MessageReadsTable.findAll({
    where: {
      conversation_id: {
        [Op.in]: conversationIds,
      },
      user_id: currentUser,
    },
    group: "conversation_id",
    attributes: [
      "conversation_id",
      [Sequelize.fn("COUNT", Sequelize.col("conversation_id")), "count"],
    ],
  });
};

const getFriendsData = (friendsId) => {
  return UserTable.findAll({
    where: {
      user_id: {
        [Op.in]: friendsId,
      },
    },
    attributes: ["email", "user_id", "name"],
  });
};

export default {
  getAllDmParticipants,
  getAllMessageCountForConversation,
  getReadMessageCountForConversation,
  getFriendsData,
};
