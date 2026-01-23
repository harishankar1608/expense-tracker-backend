import { markMessageRead, sendMessage } from "../controller/message.js";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { createRequest, createResponse } from "./resources/mockReqRes.js";

import markMessageReadServices from "../services/message/markMessageRead.db.js";
import sendMessageServices from "../services/message/sendMessage.db.js";

import dateServices from "../services/date.js";
import websocketConnections from "../controller/webSocket/users.js";

import { MESSAGE_TYPE } from "../enum/messages.js";

describe("Mark Messages as read", () => {
  const getMessagesWithIdsMock = jest.spyOn(
    markMessageReadServices,
    "getMessagesWithIds"
  );

  const getConversationParticipantMock = jest.spyOn(
    markMessageReadServices,
    "getConversationParticipant"
  );

  const getExistingReadMessagesMock = jest.spyOn(
    markMessageReadServices,
    "getExistingReadMessages"
  );
  const bulkCreateMessageReadsMock = jest.spyOn(
    markMessageReadServices,
    "bulkCreateMessageReads"
  );

  const BASE_REQUEST_BODY = { messageIds: [1, 2, 3], userId: 1 };

  const requestBody = {
    default: { ...BASE_REQUEST_BODY },
    nullMessageId: { ...BASE_REQUEST_BODY, messageIds: null },
    emptyMessageId: { ...BASE_REQUEST_BODY, messageIds: [] },
    nullUserId: { ...BASE_REQUEST_BODY, userId: null },
  };

  let res = null;
  beforeEach(() => {
    jest.clearAllMocks();
    res = new createResponse();
  });

  test("Messages with no existing reads in database", async () => {
    const req = new createRequest({ body: requestBody.default });

    getMessagesWithIdsMock.mockImplementation(() => [
      { dataValues: { id: 1, conversation_id: 1 } },
      { dataValues: { id: 2, conversation_id: 1 } },
      { dataValues: { id: 3, conversation_id: 1 } },
    ]);

    getConversationParticipantMock.mockImplementation(() => [
      { dataValues: { id: 1 } },
    ]);

    //no existing reads in database mock return value
    getExistingReadMessagesMock.mockImplementation(() => []);

    bulkCreateMessageReadsMock.mockImplementation(() => {});

    const result = await markMessageRead(req, res);
    expect(result.getStatus()).toBe(200);
    expect(result.getPayload()).toEqual({
      message: "Reads created successfully created for messages",
    });

    expect(getMessagesWithIdsMock).toHaveBeenCalledTimes(1);

    expect(getConversationParticipantMock).toHaveBeenCalledTimes(1);

    expect(getExistingReadMessagesMock).toHaveBeenCalledTimes(1);

    expect(bulkCreateMessageReadsMock).toHaveBeenCalledTimes(1);

    expect(getMessagesWithIdsMock).toHaveBeenCalledWith(req.body.messageIds);

    expect(getConversationParticipantMock).toHaveBeenCalledWith(
      [1],
      req.body.userId
    );

    expect(getExistingReadMessagesMock).toHaveBeenCalledWith(
      req.body.messageIds,
      req.body.userId
    );

    expect(bulkCreateMessageReadsMock).toHaveBeenCalledWith([
      { conversation_id: 1, message_id: 1, user_id: 1, read: true },
      { conversation_id: 1, message_id: 2, user_id: 1, read: true },
      { conversation_id: 1, message_id: 3, user_id: 1, read: true },
    ]);
  });

  test("Messages with some existing reads in database", async () => {
    const req = new createRequest({ body: requestBody.default });

    getMessagesWithIdsMock.mockImplementation(() => [
      { dataValues: { id: 1, conversation_id: 1 } },
      { dataValues: { id: 2, conversation_id: 1 } },
      { dataValues: { id: 3, conversation_id: 1 } },
    ]);

    getConversationParticipantMock.mockImplementation(() => [
      { dataValues: { id: 1 } },
    ]);

    getExistingReadMessagesMock.mockImplementation(() => [
      { dataValues: { message_id: 1, id: 1 } },
    ]);

    bulkCreateMessageReadsMock.mockImplementation(() => {});

    const result = await markMessageRead(req, res);
    expect(result.getStatus()).toBe(200);
    expect(result.getPayload()).toEqual({
      message: "Reads created successfully created for messages",
    });

    expect(getMessagesWithIdsMock).toHaveBeenCalledTimes(1);

    expect(getConversationParticipantMock).toHaveBeenCalledTimes(1);

    expect(getExistingReadMessagesMock).toHaveBeenCalledTimes(1);

    expect(bulkCreateMessageReadsMock).toHaveBeenCalledTimes(1);

    expect(getMessagesWithIdsMock).toHaveBeenCalledWith(req.body.messageIds);

    expect(getConversationParticipantMock).toHaveBeenCalledWith(
      [1],
      req.body.userId
    );

    expect(getExistingReadMessagesMock).toHaveBeenCalledWith(
      req.body.messageIds,
      req.body.userId
    );

    expect(bulkCreateMessageReadsMock).toHaveBeenCalledWith([
      { conversation_id: 1, message_id: 2, user_id: 1, read: true },
      { conversation_id: 1, message_id: 3, user_id: 1, read: true },
    ]);
  });

  test("Messages with all existing reads in database", async () => {
    const req = new createRequest({ body: requestBody.default });

    getMessagesWithIdsMock.mockImplementation(() => [
      { dataValues: { id: 1, conversation_id: 1 } },
      { dataValues: { id: 2, conversation_id: 1 } },
      { dataValues: { id: 3, conversation_id: 1 } },
    ]);

    getConversationParticipantMock.mockImplementation(() => [
      { dataValues: { id: 1 } },
    ]);

    getExistingReadMessagesMock.mockImplementation(() => [
      { dataValues: { message_id: 1, id: 1 } },
      { dataValues: { message_id: 2, id: 2 } },
      { dataValues: { message_id: 3, id: 3 } },
    ]);

    bulkCreateMessageReadsMock.mockImplementation(() => {});

    const result = await markMessageRead(req, res);
    expect(result.getStatus()).toBe(200);
    expect(result.getPayload()).toEqual({
      message: "Reads created successfully created for messages",
    });

    expect(getMessagesWithIdsMock).toHaveBeenCalledTimes(1);

    expect(getConversationParticipantMock).toHaveBeenCalledTimes(1);

    expect(getExistingReadMessagesMock).toHaveBeenCalledTimes(1);

    expect(bulkCreateMessageReadsMock).toHaveBeenCalledTimes(0);

    expect(getMessagesWithIdsMock).toHaveBeenCalledWith(req.body.messageIds);

    expect(getExistingReadMessagesMock).toHaveBeenCalledWith(
      req.body.messageIds,
      req.body.userId
    );

    expect(getConversationParticipantMock).toHaveBeenCalledWith(
      [1],
      req.body.userId
    );
  });

  test("Messages in conversation in which the user does not exist is sent", async () => {
    const req = new createRequest({ body: requestBody.default });

    getMessagesWithIdsMock.mockImplementation(() => [
      { dataValues: { id: 1, conversation_id: 1 } },
      { dataValues: { id: 2, conversation_id: 1 } },
      { dataValues: { id: 3, conversation_id: 1 } },
    ]);

    getConversationParticipantMock.mockImplementation(() => []);

    const result = await markMessageRead(req, res);
    expect(result.getStatus()).toBe(400);
    expect(result.getPayload()).toEqual({
      message: "User must be part of the conversation",
    });

    expect(getMessagesWithIdsMock).toHaveBeenCalledTimes(1);

    expect(getConversationParticipantMock).toHaveBeenCalledTimes(1);

    expect(getExistingReadMessagesMock).toHaveBeenCalledTimes(0);

    expect(bulkCreateMessageReadsMock).toHaveBeenCalledTimes(0);

    expect(getMessagesWithIdsMock).toHaveBeenCalledWith(req.body.messageIds);

    expect(getConversationParticipantMock).toHaveBeenCalledWith(
      [1],
      req.body.userId
    );
  });

  test("Message id is sent as null from client", async () => {
    const req = new createRequest({ body: requestBody.nullMessageId });

    const result = await markMessageRead(req, res);
    expect(result.getStatus()).toBe(400);
    expect(result.getPayload()).toEqual({
      message: "Missing required fields",
    });

    expect(getMessagesWithIdsMock).toHaveBeenCalledTimes(0);

    expect(getConversationParticipantMock).toHaveBeenCalledTimes(0);

    expect(getExistingReadMessagesMock).toHaveBeenCalledTimes(0);

    expect(bulkCreateMessageReadsMock).toHaveBeenCalledTimes(0);
  });

  test("Message id is sent as empty array from client", async () => {
    const req = new createRequest({ body: requestBody.emptyMessageId });

    const result = await markMessageRead(req, res);
    expect(result.getStatus()).toBe(400);
    expect(result.getPayload()).toEqual({
      message: "Missing required fields",
    });

    expect(getMessagesWithIdsMock).toHaveBeenCalledTimes(0);

    expect(getConversationParticipantMock).toHaveBeenCalledTimes(0);

    expect(getExistingReadMessagesMock).toHaveBeenCalledTimes(0);

    expect(bulkCreateMessageReadsMock).toHaveBeenCalledTimes(0);
  });

  test("user id is sent as null from client", async () => {
    const req = new createRequest({ body: requestBody.nullUserId });

    const result = await markMessageRead(req, res);
    expect(result.getStatus()).toBe(400);
    expect(result.getPayload()).toEqual({
      message: "Missing required fields",
    });

    expect(getMessagesWithIdsMock).toHaveBeenCalledTimes(0);

    expect(getConversationParticipantMock).toHaveBeenCalledTimes(0);

    expect(getExistingReadMessagesMock).toHaveBeenCalledTimes(0);

    expect(bulkCreateMessageReadsMock).toHaveBeenCalledTimes(0);
  });

  test("Messages with invalid message ids that does not exist in database", async () => {
    const req = new createRequest({ body: requestBody.default });

    //missing 3 message id from database
    getMessagesWithIdsMock.mockImplementation(() => [
      { dataValues: { id: 1, conversation_id: 1 } },
      { dataValues: { id: 2, conversation_id: 1 } },
    ]);

    const result = await markMessageRead(req, res);
    expect(result.getStatus()).toBe(400);
    expect(result.getPayload()).toEqual({
      message: "Request contains some invalid message ids",
    });

    expect(getMessagesWithIdsMock).toHaveBeenCalledTimes(1);

    expect(getConversationParticipantMock).toHaveBeenCalledTimes(0);

    expect(getExistingReadMessagesMock).toHaveBeenCalledTimes(0);

    expect(bulkCreateMessageReadsMock).toHaveBeenCalledTimes(0);
  });

  test("Error while bulkcreating payload to database", async () => {
    const req = new createRequest({ body: requestBody.default });

    getMessagesWithIdsMock.mockImplementation(() => [
      { dataValues: { id: 1, conversation_id: 1 } },
      { dataValues: { id: 2, conversation_id: 1 } },
      { dataValues: { id: 3, conversation_id: 1 } },
    ]);

    getConversationParticipantMock.mockImplementation(() => [
      { dataValues: { id: 1 } },
    ]);

    //no existing reads in database mock return value
    getExistingReadMessagesMock.mockImplementation(() => []);

    bulkCreateMessageReadsMock.mockImplementation(() => {
      throw new Error("Message read already exist for message id 1");
    });

    const result = await markMessageRead(req, res);
    expect(result.getStatus()).toBe(500);
    expect(result.getPayload()).toEqual({
      message: "Error while updating message reads",
    });

    expect(getMessagesWithIdsMock).toHaveBeenCalledTimes(1);

    expect(getConversationParticipantMock).toHaveBeenCalledTimes(1);

    expect(getExistingReadMessagesMock).toHaveBeenCalledTimes(1);

    expect(bulkCreateMessageReadsMock).toHaveBeenCalledTimes(1);

    expect(getMessagesWithIdsMock).toHaveBeenCalledWith(req.body.messageIds);

    expect(getConversationParticipantMock).toHaveBeenCalledWith(
      [1],
      req.body.userId
    );

    expect(getExistingReadMessagesMock).toHaveBeenCalledWith(
      req.body.messageIds,
      req.body.userId
    );

    expect(bulkCreateMessageReadsMock).toHaveBeenCalledWith([
      { conversation_id: 1, message_id: 1, user_id: 1, read: true },
      { conversation_id: 1, message_id: 2, user_id: 1, read: true },
      { conversation_id: 1, message_id: 3, user_id: 1, read: true },
    ]);
  });
});

describe("Create messages and send to receivers via websockets", () => {
  const getConversationWithParticipantMock = jest.spyOn(
    sendMessageServices,
    "getConversationWithParticipant"
  );

  const findParticipantsInConversationMock = jest.spyOn(
    sendMessageServices,
    "findParticipantsInConversation"
  );

  const createMessageMock = jest.spyOn(sendMessageServices, "createMessage");

  const updateConversationWithMessageMock = jest.spyOn(
    sendMessageServices,
    "updateConversationWithMessage"
  );

  const getCurrentDateMock = jest.spyOn(dateServices, "getCurrentDate");

  const currentDate = new Date();

  const users = new Map();

  //simulating that user 2 is online
  users.set(2, true);

  const hasUserMock = jest.spyOn(websocketConnections, "hasUser");

  const sendMessageToUserMock = jest.spyOn(
    websocketConnections,
    "sendMessageToUser"
  );

  hasUserMock.mockImplementation((userId) => users.has(userId));
  sendMessageToUserMock.mockImplementation(() => {});

  let res = null;
  const BASE_REQUEST_BODY = {
    userId: 1,
    conversationId: 1,
    message: "This is a jest test message",
  };
  const requestBody = {
    default: { ...BASE_REQUEST_BODY },
    nullUserId: { ...BASE_REQUEST_BODY, userId: null },
    nullConversationId: { ...BASE_REQUEST_BODY, conversationId: null },
    nullMessage: { ...BASE_REQUEST_BODY, message: null },
    emptyMessage: { ...BASE_REQUEST_BODY, message: "" },
  };

  beforeEach(() => {
    res = new createResponse();
    jest.clearAllMocks();
  });

  test("Message created in db and message sent to a user via websocket", async () => {
    const req = new createRequest({ body: requestBody.default });

    getCurrentDateMock.mockImplementation(() => currentDate);

    getConversationWithParticipantMock.mockImplementation(() => ({
      dataValues: {
        id: 1,
        conversation_participant: [{ dataValues: { user_id: 1 } }],
      },
    }));

    findParticipantsInConversationMock.mockImplementation(() => [
      { dataValues: { user_id: 2 } },
    ]);

    const lastMessageId = 1;

    createMessageMock.mockImplementation((payload) => ({
      dataValues: {
        id: lastMessageId,
        conversation_id: payload.conversation_id,
        type: payload.type,
        content: payload.content,
        edited: payload.edited,
        is_deleted: payload.is_deleted,
        sender_id: payload.sender_id,
        sent_at: payload.sent_at,
      },
    }));

    updateConversationWithMessageMock.mockImplementation(() => {});

    const result = await sendMessage(req, res);

    expect(result.getStatus()).toBe(200);
    expect(result.getPayload()).toEqual({
      data: {
        id: lastMessageId,
        conversationId: req.body.conversationId,
        type: MESSAGE_TYPE.TEXT,
        content: req.body.message,
        edited: false,
        isDeleted: false,
        senderId: req.body.userId,
        sentAt: currentDate,
      },
    });

    expect(getCurrentDateMock).toHaveBeenCalledTimes(1);
    expect(getConversationWithParticipantMock).toHaveBeenCalledTimes(1);
    expect(findParticipantsInConversationMock).toHaveBeenCalledTimes(1);
    expect(createMessageMock).toHaveBeenCalledTimes(1);
    expect(updateConversationWithMessageMock).toHaveBeenCalledTimes(1);
    expect(hasUserMock).toHaveBeenCalledTimes(1);
    expect(sendMessageToUserMock).toHaveBeenCalledTimes(1);

    expect(getConversationWithParticipantMock).toHaveBeenCalledWith(
      req.body.conversationId,
      req.body.userId
    );
    expect(findParticipantsInConversationMock).toHaveBeenCalledWith(
      req.body.conversationId,
      req.body.userId
    );
    expect(createMessageMock).toHaveBeenCalledWith({
      content: req.body.message,
      conversation_id: req.body.conversationId,
      type: MESSAGE_TYPE.TEXT,
      sent_at: currentDate,
      sender_id: req.body.userId,
      is_deleted: false,
      edited: false,
    });

    expect(updateConversationWithMessageMock).toHaveBeenCalledWith(
      req.body.conversationId,
      lastMessageId
    );
  });

  test("Message created in db and no message sent via websocket", async () => {
    const req = new createRequest({ body: requestBody.default });

    getCurrentDateMock.mockImplementation(() => currentDate);

    getConversationWithParticipantMock.mockImplementation(() => ({
      dataValues: {
        id: 1,
        conversation_participant: [{ dataValues: { user_id: 1 } }],
      },
    }));

    findParticipantsInConversationMock.mockImplementation(() => [
      { dataValues: { user_id: 3 } },
    ]);

    const lastMessageId = 1;

    createMessageMock.mockImplementation((payload) => ({
      dataValues: {
        id: lastMessageId,
        conversation_id: payload.conversation_id,
        type: payload.type,
        content: payload.content,
        edited: payload.edited,
        is_deleted: payload.is_deleted,
        sender_id: payload.sender_id,
        sent_at: payload.sent_at,
      },
    }));

    updateConversationWithMessageMock.mockImplementation(() => {});

    const result = await sendMessage(req, res);

    expect(result.getStatus()).toBe(200);
    expect(result.getPayload()).toEqual({
      data: {
        id: lastMessageId,
        conversationId: req.body.conversationId,
        type: MESSAGE_TYPE.TEXT,
        content: req.body.message,
        edited: false,
        isDeleted: false,
        senderId: req.body.userId,
        sentAt: currentDate,
      },
    });

    expect(getCurrentDateMock).toHaveBeenCalledTimes(1);
    expect(getConversationWithParticipantMock).toHaveBeenCalledTimes(1);
    expect(findParticipantsInConversationMock).toHaveBeenCalledTimes(1);
    expect(createMessageMock).toHaveBeenCalledTimes(1);
    expect(updateConversationWithMessageMock).toHaveBeenCalledTimes(1);
    expect(hasUserMock).toHaveBeenCalledTimes(1);
    expect(sendMessageToUserMock).toHaveBeenCalledTimes(0);

    expect(getConversationWithParticipantMock).toHaveBeenCalledWith(
      req.body.conversationId,
      req.body.userId
    );
    expect(findParticipantsInConversationMock).toHaveBeenCalledWith(
      req.body.conversationId,
      req.body.userId
    );
    expect(createMessageMock).toHaveBeenCalledWith({
      content: req.body.message,
      conversation_id: req.body.conversationId,
      type: MESSAGE_TYPE.TEXT,
      sent_at: currentDate,
      sender_id: req.body.userId,
      is_deleted: false,
      edited: false,
    });

    expect(updateConversationWithMessageMock).toHaveBeenCalledWith(
      req.body.conversationId,
      lastMessageId
    );
  });

  test("Conversation or conversation participant that does not exist in the DB", async () => {
    const req = new createRequest({ body: requestBody.default });

    getCurrentDateMock.mockImplementation(() => currentDate);

    getConversationWithParticipantMock.mockImplementation(() => null);

    const result = await sendMessage(req, res);

    expect(result.getStatus()).toBe(400);
    expect(result.getPayload()).toEqual({
      message: "Conversation not found",
    });

    expect(getCurrentDateMock).toHaveBeenCalledTimes(1);
    expect(getConversationWithParticipantMock).toHaveBeenCalledTimes(1);
    expect(findParticipantsInConversationMock).toHaveBeenCalledTimes(0);
    expect(createMessageMock).toHaveBeenCalledTimes(0);
    expect(updateConversationWithMessageMock).toHaveBeenCalledTimes(0);
    expect(hasUserMock).toHaveBeenCalledTimes(0);
    expect(sendMessageToUserMock).toHaveBeenCalledTimes(0);

    expect(getConversationWithParticipantMock).toHaveBeenCalledWith(
      req.body.conversationId,
      req.body.userId
    );
  });

  test("Error while creating Message in database", async () => {
    const req = new createRequest({ body: requestBody.default });

    getCurrentDateMock.mockImplementation(() => currentDate);

    getConversationWithParticipantMock.mockImplementation(() => ({
      dataValues: {
        id: 1,
        conversation_participant: [{ dataValues: { user_id: 1 } }],
      },
    }));

    findParticipantsInConversationMock.mockImplementation(() => [
      { dataValues: { user_id: 2 } },
    ]);

    createMessageMock.mockImplementation((payload) => {
      throw new Error("Error while implementing connection to postgres");
    });

    const result = await sendMessage(req, res);

    expect(result.getStatus()).toBe(500);
    expect(result.getPayload()).toEqual({
      message: "Error while sending message to the recipient",
    });

    expect(getCurrentDateMock).toHaveBeenCalledTimes(1);
    expect(getConversationWithParticipantMock).toHaveBeenCalledTimes(1);
    expect(findParticipantsInConversationMock).toHaveBeenCalledTimes(1);
    expect(createMessageMock).toHaveBeenCalledTimes(1);
    expect(updateConversationWithMessageMock).toHaveBeenCalledTimes(0);
    expect(hasUserMock).toHaveBeenCalledTimes(0);
    expect(sendMessageToUserMock).toHaveBeenCalledTimes(0);

    expect(getConversationWithParticipantMock).toHaveBeenCalledWith(
      req.body.conversationId,
      req.body.userId
    );
    expect(findParticipantsInConversationMock).toHaveBeenCalledWith(
      req.body.conversationId,
      req.body.userId
    );
    expect(createMessageMock).toHaveBeenCalledWith({
      content: req.body.message,
      conversation_id: req.body.conversationId,
      type: MESSAGE_TYPE.TEXT,
      sent_at: currentDate,
      sender_id: req.body.userId,
      is_deleted: false,
      edited: false,
    });
  });

  test("Missing userId from client", async () => {
    const req = new createRequest({ body: requestBody.nullUserId });

    const result = await sendMessage(req, res);

    expect(result.getStatus()).toBe(400);
    expect(result.getPayload()).toEqual({
      message: "Missing required fields",
    });

    expect(getCurrentDateMock).toHaveBeenCalledTimes(0);
    expect(getConversationWithParticipantMock).toHaveBeenCalledTimes(0);
    expect(findParticipantsInConversationMock).toHaveBeenCalledTimes(0);
    expect(createMessageMock).toHaveBeenCalledTimes(0);
    expect(updateConversationWithMessageMock).toHaveBeenCalledTimes(0);
    expect(hasUserMock).toHaveBeenCalledTimes(0);
    expect(sendMessageToUserMock).toHaveBeenCalledTimes(0);
  });

  test("Missing conversationId from client", async () => {
    const req = new createRequest({ body: requestBody.nullConversationId });

    const result = await sendMessage(req, res);

    expect(result.getStatus()).toBe(400);
    expect(result.getPayload()).toEqual({
      message: "Missing required fields",
    });

    expect(getCurrentDateMock).toHaveBeenCalledTimes(0);
    expect(getConversationWithParticipantMock).toHaveBeenCalledTimes(0);
    expect(findParticipantsInConversationMock).toHaveBeenCalledTimes(0);
    expect(createMessageMock).toHaveBeenCalledTimes(0);
    expect(updateConversationWithMessageMock).toHaveBeenCalledTimes(0);
    expect(hasUserMock).toHaveBeenCalledTimes(0);
    expect(sendMessageToUserMock).toHaveBeenCalledTimes(0);
  });

  test("Missing message from client", async () => {
    const req = new createRequest({ body: requestBody.nullMessage });

    const result = await sendMessage(req, res);

    expect(result.getStatus()).toBe(400);
    expect(result.getPayload()).toEqual({
      message: "Missing required fields",
    });

    expect(getCurrentDateMock).toHaveBeenCalledTimes(0);
    expect(getConversationWithParticipantMock).toHaveBeenCalledTimes(0);
    expect(findParticipantsInConversationMock).toHaveBeenCalledTimes(0);
    expect(createMessageMock).toHaveBeenCalledTimes(0);
    expect(updateConversationWithMessageMock).toHaveBeenCalledTimes(0);
    expect(hasUserMock).toHaveBeenCalledTimes(0);
    expect(sendMessageToUserMock).toHaveBeenCalledTimes(0);
  });

  test("Receiving message id as empty string from client", async () => {
    const req = new createRequest({ body: requestBody.emptyMessage });

    const result = await sendMessage(req, res);

    expect(result.getStatus()).toBe(400);
    expect(result.getPayload()).toEqual({
      message: "Missing required fields",
    });

    expect(getCurrentDateMock).toHaveBeenCalledTimes(0);
    expect(getConversationWithParticipantMock).toHaveBeenCalledTimes(0);
    expect(findParticipantsInConversationMock).toHaveBeenCalledTimes(0);
    expect(createMessageMock).toHaveBeenCalledTimes(0);
    expect(updateConversationWithMessageMock).toHaveBeenCalledTimes(0);
    expect(hasUserMock).toHaveBeenCalledTimes(0);
    expect(sendMessageToUserMock).toHaveBeenCalledTimes(0);
  });
});
