import {
  DEFAULT_MESSAGE,
  MESSAGE_TYPE,
  PARTICIPANT_ROLE,
} from "../enum/messages.js";
import websocketConnections from "./webSocket/users.js";

import createConversationServices from "../services/message/createConversation.db.js";
import getAllConversationServices from "../services/message/getAllConversations.db.js";
import getAllMessagesInConversationServices from "../services/message/getAllMessagesInConversation.db.js";
import sendMessageServices from "../services/message/sendMessage.db.js";
import markMessageReadServices from "../services/message/markMessageRead.db.js";

import dateServices from "../services/date.js";

export const createConversation = async (req, res) => {
  try {
    const { friendId } = req.body;
    const { currentUser } = req.metadata;

    if (!friendId || !currentUser)
      return res.status(400).send({ message: "Missing required fields" });

    const participants =
      await createConversationServices.findConversationParticipants(
        currentUser,
        friendId
      );

    const conversationsId = participants.map(
      (c) => c.dataValues.conversation_id
    );

    if (conversationsId.length > 0) {
      const dms = await createConversationServices.getAllDmsWithConversationIds(
        conversationsId
      );

      if (dms.length > 0)
        return res.status(400).send({ message: "Conversation already exist" });
    }

    const conversationData =
      await createConversationServices.createConversation(currentUser);

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

    await createConversationServices.createConversationParticipants(
      participantsPayload
    );

    const defaultMessagePayload = {
      content: DEFAULT_MESSAGE.GREET,
      conversation_id: conversationData.dataValues.id,
      type: MESSAGE_TYPE.TEXT,
      sent_at: dateServices.getCurrentDate(),
      sender_id: currentUser,
    };

    //create a default message
    const lastMessage = await createConversationServices.createDefaultMessage(
      defaultMessagePayload
    );

    await createConversationServices.updateConversationWithDefaultMessage(
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

    if (websocketConnections.hasUser(friendId)) {
      //send message in websocket if the friend is online
      const userData = await createConversationServices.getSenderData(
        currentUser
      );

      websocketConnections.sendMessageToUser(friendId, {
        requestType: "new_conversation",
        data: {
          friend: {
            userId: userData.dataValues.user_id,
            email: userData.dataValues.email,
            name: userData.dataValues.name,
          },
          conversation: {
            conversationId: conversation.conversationId,
            type: conversation.type,
            participantId: currentUser,
            lastMessage: conversation.lastMessage,
          },
        },
      });
    }

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

    const allMessages =
      await getAllConversationServices.getAllMessageCountForConversation(
        conversationIds,
        currentUser
      );

    const allMessagesCount = allMessages.reduce((obj, message) => {
      obj[message.dataValues.conversation_id] = message.dataValues.count;
      return obj;
    }, {});

    const readMessages =
      await getAllConversationServices.getReadMessageCountForConversation(
        conversationIds,
        currentUser
      );

    const readMessageCount = readMessages.reduce((obj, message) => {
      obj[message.dataValues.conversation_id] = message.dataValues.count;
      return obj;
    }, {});

    conversations.forEach((conversation) => {
      conversation.unReads =
        (allMessagesCount?.[conversation.conversationId] || 0) -
        (readMessageCount?.[conversation.conversationId] || 0);
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

    return res.status(200).send({ conversations, friends: friendsData });
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

    const isParticipant =
      await getAllMessagesInConversationServices.validateParticipant(
        conversationId,
        currentUser
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
    const conversation =
      await sendMessageServices.getConversationWithParticipant(
        conversationId,
        currentUser
      );

    if (!conversation)
      return res.status(400).send({ message: "Conversation not found" });

    //get all other participants in conversation other than the sender
    const participants =
      await sendMessageServices.findParticipantsInConversation(
        conversationId,
        currentUser
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

    //push the message to all the active users who has socket connection open
    participants.forEach((participant) => {
      if (websocketConnections.hasUser(participant.dataValues.user_id)) {
        websocketConnections.sendMessageToUser(currentUser, {
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
        });
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
