import { Op, Sequelize } from "sequelize";
import {
  ConversationParticipantsTable,
  ConversationTable,
  MessagesTable,
} from "../../database_models/index.js";
import { CONVERSATION_TYPE } from "../../enum/messages.js";

const findConversationParticipants = (currentUser, friendId) => {
  return ConversationParticipantsTable.findAll({
    where: {
      user_id: {
        [Op.in]: [friendId, currentUser],
      },
    },
    attributes: ["conversation_id"],
    group: ["conversation_id"],
    having: Sequelize.literal("COUNT(user_id)=2"),
  });
};

const getAllDmsWithConversationIds = (conversationsId) => {
  return ConversationTable.findAll({
    where: {
      id: {
        [Op.in]: conversationsId,
      },
      type: CONVERSATION_TYPE.DM,
    },
  });
};

const createConversation = (createdBy) => {
  return ConversationTable.create({
    created_by: createdBy,
    type: CONVERSATION_TYPE.DM,
  });
};

const createConversationParticipants = (payload) => {
  return ConversationParticipantsTable.bulkCreate(payload);
};

const createDefaultMessage = (payload) => {
  return MessagesTable.create(payload);
};

const updateConversationWithDefaultMessage = (conversationId, messageId) => {
  return ConversationTable.update(
    { last_message_id: messageId },
    {
      where: {
        id: conversationId,
      },
    }
  );
};

const getSenderData = (currentUser) => {
  return UserTable.findByPk(currentUser, {
    attributes: ["email", "user_id", "name"],
  });
};

export default {
  findConversationParticipants,
  getAllDmsWithConversationIds,
  createConversation,
  createConversationParticipants,
  createDefaultMessage,
  updateConversationWithDefaultMessage,
  getSenderData,
};
