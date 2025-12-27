import { Op, Sequelize } from "sequelize";
// import { ConversationParticipantsTable } from "../database_models/participantsTable.js";
// import { ConversationTable } from "../database_models/conversationTable.js";
import {
  ConversationTable,
  ConversationParticipantsTable,
  MessagesTable,
  UserTable,
} from "../database_models/index.js";

import { CONVERSATION_TYPE, PARTICIPANT_ROLE } from "../enum/messages.js";

export const createConversation = async (req, res) => {
  try {
    const { friendId, userId: currentUser } = req.body;
    // const currentUser = req.userId;

    const participants = await ConversationParticipantsTable.findAll({
      where: {
        user_id: {
          [Op.in]: [friendId, currentUser],
        },
      },
      attributes: ["conversation_id"],
      group: ["conversation_id"],
      having: Sequelize.literal("COUNT(user_id)=2"),
    });

    const participantsId = participants.map((c) => c.conversation_id);

    const dms = await ConversationTable.findAll({
      where: { id: participantsId, type: CONVERSATION_TYPE.DM },
    });
    if (dms.length > 0)
      return res.status(400).send({ message: "Conversation already exist" });

    const conversationData = await ConversationTable.create({
      created_by: currentUser,
      type: CONVERSATION_TYPE.DM,
    });

    await ConversationParticipantsTable.bulkCreate([
      {
        conversation_id: conversationData.id,
        user_id: currentUser,
        role: PARTICIPANT_ROLE.USER,
      },
      {
        conversation_id: conversationData.id,
        user_id: friendId,
        role: PARTICIPANT_ROLE.USER,
      },
    ]);

    return res.status(201).send({ conversation: conversationData });
  } catch (error) {
    console.log(error, "Error");
    return res.status(500).send({ message: "Something went wrong" });
  }
};

export const getAllConversations = async (req, res) => {
  try {
    // const { userId } = req.query;
    const userId = 1;
    const conversationParticipants =
      await ConversationParticipantsTable.findAll({
        where: {
          user_id: userId,
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
                    [Op.not]: userId,
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

    const conversations = [];
    const friendUserIds = new Set();

    conversationParticipants.forEach((conversation) => {
      const uIds =
        conversation.dataValues.conversation.conversation_participant.map(
          (participant) => participant.user_id
        );
      friendUserIds.add(...uIds);

      //normalise conversation data into simpler format
      conversations.push({
        conversation_id: conversation.dataValues.conversation_id,
        participant_id:
          conversation?.dataValues?.conversation?.conversation_participant?.[0]
            ?.user_id,
        type: conversation.dataValues.conversation.type,
        last_message: conversation.dataValues.conversation.last_message,
      });
    });

    const friends = await UserTable.findAll({
      where: {
        user_id: {
          [Op.in]: Array.from(friendUserIds),
        },
      },
      attributes: ["email", "user_id", "name"],
    });

    const friendsData = friends.reduce(
      (acc, friend) => ({
        ...acc,
        [friend.dataValues.user_id]: {
          email: friend.dataValues.email,
          name: friend.dataValues.name,
        },
      }),
      {}
    );

    return res.status(200).send({ conversations, friends: friendsData });
  } catch (error) {
    console.log(error, "Error,");
    return res.status(500).send({ message: "Error" });
  }
};
