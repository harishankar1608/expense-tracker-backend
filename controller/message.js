import {
  DEFAULT_MESSAGE,
  MESSAGE_TYPE,
  PARTICIPANT_ROLE,
} from "../enum/messages.js";

import { REDIS_CACHE_KEYS } from "../enum/redis.js";

import createConversationServices from "../services/message/createConversation.db.js";
import getAllConversationServices from "../services/message/getAllConversations.db.js";
import getAllMessagesInConversationServices from "../services/message/getAllMessagesInConversation.db.js";
import sendMessageServices from "../services/message/sendMessage.db.js";
import markMessageReadServices from "../services/message/markMessageRead.db.js";
import getConversationUnreadCountServices from "../services/message/getConversationUnreadCount.db.js";

import MessageServices from "../services/message/index.js";

import redis from "../redis.js";

import dateServices from "../services/date.js";
import { sendEventsToKafka } from "../kafka.js";

export const createConversation = async (req, res) => {
  // Database services
  const {
    findConversationParticipants,
    getAllDmsWithConversationIds,
    createConversation,
    createConversationParticipants,
    createDefaultMessage,
    updateConversationWithDefaultMessage,
  } = createConversationServices;

  //redis services
  const { add } = redis;

  try {
    const { friendId } = req.body;
    const { currentUser, name, email } = req.metadata;

    if (!friendId || !currentUser)
      return res.status(400).send({ message: "Missing required fields" });

    const participants = await findConversationParticipants(
      currentUser,
      friendId
    );

    const conversationsId = participants.map(
      (c) => c.dataValues.conversation_id
    );

    if (conversationsId.length > 0) {
      const dms = await getAllDmsWithConversationIds(conversationsId);

      if (dms.length > 0)
        return res.status(400).send({ message: "Conversation already exist" });
    }

    const conversationData = await createConversation(currentUser);

    const participantsPayload = [
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
    ];

    await createConversationParticipants(participantsPayload);

    const defaultMessagePayload = {
      content: DEFAULT_MESSAGE.GREET,
      conversation_id: conversationData.dataValues.id,
      type: MESSAGE_TYPE.TEXT,
      sent_at: dateServices.getCurrentDate(),
      sender_id: currentUser,
    };

    //create a default message
    const lastMessage = await createDefaultMessage(defaultMessagePayload);

    await updateConversationWithDefaultMessage(
      conversationData.dataValues.id,
      lastMessage.dataValues.id
    );

    const conversation = {
      conversationId: conversationData.dataValues.id,
      participantId: friendId,
      type: conversationData.dataValues.type,
      lastMessage: {
        content: lastMessage.dataValues.content,
        type: lastMessage.dataValues.type,
        sent_at: lastMessage.dataValues.sent_at,
      },
    };

    // if (websocketConnections.hasUser(friendId)) {
    //send message in websocket if the friend is online

    sendEventsToKafka("websocket_messages", {
      requestType: "new_conversation",
      data: {
        message: {
          friend: {
            userId: currentUser,
            email,
            name,
          },
          conversation: {
            conversationId: conversation.conversationId,
            type: conversation.type,
            participantId: currentUser,
            lastMessage: conversation.lastMessage,
          },
          messageId: lastMessage.dataValues.id,
        },
        to: friendId,
      },
    });

    await add(
      `${REDIS_CACHE_KEYS.CONVERSATION_PARTICIPANTS}:${conversation.conversationId}`,
      [currentUser, friendId]
    );

    return res.status(201).send({ data: { conversation } });
  } catch (error) {
    console.log(error, "Error");
    return res.status(500).send({ message: "Something went wrong" });
  }
};

export const getAllConversations = async (req, res) => {
  try {
    const { currentUser } = req.metadata;

    if (!currentUser)
      return res.status(400).send({ message: "Missing required fields" });

    const conversationParticipants =
      await getAllConversationServices.getAllDmParticipants(currentUser);

    if (conversationParticipants.length === 0)
      return res.status(200).send({ conversations: [], friends: {} });

    const conversations = [];
    const friendUserIds = new Set();

    const conversationIds = [];

    conversationParticipants.forEach((conversation) => {
      const uIds =
        conversation.dataValues.conversation.dataValues.conversation_participant.map(
          (participant) => participant.dataValues.user_id
        );
      friendUserIds.add(...uIds);

      conversationIds.push(conversation.dataValues.conversation_id);

      //normalise conversation data into simpler format
      conversations.push({
        conversationId: conversation.dataValues.conversation_id,
        participantId:
          conversation?.dataValues?.conversation?.dataValues
            ?.conversation_participant?.[0]?.dataValues?.user_id,
        type: conversation.dataValues.conversation.dataValues.type,
        lastMessage:
          conversation.dataValues.conversation.dataValues.last_message
            .dataValues,
      });
    });

    // const allMessages =
    //   await getAllConversationServices.getAllMessageCountForConversation(
    //     conversationIds,
    //     currentUser
    //   );

    // console.log(allMessages, "Count of all messages");
    const unReadMessages =
      await getAllConversationServices.getAllMessagesForConversation(
        conversationIds,
        currentUser
      );

    const unReads = {};

    unReadMessages.forEach((message) => {
      if (!unReads?.[message.dataValues.conversation_id])
        unReads[message.dataValues.conversation_id] = [];
      unReads?.[message.dataValues.conversation_id].push(message.id);
    });

    conversations.forEach((conversation) => {
      conversation.unReads = 0;
    });

    const friends = await getAllConversationServices.getFriendsData(
      Array.from(friendUserIds)
    );

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

    return res
      .status(200)
      .send({ conversations, friends: friendsData, unReads });
  } catch (error) {
    console.log(error, "Error,");
    return res
      .status(500)
      .send({ message: "Error while getting all conversation" });
  }
};

export const getAllMessagesInConversation = async (req, res) => {
  try {
    const { conversationId } = req.query;
    const { currentUser } = req.metadata;

    if (!conversationId || !currentUser)
      return res.status(400).send({ message: "Missing required fields" });

    const participants = await MessageServices.getAllParticipants(
      conversationId
    );

    const isParticipant = participants.find(
      (participant) => participant == currentUser
    );

    if (!isParticipant)
      return res.status(400).send({ message: "Conversation does not exist" });

    const rawMessages =
      await getAllMessagesInConversationServices.getAllMessages(conversationId);

    const messageIds = rawMessages
      .filter((message) => message.dataValues.sender_id !== currentUser)
      .map((message) => message.dataValues.id);

    const messageReadSet = new Set();

    if (messageIds.length > 0) {
      const messageReads =
        await getAllMessagesInConversationServices.getMessageReads(
          messageIds,
          currentUser
        );

      messageReads.forEach((read) => {
        if (read.dataValues.read) {
          messageReadSet.add(read.dataValues.message_id);
        }
      });
    }

    const messages = rawMessages.map((message) => ({
      id: message.dataValues.id,
      conversationId: message.dataValues.conversation_id,
      type: message.dataValues.type,
      content: message.dataValues.is_deleted ? "" : message.dataValues.content,
      edited: message.dataValues.edited,
      isDeleted: message.dataValues.is_deleted,
      unRead: !messageReadSet.has(message.dataValues.id),
      senderId: message.dataValues.sender_id,
      sentAt: message.dataValues.sent_at,
    }));

    return res.status(200).send({ messages });
  } catch (error) {
    console.log(error, "Error");
    return res
      .status(500)
      .send({ message: "Error while getting all messages from conversation" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    const { currentUser } = req.metadata;

    if (!currentUser || !conversationId || !message)
      return res.status(400).send({ message: "Missing required fields" });

    const messageDate = dateServices.getCurrentDate();

    //get conversation along participant (only sender)
    const participants = await MessageServices.getAllParticipants(
      conversationId
    );

    const isParticipant = participants.find(
      (participant) => participant == currentUser
    );

    if (!isParticipant)
      return res.status(400).send({ message: "Conversation not found" });

    //get all other participants in conversation other than the sender
    const otherParticipants = participants.filter(
      (participant) => participant != currentUser
    );

    //create message in messages table
    const lastMessage = await sendMessageServices.createMessage({
      content: message,
      conversation_id: conversationId,
      type: MESSAGE_TYPE.TEXT,
      sent_at: messageDate,
      sender_id: currentUser,
      is_deleted: false,
      edited: false,
    });

    //update the conversation table with last message id
    await sendMessageServices.updateConversationWithMessage(
      conversationId,
      lastMessage.dataValues.id
    );

    const messageData = {
      id: lastMessage.dataValues.id,
      conversationId,
      content: lastMessage.dataValues.content,
      type: lastMessage.dataValues.type,
      edited: lastMessage.dataValues.edited,
      unRead: true,
      isDeleted: lastMessage.dataValues.is_deleted,
      senderId: lastMessage.dataValues.sender_id,
      sentAt: lastMessage.dataValues.sent_at,
    };

    await sendEventsToKafka("websocket_messages", {
      requestType: "deliver_message",
      data: {
        message: messageData,
        participants: otherParticipants,
      },
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
        sentAt: lastMessage.dataValues.sent_at,
      },
    });
  } catch (error) {
    console.log(error, "ERROR");
    return res
      .status(500)
      .send({ message: "Error while sending message to the recipient" });
  }
};

export const markMessageRead = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const { currentUser } = req.metadata;

    if (!messageIds || messageIds.length === 0 || !currentUser)
      return res.status(400).send({ message: "Missing required fields" });
    //get messages of all the message ids from the messages table
    const messageData = await markMessageReadServices.getMessagesWithIds(
      messageIds
    );

    if (messageData.length !== messageIds.length)
      return res
        .status(400)
        .send({ message: "Request contains some invalid message ids" });

    const conversationSet = new Set();

    const messageConversationMap = messageData.reduce((obj, message) => {
      conversationSet.add(message.dataValues.conversation_id);
      obj.set(message.dataValues.id, message.dataValues.conversation_id);
      return obj;
    }, new Map());

    //get the conversation participant data of the curent user for the conversations
    const conversations =
      await markMessageReadServices.getConversationParticipant(
        Array.from(conversationSet),
        currentUser
      );

    //check if the user is part of all the conversations
    if (conversations.length !== conversationSet.size)
      return res
        .status(400)
        .send({ message: "User must be part of the conversation" });

    //get message ids which does not have message read created in table
    const existingReads = await markMessageReadServices.getExistingReadMessages(
      messageIds,
      currentUser
    );

    //create a set for look up table
    const existingReadsSet = new Set();

    existingReads.forEach((read) => {
      existingReadsSet.add(read.dataValues.message_id);
    });

    //filter out message ids which already have read messages entry in table
    const finalMessageIds = messageIds.filter(
      (messageId) => !existingReadsSet.has(messageId)
    );

    if (finalMessageIds.length === 0)
      return res
        .status(200)
        .send({ message: "Reads created successfully created for messages" });

    //create payload for message reads;
    const payload = finalMessageIds.map((messageId) => ({
      conversation_id: messageConversationMap.get(messageId),
      message_id: messageId,
      user_id: currentUser,
      read: true,
    }));

    //create message reads in postgres
    await markMessageReadServices.bulkCreateMessageReads(payload);

    return res
      .status(200)
      .send({ message: "Reads created successfully created for messages" });
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .send({ message: "Error while updating message reads" });
  }
};

export const getConversationUnreadCount = async (req, res) => {
  try {
    const { conversationId } = req.query;
    const { currentUser } = req.metadata;

    if (!conversationId)
      return res.status(400).send({ message: "Missing required fields" });

    const messagesCount =
      await getConversationUnreadCountServices.getMessagesCount(
        conversationId,
        currentUser
      );

    const readMessageCount =
      await getConversationUnreadCountServices.getReadMessagesCount(
        conversationId,
        currentUser
      );

    return res.status(200).send({ unReads: messagesCount - readMessageCount });
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .send({ message: "Error while getting read count for conversation" });
  }
};
