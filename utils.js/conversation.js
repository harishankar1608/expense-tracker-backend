import { Op } from "sequelize";
import {
  ConversationParticipantsTable,
  ConversationTable,
} from "../database_models/index.js";
import { CONVERSATION_TYPE } from "../enum/messages.js";

export const findConversation = async (currentUser, friendsId) => {
  try {
    const conversations = await ConversationParticipantsTable.findAll({
      where: { user_id: currentUser },
      attributes: ["conversation_id"],
      include: [
        {
          model: ConversationTable,
          as: "conversation",
          where: { type: CONVERSATION_TYPE.DM },
          attributes: ["id"],
          include: [
            {
              model: ConversationParticipantsTable,
              as: "conversation_participant",
              where: {
                user_id: {
                  [Op.in]: friendsId,
                },
              },
              attributes: ["user_id"],
            },
          ],
        },
      ],
    });

    //{friend_id: conversation_id}
    const conversationData = conversations.reduce((obj, conversation) => {
      obj.set(
        conversation.conversation.conversation_participant[0].user_id,
        conversation.conversation_id
      );
      return obj;
    }, new Map());

    return conversationData;
  } catch (error) {
    console.log(error, "Erro");
    //log error here
    return new Map();
  }
};
