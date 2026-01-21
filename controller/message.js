import { Op, Sequelize } from "sequelize";
import {
  ConversationTable,
  ConversationParticipantsTable,
  MessagesTable,
  UserTable,
} from "../database_models/index.js";

import {
  CONVERSATION_TYPE,
  DEFAULT_MESSAGE,
  MESSAGE_TYPE,
  PARTICIPANT_ROLE,
} from "../enum/messages.js";
import { users } from "./webSocket/users.js";
import { MessageReadsTable } from "../database_models/messageReadsTable.js";

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
        conversation_id: conversationData.dataValues.id,
        user_id: currentUser,
        role: PARTICIPANT_ROLE.USER,
      },
      {
        conversation_id: conversationData.dataValues.id,
        user_id: friendId,
        role: PARTICIPANT_ROLE.USER,
      },
    ]);

    //create a default message
    const lastMessage = await MessagesTable.create({
      content: DEFAULT_MESSAGE.GREET,
      conversation_id: conversationData.dataValues.id,
      type: MESSAGE_TYPE.TEXT,
      sent_at: new Date(),
      sender_id: currentUser,
    });

    await ConversationTable.update(
      { last_message_id: lastMessage.id },
      {
        where: {
          id: conversationData.dataValues.id,
        },
      }
    );

    const conversation = {
      conversationId: conversationData.dataValues.id,
      participantId: friendId,
      type: conversationData.dataValues.type,
      lastMessage: {
        content: lastMessage.content,
        type: lastMessage.type,
        sent_at: lastMessage.sent_at,
      },
    };

    if (users.has(friendId)) {
      const userData = await UserTable.findByPk(currentUser, {
        attributes: ["email", "user_id", "name"],
      });

      users.get(friendId).send(
        JSON.stringify({
          requestType: "new_conversation",
          data: {
            friend: {
              userId: userData.user_id,
              email: userData.email,
              name: userData.name,
            },
            conversation: {
              conversationId: conversation.conversationId,
              type: conversation.type,
              participantId: currentUser,
              lastMessage: conversation.lastMessage,
            },
          },
        })
      );
    }
    return res.status(201).send({ data: { conversation } });
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

    const conversationIds = [];

    conversationParticipants.forEach((conversation) => {
      const uIds =
        conversation.dataValues.conversation.conversation_participant.map(
          (participant) => participant.user_id
        );
      friendUserIds.add(...uIds);

      conversationIds.push(conversation.dataValues.conversation_id);

      //normalise conversation data into simpler format
      conversations.push({
        conversationId: conversation.dataValues.conversation_id,
        participantId:
          conversation?.dataValues?.conversation?.conversation_participant?.[0]
            ?.user_id,
        type: conversation.dataValues.conversation.type,
        lastMessage: conversation.dataValues.conversation.last_message,
      });
    });

    const allMessages = await MessagesTable.findAll({
      where: {
        conversation_id: {
          [Op.in]: conversationIds,
        },
        sender_id: {
          [Op.not]: userId,
        },
      },
      group: "conversation_id",
      attributes: [
        "conversation_id",
        [Sequelize.fn("COUNT", Sequelize.col("conversation_id")), "count"],
      ],
    });

    const allMessagesCount = allMessages.reduce((obj, message) => {
      obj[message.dataValues.conversation_id] = message.dataValues.count;
      return obj;
    }, {});

    const readMessages = await MessageReadsTable.findAll({
      where: {
        conversation_id: {
          [Op.in]: conversationIds,
        },
        user_id: userId,
      },
      group: "conversation_id",
      attributes: [
        "conversation_id",
        [Sequelize.fn("COUNT", Sequelize.col("conversation_id")), "count"],
      ],
    });

    const readMessageCount = readMessages.reduce((obj, message) => {
      obj[message.dataValues.conversation_id] = message.dataValues.count;
      return obj;
    }, {});

    conversations.forEach((conversation) => {
      conversation.unReads =
        (allMessagesCount?.[conversation.conversationId] || 0) -
        (readMessageCount?.[conversation.conversationId] || 0);
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

export const getAllMessagesInConversation = async (req, res) => {
  try {
    const { conversationId } = req.query;
    const userId = "1";
    const rawMessages = await MessagesTable.findAll({
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

    const messageIds = rawMessages
      .filter((message) => message.dataValues.sender_id !== userId)
      .map((message) => message.dataValues.id);

    const messageReads = await MessageReadsTable.findAll({
      where: {
        message_id: { [Op.in]: messageIds },
        user_id: userId,
      },
    });
    console.log(messageReads, "message read");

    const messageSet = messageReads.reduce((acc, read) => {
      if (read.dataValues.read) {
        acc.add(read.dataValues.message_id);
      }
      return acc;
    }, new Set());

    const messages = rawMessages.map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      type: message.type,
      content: message.dataValues.is_deleted ? "" : message.dataValues.content,
      edited: message.edited,
      isDeleted: message.is_deleted,
      unRead: !messageSet.has(message.dataValues.id),
      senderId: message.sender_id,
      sentAt: message.sent_at,
    }));

    return res.status(200).send({ messages });
  } catch (error) {
    console.log(error, "Error");
    return res.status(500).send({ message: "Error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { userId, conversationId, message } = req.body;
    const messageDate = new Date();

    if (!userId || !conversationId || !message)
      return res.status(400).send({ message: "Missing required fields" });

    //get conversation along participant (only sender)
    const conversation = await ConversationTable.findByPk(conversationId, {
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

    if (!conversation)
      return res.status(400).send({ message: "conversation not found" });

    //get all other participants in conversation other than the sender
    const participants = await ConversationParticipantsTable.findAll({
      where: {
        user_id: {
          [Op.not]: userId,
        },
        conversation_id: conversationId,
      },
      attributes: ["user_id"],
    });

    //create message in messages table
    const lastMessage = await MessagesTable.create({
      content: message,
      conversation_id: conversationId,
      type: MESSAGE_TYPE.TEXT,
      sent_at: messageDate,
      sender_id: userId,
    });

    //update the conversation table with last message id
    await ConversationTable.update(
      { last_message_id: lastMessage.id },
      {
        where: {
          id: conversationId,
        },
      }
    );

    //push the message to all the active users who has socket connection open
    participants.forEach((participant) => {
      if (users.has(participant.user_id)) {
        users.get(participant.user_id).send(
          JSON.stringify({
            requestType: "deliver_message",
            data: {
              id: lastMessage.dataValues.id,
              conversationId,
              content: lastMessage.dataValues.content,
              type: lastMessage.dataValues.type,
              edited: lastMessage.dataValues.edited,
              unRead: true,
              isDeleted: lastMessage.dataValues.is_deleted,
              senderId: lastMessage.dataValues.send_id,
              sentAt: lastMessage.dataValues.sent_at,
            },
          })
        );
      }
    });

    return res.status(200).send({
      data: {
        id: lastMessage.dataValues.id,
        conversationId: lastMessage.dataValues.conversation_id,
        type: lastMessage.dataValues.type,
        content: lastMessage.dataValues.content,
        edited: lastMessage.dataValues.edited,
        isDeleted: lastMessage.dataValues.is_deleted,
        senderId: lastMessage.dataValues.sender_id,
        sentAt: lastMessage.dataValues.send_at,
      },
    });
  } catch (error) {
    console.log(error, "ERROR");
    return res.status(500).send({ status: false });
  }
};

export const markMessageRead = async (req, res) => {
  try {
    const { messageIds, userId } = req.body;

    const messageData = await MessagesTable.findAll({
      where: {
        id: {
          [Op.in]: messageIds,
        },
      },
      attributes: ["conversation_id", "id"],
    });

    if (messageData.length !== messageIds.length)
      return res
        .status(400)
        .send({ message: "Request contains some invalid message ids" });

    const existingReads = await MessageReadsTable.findAll({
      where: {
        message_id: {
          [Op.in]: messageIds,
        },
        user_id: userId,
      },
    });

    const existingReadsList = existingReads.map(
      (read) => read.dataValues.message_id
    );

    const existingReadsSet = new Set(existingReadsList);

    const finalMessageIds = messageIds.filter(
      (messageId) => !existingReadsSet.has(messageId)
    );

    if (finalMessageIds.length === 0)
      return res
        .status(200)
        .send({ message: "Reads created successfully created for messages" });

    const conversationSet = new Set();

    //need all message ids to be verified of existence
    const messageConversationMap = messageData.reduce((obj, message) => {
      conversationSet.add(message.dataValues.conversation_id);
      obj.set(message.dataValues.id, message.dataValues.conversation_id);
      return obj;
    }, new Map());

    //validate whether the user is part of all conversation
    const conversations = await ConversationParticipantsTable.findAll({
      where: {
        user_id: userId,
        conversation_id: {
          [Op.in]: Array.from(conversationSet),
        },
      },
    });

    if (conversations.length !== conversationSet.size)
      return res
        .status(400)
        .send({ message: "User must be part of the conversation" });

    //create payload for message reads;
    const payload = finalMessageIds.map((messageId) => ({
      conversation_id: messageConversationMap.get(messageId),
      message_id: messageId,
      user_id: userId,
      read: true,
    }));

    await MessageReadsTable.bulkCreate(payload);

    return res
      .status(200)
      .send({ status: true, message: "Messages read successfully", payload });
  } catch (error) {
    console.log(error, "error");
    return res.status(500).send({ status: false, message: error.message });
  }
};
