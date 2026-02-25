import {
  createConversation,
  getAllConversations,
  getAllMessagesInConversation,
  sendMessage,
  markMessageRead,
} from "../controller/message.js";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { createRequest, createResponse } from "./resources/mockReqRes.js";

import createConversationServices from "../services/message/createConversation.db.js";
import getAllConversationServices from "../services/message/getAllConversations.db.js";
import getAllMessagesInConversationServices from "../services/message/getAllMessagesInConversation.db.js";
import sendMessageServices from "../services/message/sendMessage.db.js";
import markMessageReadServices from "../services/message/markMessageRead.db.js";

import dateServices from "../services/date.js";
import websocketConnections from "../controller/webSocket/users.js";

import {
  CONVERSATION_TYPE,
  DEFAULT_MESSAGE,
  MESSAGE_TYPE,
  PARTICIPANT_ROLE,
} from "../enum/messages.js";

describe("Create conversation for the current user and friend", () => {
  const findConversationParticipantsMock = jest.spyOn(
    createConversationServices,
    "findConversationParticipants"
  );

  const getAllDmsWithConversationIdsMock = jest.spyOn(
    createConversationServices,
    "getAllDmsWithConversationIds"
  );

  const createConversationMock = jest.spyOn(
    createConversationServices,
    "createConversation"
  );

  const createConversationParticipantsMock = jest.spyOn(
    createConversationServices,
    "createConversationParticipants"
  );

  const createDefaultMessageMock = jest.spyOn(
    createConversationServices,
    "createDefaultMessage"
  );

  const updateConversationWithDefaultMessageMock = jest.spyOn(
    createConversationServices,
    "updateConversationWithDefaultMessage"
  );

  const getSenderDataMock = jest.spyOn(
    createConversationServices,
    "getSenderData"
  );

  const getCurrentDateMock = jest.spyOn(dateServices, "getCurrentDate");
  const currentDate = new Date();

  getCurrentDateMock.mockImplementation(() => currentDate);

  const requestBody = {
    default: { friendId: 2 },
    offlineFriendId: { friendId: 3 },
    nullFriendId: { friendId: null },
  };

  const requestMetadata = {
    default: { currentUser: 1 },
    nullUserId: { currentUser: null },
  };

  let res = null;

  beforeEach(() => {
    res = new createResponse();
    jest.clearAllMocks();
  });

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

  test("Creating coversation and sending message via websocket to online friend", async () => {
    const req = new createRequest({
      body: requestBody.default,
      metadata: requestMetadata.default,
    });

    findConversationParticipantsMock.mockImplementation(() => []);

    getAllDmsWithConversationIdsMock.mockImplementation(() => []);

    createConversationMock.mockImplementation(() => ({
      dataValues: {
        id: 1,
        type: CONVERSATION_TYPE.DM,
        created_by: req.metadata.currentUser,
      },
    }));

    createConversationParticipantsMock.mockImplementation(() => {});

    createDefaultMessageMock.mockImplementation(() => ({
      dataValues: {
        id: 5,
        type: MESSAGE_TYPE.TEXT,
        content: DEFAULT_MESSAGE.GREET,
        sent_at: currentDate,
      },
    }));

    updateConversationWithDefaultMessageMock.mockImplementation(() => {});

    getSenderDataMock.mockImplementation(() => ({
      dataValues: {
        name: "John",
        email: "john@gmail.com",
        user_id: req.metadata.currentUser,
      },
    }));

    const result = await createConversation(req, res);
    expect(result.getStatus()).toBe(201);
    expect(result.getPayload()).toEqual({
      data: {
        conversation: {
          conversationId: 1,
          participantId: req.body.friendId,
          type: CONVERSATION_TYPE.DM,
          lastMessage: {
            content: DEFAULT_MESSAGE.GREET,
            type: MESSAGE_TYPE.TEXT,
            sent_at: currentDate,
          },
        },
      },
    });

    expect(findConversationParticipantsMock).toHaveBeenCalledTimes(1);
    expect(getAllDmsWithConversationIdsMock).toHaveBeenCalledTimes(0);
    expect(createConversationMock).toHaveBeenCalledTimes(1);
    expect(createConversationParticipantsMock).toHaveBeenCalledTimes(1);
    expect(createDefaultMessageMock).toHaveBeenCalledTimes(1);
    expect(updateConversationWithDefaultMessageMock).toHaveBeenCalledTimes(1);
    expect(hasUserMock).toHaveBeenCalledTimes(1);
    expect(getSenderDataMock).toHaveBeenCalledTimes(1);
    expect(sendMessageToUserMock).toHaveBeenCalledTimes(1);

    expect(findConversationParticipantsMock).toHaveBeenCalledWith(
      req.metadata.currentUser,
      req.body.friendId
    );
    expect(createConversationMock).toHaveBeenCalledWith(
      req.metadata.currentUser
    );
    expect(createConversationParticipantsMock).toHaveBeenCalledWith([
      {
        conversation_id: 1,
        user_id: req.metadata.currentUser,
        role: PARTICIPANT_ROLE.USER,
      },
      {
        conversation_id: 1,
        user_id: req.body.friendId,
        role: PARTICIPANT_ROLE.USER,
      },
    ]);
    expect(createDefaultMessageMock).toHaveBeenCalledWith({
      content: DEFAULT_MESSAGE.GREET,
      conversation_id: 1,
      type: MESSAGE_TYPE.TEXT,
      sent_at: currentDate,
      sender_id: req.metadata.currentUser,
    });
    expect(updateConversationWithDefaultMessageMock).toHaveBeenCalledWith(1, 5);
    expect(hasUserMock).toHaveBeenCalledWith(req.body.friendId);
    expect(getSenderDataMock).toHaveBeenCalledWith(req.metadata.currentUser);
    expect(sendMessageToUserMock).toHaveBeenCalledWith(req.body.friendId, {
      requestType: "new_conversation",
      data: {
        friend: {
          userId: req.metadata.currentUser,
          email: "john@gmail.com",
          name: "John",
        },
        conversation: {
          conversationId: 1,
          type: CONVERSATION_TYPE.DM,
          participantId: req.metadata.currentUser,
          lastMessage: {
            type: MESSAGE_TYPE.TEXT,
            content: DEFAULT_MESSAGE.GREET,
            sent_at: currentDate,
          },
        },
      },
    });
  });

  test("Creating coversation and no message via websocket to offline friend", async () => {
    const req = new createRequest({
      body: requestBody.offlineFriendId,
      metadata: requestMetadata.default,
    });

    findConversationParticipantsMock.mockImplementation(() => []);

    getAllDmsWithConversationIdsMock.mockImplementation(() => []);

    createConversationMock.mockImplementation(() => ({
      dataValues: {
        id: 1,
        type: CONVERSATION_TYPE.DM,
        created_by: req.metadata.currentUser,
      },
    }));

    createConversationParticipantsMock.mockImplementation(() => {});

    createDefaultMessageMock.mockImplementation(() => ({
      dataValues: {
        id: 5,
        type: MESSAGE_TYPE.TEXT,
        content: DEFAULT_MESSAGE.GREET,
        sent_at: currentDate,
      },
    }));

    updateConversationWithDefaultMessageMock.mockImplementation(() => {});

    getSenderDataMock.mockImplementation(() => ({
      dataValues: {
        name: "John",
        email: "john@gmail.com",
        user_id: req.metadata.currentUser,
      },
    }));

    const result = await createConversation(req, res);
    expect(result.getStatus()).toBe(201);
    expect(result.getPayload()).toEqual({
      data: {
        conversation: {
          conversationId: 1,
          participantId: req.body.friendId,
          type: CONVERSATION_TYPE.DM,
          lastMessage: {
            content: DEFAULT_MESSAGE.GREET,
            type: MESSAGE_TYPE.TEXT,
            sent_at: currentDate,
          },
        },
      },
    });

    expect(findConversationParticipantsMock).toHaveBeenCalledTimes(1);
    expect(getAllDmsWithConversationIdsMock).toHaveBeenCalledTimes(0);
    expect(createConversationMock).toHaveBeenCalledTimes(1);
    expect(createConversationParticipantsMock).toHaveBeenCalledTimes(1);
    expect(createDefaultMessageMock).toHaveBeenCalledTimes(1);
    expect(updateConversationWithDefaultMessageMock).toHaveBeenCalledTimes(1);
    expect(hasUserMock).toHaveBeenCalledTimes(1);
    expect(getSenderDataMock).toHaveBeenCalledTimes(0);
    expect(sendMessageToUserMock).toHaveBeenCalledTimes(0);

    expect(findConversationParticipantsMock).toHaveBeenCalledWith(
      req.metadata.currentUser,
      req.body.friendId
    );
    expect(createConversationMock).toHaveBeenCalledWith(
      req.metadata.currentUser
    );
    expect(createConversationParticipantsMock).toHaveBeenCalledWith([
      {
        conversation_id: 1,
        user_id: req.metadata.currentUser,
        role: PARTICIPANT_ROLE.USER,
      },
      {
        conversation_id: 1,
        user_id: req.body.friendId,
        role: PARTICIPANT_ROLE.USER,
      },
    ]);
    expect(createDefaultMessageMock).toHaveBeenCalledWith({
      content: DEFAULT_MESSAGE.GREET,
      conversation_id: 1,
      type: MESSAGE_TYPE.TEXT,
      sent_at: currentDate,
      sender_id: req.metadata.currentUser,
    });
    expect(updateConversationWithDefaultMessageMock).toHaveBeenCalledWith(1, 5);
    expect(hasUserMock).toHaveBeenCalledWith(req.body.friendId);
  });

  test("Creating coversation and sending message via websocket and has existing group conversation", async () => {
    const req = new createRequest({
      body: requestBody.default,
      metadata: requestMetadata.default,
    });

    findConversationParticipantsMock.mockImplementation(() => [
      { dataValues: { conversation_id: 2 } },
    ]);

    getAllDmsWithConversationIdsMock.mockImplementation(() => []);

    createConversationMock.mockImplementation(() => ({
      dataValues: {
        id: 3,
        type: CONVERSATION_TYPE.DM,
        created_by: req.metadata.currentUser,
      },
    }));

    createConversationParticipantsMock.mockImplementation(() => {});

    createDefaultMessageMock.mockImplementation(() => ({
      dataValues: {
        id: 5,
        type: MESSAGE_TYPE.TEXT,
        content: DEFAULT_MESSAGE.GREET,
        sent_at: currentDate,
      },
    }));

    updateConversationWithDefaultMessageMock.mockImplementation(() => {});

    getSenderDataMock.mockImplementation(() => ({
      dataValues: {
        name: "John",
        email: "john@gmail.com",
        user_id: req.metadata.currentUser,
      },
    }));

    const result = await createConversation(req, res);
    expect(result.getStatus()).toBe(201);
    expect(result.getPayload()).toEqual({
      data: {
        conversation: {
          conversationId: 3,
          participantId: req.body.friendId,
          type: CONVERSATION_TYPE.DM,
          lastMessage: {
            content: DEFAULT_MESSAGE.GREET,
            type: MESSAGE_TYPE.TEXT,
            sent_at: currentDate,
          },
        },
      },
    });

    expect(findConversationParticipantsMock).toHaveBeenCalledTimes(1);
    expect(getAllDmsWithConversationIdsMock).toHaveBeenCalledTimes(1);
    expect(createConversationMock).toHaveBeenCalledTimes(1);
    expect(createConversationParticipantsMock).toHaveBeenCalledTimes(1);
    expect(createDefaultMessageMock).toHaveBeenCalledTimes(1);
    expect(updateConversationWithDefaultMessageMock).toHaveBeenCalledTimes(1);
    expect(hasUserMock).toHaveBeenCalledTimes(1);
    expect(getSenderDataMock).toHaveBeenCalledTimes(1);
    expect(sendMessageToUserMock).toHaveBeenCalledTimes(1);

    expect(findConversationParticipantsMock).toHaveBeenCalledWith(
      req.metadata.currentUser,
      req.body.friendId
    );
    expect(getAllDmsWithConversationIdsMock).toHaveBeenCalledWith([2]);

    expect(createConversationMock).toHaveBeenCalledWith(
      req.metadata.currentUser
    );
    expect(createConversationParticipantsMock).toHaveBeenCalledWith([
      {
        conversation_id: 3,
        user_id: req.metadata.currentUser,
        role: PARTICIPANT_ROLE.USER,
      },
      {
        conversation_id: 3,
        user_id: req.body.friendId,
        role: PARTICIPANT_ROLE.USER,
      },
    ]);
    expect(createDefaultMessageMock).toHaveBeenCalledWith({
      content: DEFAULT_MESSAGE.GREET,
      conversation_id: 3,
      type: MESSAGE_TYPE.TEXT,
      sent_at: currentDate,
      sender_id: req.metadata.currentUser,
    });
    expect(updateConversationWithDefaultMessageMock).toHaveBeenCalledWith(3, 5);
    expect(hasUserMock).toHaveBeenCalledWith(req.body.friendId);
    expect(getSenderDataMock).toHaveBeenCalledWith(req.metadata.currentUser);
    expect(sendMessageToUserMock).toHaveBeenCalledWith(req.body.friendId, {
      requestType: "new_conversation",
      data: {
        friend: {
          userId: req.metadata.currentUser,
          email: "john@gmail.com",
          name: "John",
        },
        conversation: {
          conversationId: 3,
          type: CONVERSATION_TYPE.DM,
          participantId: req.metadata.currentUser,
          lastMessage: {
            type: MESSAGE_TYPE.TEXT,
            content: DEFAULT_MESSAGE.GREET,
            sent_at: currentDate,
          },
        },
      },
    });
  });

  test("Creating coversation and no message via websocket and has existing group conversation", async () => {
    const req = new createRequest({
      body: requestBody.offlineFriendId,
      metadata: requestMetadata.default,
    });

    findConversationParticipantsMock.mockImplementation(() => [
      { dataValues: { conversation_id: 2 } },
    ]);

    getAllDmsWithConversationIdsMock.mockImplementation(() => []);

    createConversationMock.mockImplementation(() => ({
      dataValues: {
        id: 3,
        type: CONVERSATION_TYPE.DM,
        created_by: req.metadata.currentUser,
      },
    }));

    createConversationParticipantsMock.mockImplementation(() => {});

    createDefaultMessageMock.mockImplementation(() => ({
      dataValues: {
        id: 5,
        type: MESSAGE_TYPE.TEXT,
        content: DEFAULT_MESSAGE.GREET,
        sent_at: currentDate,
      },
    }));

    updateConversationWithDefaultMessageMock.mockImplementation(() => {});

    getSenderDataMock.mockImplementation(() => ({
      dataValues: {
        name: "John",
        email: "john@gmail.com",
        user_id: req.metadata.currentUser,
      },
    }));

    const result = await createConversation(req, res);
    expect(result.getStatus()).toBe(201);
    expect(result.getPayload()).toEqual({
      data: {
        conversation: {
          conversationId: 3,
          participantId: req.body.friendId,
          type: CONVERSATION_TYPE.DM,
          lastMessage: {
            content: DEFAULT_MESSAGE.GREET,
            type: MESSAGE_TYPE.TEXT,
            sent_at: currentDate,
          },
        },
      },
    });

    expect(findConversationParticipantsMock).toHaveBeenCalledTimes(1);
    expect(getAllDmsWithConversationIdsMock).toHaveBeenCalledTimes(1);
    expect(createConversationMock).toHaveBeenCalledTimes(1);
    expect(createConversationParticipantsMock).toHaveBeenCalledTimes(1);
    expect(createDefaultMessageMock).toHaveBeenCalledTimes(1);
    expect(updateConversationWithDefaultMessageMock).toHaveBeenCalledTimes(1);
    expect(hasUserMock).toHaveBeenCalledTimes(1);
    expect(getSenderDataMock).toHaveBeenCalledTimes(0);
    expect(sendMessageToUserMock).toHaveBeenCalledTimes(0);

    expect(findConversationParticipantsMock).toHaveBeenCalledWith(
      req.metadata.currentUser,
      req.body.friendId
    );
    expect(getAllDmsWithConversationIdsMock).toHaveBeenCalledWith([2]);
    expect(createConversationMock).toHaveBeenCalledWith(
      req.metadata.currentUser
    );
    expect(createConversationParticipantsMock).toHaveBeenCalledWith([
      {
        conversation_id: 3,
        user_id: req.metadata.currentUser,
        role: PARTICIPANT_ROLE.USER,
      },
      {
        conversation_id: 3,
        user_id: req.body.friendId,
        role: PARTICIPANT_ROLE.USER,
      },
    ]);
    expect(createDefaultMessageMock).toHaveBeenCalledWith({
      content: DEFAULT_MESSAGE.GREET,
      conversation_id: 3,
      type: MESSAGE_TYPE.TEXT,
      sent_at: currentDate,
      sender_id: req.metadata.currentUser,
    });
    expect(updateConversationWithDefaultMessageMock).toHaveBeenCalledWith(3, 5);
    expect(hasUserMock).toHaveBeenCalledWith(req.body.friendId);
  });

  test("Request to create existing DM conversation", async () => {
    const req = new createRequest({
      body: requestBody.offlineFriendId,
      metadata: requestMetadata.default,
    });

    findConversationParticipantsMock.mockImplementation(() => [
      { dataValues: { conversation_id: 2 } },
    ]);

    getAllDmsWithConversationIdsMock.mockImplementation(() => [
      { dataValues: { conversation_id: 2 } },
    ]);

    const result = await createConversation(req, res);
    expect(result.getStatus()).toBe(400);
    expect(result.getPayload()).toEqual({
      message: "Conversation already exist",
    });

    expect(findConversationParticipantsMock).toHaveBeenCalledTimes(1);
    expect(getAllDmsWithConversationIdsMock).toHaveBeenCalledTimes(1);
    expect(createConversationMock).toHaveBeenCalledTimes(0);
    expect(createConversationParticipantsMock).toHaveBeenCalledTimes(0);
    expect(createDefaultMessageMock).toHaveBeenCalledTimes(0);
    expect(updateConversationWithDefaultMessageMock).toHaveBeenCalledTimes(0);
    expect(hasUserMock).toHaveBeenCalledTimes(0);
    expect(getSenderDataMock).toHaveBeenCalledTimes(0);
    expect(sendMessageToUserMock).toHaveBeenCalledTimes(0);

    expect(findConversationParticipantsMock).toHaveBeenCalledWith(
      req.metadata.currentUser,
      req.body.friendId
    );
    expect(getAllDmsWithConversationIdsMock).toHaveBeenCalledWith([2]);
  });

  test("Friend id is sent as null in request body", async () => {
    const req = new createRequest({
      body: requestBody.nullFriendId,
      metadata: requestMetadata.default,
    });

    const result = await createConversation(req, res);
    expect(result.getStatus()).toBe(400);
    expect(result.getPayload()).toEqual({
      message: "Missing required fields",
    });

    expect(findConversationParticipantsMock).toHaveBeenCalledTimes(0);
    expect(getAllDmsWithConversationIdsMock).toHaveBeenCalledTimes(0);
    expect(createConversationMock).toHaveBeenCalledTimes(0);
    expect(createConversationParticipantsMock).toHaveBeenCalledTimes(0);
    expect(createDefaultMessageMock).toHaveBeenCalledTimes(0);
    expect(updateConversationWithDefaultMessageMock).toHaveBeenCalledTimes(0);
    expect(hasUserMock).toHaveBeenCalledTimes(0);
    expect(getSenderDataMock).toHaveBeenCalledTimes(0);
    expect(sendMessageToUserMock).toHaveBeenCalledTimes(0);
  });

  test("Current user id is sent as null in request metadata", async () => {
    const req = new createRequest({
      body: requestBody.default,
      metadata: requestMetadata.nullUserId,
    });

    const result = await createConversation(req, res);
    expect(result.getStatus()).toBe(400);
    expect(result.getPayload()).toEqual({
      message: "Missing required fields",
    });

    expect(findConversationParticipantsMock).toHaveBeenCalledTimes(0);
    expect(getAllDmsWithConversationIdsMock).toHaveBeenCalledTimes(0);
    expect(createConversationMock).toHaveBeenCalledTimes(0);
    expect(createConversationParticipantsMock).toHaveBeenCalledTimes(0);
    expect(createDefaultMessageMock).toHaveBeenCalledTimes(0);
    expect(updateConversationWithDefaultMessageMock).toHaveBeenCalledTimes(0);
    expect(hasUserMock).toHaveBeenCalledTimes(0);
    expect(getSenderDataMock).toHaveBeenCalledTimes(0);
    expect(sendMessageToUserMock).toHaveBeenCalledTimes(0);
  });
});

describe("Get all the conversation for the current user", () => {
  const getAllDmParticipantsMock = jest.spyOn(
    getAllConversationServices,
    "getAllDmParticipants"
  );
  const getAllMessageCountForConversationMock = jest.spyOn(
    getAllConversationServices,
    "getAllMessageCountForConversation"
  );
  const getReadMessageCountForConversationMock = jest.spyOn(
    getAllConversationServices,
    "getReadMessageCountForConversation"
  );
  const getFriendsDataMock = jest.spyOn(
    getAllConversationServices,
    "getFriendsData"
  );

  let res = null;

  const requestMetadata = {
    default: { currentUser: 1 },
    nullUserId: { currentUser: null },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    res = new createResponse();
  });

  test("Retrieving all conversation", async () => {
    const req = new createRequest({ metadata: requestMetadata.default });

    getAllDmParticipantsMock.mockImplementation(() => [
      {
        dataValues: {
          id: 2,
          conversation_id: 1,
          conversation: {
            dataValues: {
              id: 1,
              type: CONVERSATION_TYPE.DM,
              conversation_participant: [{ dataValues: { user_id: 2 } }],
              last_message: {
                dataValues: {
                  content: "Hello",
                  type: MESSAGE_TYPE.TEXT,
                  sender_id: req.metadata.currentUser,
                },
              },
            },
          },
        },
      },
      {
        dataValues: {
          id: 3,
          conversation_id: 2,
          conversation: {
            dataValues: {
              id: 2,
              type: CONVERSATION_TYPE.DM,
              conversation_participant: [{ dataValues: { user_id: 3 } }],
              last_message: {
                dataValues: {
                  content: "Hello",
                  type: MESSAGE_TYPE.TEXT,
                  sender_id: req.metadata.currentUser,
                },
              },
            },
          },
        },
      },
    ]);

    getAllMessageCountForConversationMock.mockImplementation(() => [
      { dataValues: { conversation_id: 1, count: 10 } },
      { dataValues: { conversation_id: 2, count: 15 } },
    ]);

    getReadMessageCountForConversationMock.mockImplementation(() => [
      { dataValues: { conversation_id: 1, count: 3 } },
      { dataValues: { conversation_id: 2, count: 6 } },
    ]);

    getFriendsDataMock.mockImplementation(() => [
      { dataValues: { user_id: 2, name: "John", email: "john@gmail.com" } },
      { dataValues: { user_id: 3, name: "Jake", email: "jake@gmail.com" } },
    ]);

    const result = await getAllConversations(req, res);
    expect(result.getStatus()).toBe(200);
    expect(result.getPayload()).toEqual({
      conversations: [
        {
          conversationId: 1,
          participantId: 2,
          type: CONVERSATION_TYPE.DM,
          unReads: 7,
          lastMessage: {
            content: "Hello",
            type: MESSAGE_TYPE.TEXT,
            sender_id: req.metadata.currentUser,
          },
        },
        {
          conversationId: 2,
          participantId: 3,
          type: CONVERSATION_TYPE.DM,
          unReads: 9,
          lastMessage: {
            content: "Hello",
            type: MESSAGE_TYPE.TEXT,
            sender_id: req.metadata.currentUser,
          },
        },
      ],
      friends: {
        2: {
          name: "John",
          email: "john@gmail.com",
        },
        3: {
          name: "Jake",
          email: "jake@gmail.com",
        },
      },
    });

    expect(getAllDmParticipantsMock).toHaveBeenCalledTimes(1);
    expect(getAllMessageCountForConversationMock).toHaveBeenCalledTimes(1);
    expect(getReadMessageCountForConversationMock).toHaveBeenCalledTimes(1);
    expect(getFriendsDataMock).toHaveBeenCalledTimes(1);

    expect(getAllDmParticipantsMock).toHaveBeenCalledWith(
      req.metadata.currentUser
    );
    expect(getAllMessageCountForConversationMock).toHaveBeenCalledWith(
      [1, 2],
      req.metadata.currentUser
    );
    expect(getReadMessageCountForConversationMock).toHaveBeenCalledWith(
      [1, 2],
      req.metadata.currentUser
    );
    expect(getFriendsDataMock).toHaveBeenCalledWith([2, 3]);
  });
  test("No conversation under the user", async () => {
    const req = new createRequest({ metadata: requestMetadata.default });

    getAllDmParticipantsMock.mockImplementation(() => []);

    const result = await getAllConversations(req, res);
    expect(result.getStatus()).toBe(200);
    expect(result.getPayload()).toEqual({
      conversations: [],
      friends: {},
    });

    expect(getAllDmParticipantsMock).toHaveBeenCalledTimes(1);
    expect(getAllMessageCountForConversationMock).toHaveBeenCalledTimes(0);
    expect(getReadMessageCountForConversationMock).toHaveBeenCalledTimes(0);
    expect(getFriendsDataMock).toHaveBeenCalledTimes(0);

    expect(getAllDmParticipantsMock).toHaveBeenCalledWith(
      req.metadata.currentUser
    );
  });

  test("User is sent as null by the client", async () => {
    const req = new createRequest({ metadata: requestMetadata.nullUserId });

    const result = await getAllConversations(req, res);
    expect(result.getStatus()).toBe(400);
    expect(result.getPayload()).toEqual({
      message: "Missing required fields",
    });

    expect(getAllDmParticipantsMock).toHaveBeenCalledTimes(0);
    expect(getAllMessageCountForConversationMock).toHaveBeenCalledTimes(0);
    expect(getReadMessageCountForConversationMock).toHaveBeenCalledTimes(0);
    expect(getFriendsDataMock).toHaveBeenCalledTimes(0);
  });
});

describe("Get all messages under a conversation", () => {
  const validateParticipantMock = jest.spyOn(
    getAllMessagesInConversationServices,
    "validateParticipant"
  );
  const getAllMessagesMock = jest.spyOn(
    getAllMessagesInConversationServices,
    "getAllMessages"
  );
  const getMessageReadsMock = jest.spyOn(
    getAllMessagesInConversationServices,
    "getMessageReads"
  );

  let res = null;

  const requestQuery = {
    default: { conversationId: 1 },
    nullConversationId: { conversationId: null },
  };

  const requestMetadata = {
    default: { currentUser: 1 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    res = new createResponse();
  });

  const currentDate = new Date();

  test("Retrieve messages where all the messages are read by current user", async () => {
    let req = new createRequest({
      query: requestQuery.default,
      metadata: requestMetadata.default,
    });

    validateParticipantMock.mockImplementation(() => ({
      dataValues: {
        id: 1,
        conversation_participant: { dataValues: { user_id: 1 } },
      },
    }));

    getAllMessagesMock.mockImplementation(() => [
      {
        dataValues: {
          id: 1,
          conversation_id: 1,
          content: "Hello john",
          type: MESSAGE_TYPE.TEXT,
          edited: false,
          is_deleted: false,
          sender_id: 1,
          sent_at: currentDate,
        },
      },
      {
        dataValues: {
          id: 2,
          conversation_id: 1,
          content: "Hello Jake",
          type: MESSAGE_TYPE.TEXT,
          edited: false,
          is_deleted: false,
          sender_id: 2,
          sent_at: currentDate,
        },
      },
      {
        dataValues: {
          id: 3,
          conversation_id: 1,
          content: "How are you doing Jake",
          type: MESSAGE_TYPE.TEXT,
          edited: false,
          is_deleted: false,
          sender_id: 2,
          sent_at: currentDate,
        },
      },
    ]);

    getMessageReadsMock.mockImplementation(() => [
      { dataValues: { message_id: 2, read: true, user_id: 1 } },
      { dataValues: { message_id: 3, read: true, user_id: 1 } },
    ]);

    const result = await getAllMessagesInConversation(req, res);
    expect(result.getStatus()).toBe(200);
    expect(result.getPayload()).toEqual({
      messages: [
        {
          id: 1,
          conversationId: 1,
          type: MESSAGE_TYPE.TEXT,
          content: "Hello john",
          edited: false,
          isDeleted: false,
          unRead: true,
          senderId: 1,
          sentAt: currentDate,
        },
        {
          id: 2,
          conversationId: 1,
          content: "Hello Jake",
          type: MESSAGE_TYPE.TEXT,
          edited: false,
          isDeleted: false,
          unRead: false,
          senderId: 2,
          sentAt: currentDate,
        },
        {
          id: 3,
          conversationId: 1,
          content: "How are you doing Jake",
          type: MESSAGE_TYPE.TEXT,
          edited: false,
          isDeleted: false,
          unRead: false,
          senderId: 2,
          sentAt: currentDate,
        },
      ],
    });

    expect(validateParticipantMock).toHaveBeenCalledTimes(1);
    expect(getAllMessagesMock).toHaveBeenCalledTimes(1);
    expect(getMessageReadsMock).toHaveBeenCalledTimes(1);

    expect(validateParticipantMock).toHaveBeenCalledWith(
      req.query.conversationId,
      req.metadata.currentUser
    );
    expect(getAllMessagesMock).toHaveBeenCalledWith(req.query.conversationId);
    expect(getMessageReadsMock).toHaveBeenCalledWith(
      [2, 3],
      req.metadata.currentUser
    );
  });

  test("Retrieve messages where few messages are unread by current user", async () => {
    let req = new createRequest({
      query: requestQuery.default,
      metadata: requestMetadata.default,
    });

    validateParticipantMock.mockImplementation(() => ({
      dataValues: {
        id: 1,
        conversation_participant: { dataValues: { user_id: 1 } },
      },
    }));

    getAllMessagesMock.mockImplementation(() => [
      {
        dataValues: {
          id: 1,
          conversation_id: 1,
          content: "Hello john",
          type: MESSAGE_TYPE.TEXT,
          edited: false,
          is_deleted: false,
          sender_id: 1,
          sent_at: currentDate,
        },
      },
      {
        dataValues: {
          id: 2,
          conversation_id: 1,
          content: "Hello Jake",
          type: MESSAGE_TYPE.TEXT,
          edited: false,
          is_deleted: false,
          sender_id: 2,
          sent_at: currentDate,
        },
      },
      {
        dataValues: {
          id: 3,
          conversation_id: 1,
          content: "How are you doing Jake",
          type: MESSAGE_TYPE.TEXT,
          edited: false,
          is_deleted: false,
          sender_id: 2,
          sent_at: currentDate,
        },
      },
    ]);

    getMessageReadsMock.mockImplementation(() => [
      { dataValues: { message_id: 2, read: true, user_id: 1 } },
    ]);

    const result = await getAllMessagesInConversation(req, res);
    expect(result.getStatus()).toBe(200);
    expect(result.getPayload()).toEqual({
      messages: [
        {
          id: 1,
          conversationId: 1,
          type: MESSAGE_TYPE.TEXT,
          content: "Hello john",
          edited: false,
          isDeleted: false,
          unRead: true,
          senderId: 1,
          sentAt: currentDate,
        },
        {
          id: 2,
          conversationId: 1,
          content: "Hello Jake",
          type: MESSAGE_TYPE.TEXT,
          edited: false,
          isDeleted: false,
          unRead: false,
          senderId: 2,
          sentAt: currentDate,
        },
        {
          id: 3,
          conversationId: 1,
          content: "How are you doing Jake",
          type: MESSAGE_TYPE.TEXT,
          edited: false,
          isDeleted: false,
          unRead: true,
          senderId: 2,
          sentAt: currentDate,
        },
      ],
    });

    expect(validateParticipantMock).toHaveBeenCalledTimes(1);
    expect(getAllMessagesMock).toHaveBeenCalledTimes(1);
    expect(getMessageReadsMock).toHaveBeenCalledTimes(1);

    expect(validateParticipantMock).toHaveBeenCalledWith(
      req.query.conversationId,
      req.metadata.currentUser
    );
    expect(getAllMessagesMock).toHaveBeenCalledWith(req.query.conversationId);
    expect(getMessageReadsMock).toHaveBeenCalledWith(
      [2, 3],
      req.metadata.currentUser
    );
  });

  test("Retrieve messages where all meessages are unread by current user", async () => {
    let req = new createRequest({
      query: requestQuery.default,
      metadata: requestMetadata.default,
    });

    validateParticipantMock.mockImplementation(() => ({
      dataValues: {
        id: 1,
        conversation_participant: { dataValues: { user_id: 1 } },
      },
    }));

    getAllMessagesMock.mockImplementation(() => [
      {
        dataValues: {
          id: 1,
          conversation_id: 1,
          content: "Hello john",
          type: MESSAGE_TYPE.TEXT,
          edited: false,
          is_deleted: false,
          sender_id: 1,
          sent_at: currentDate,
        },
      },
      {
        dataValues: {
          id: 2,
          conversation_id: 1,
          content: "Hello Jake",
          type: MESSAGE_TYPE.TEXT,
          edited: false,
          is_deleted: false,
          sender_id: 2,
          sent_at: currentDate,
        },
      },
      {
        dataValues: {
          id: 3,
          conversation_id: 1,
          content: "How are you doing Jake",
          type: MESSAGE_TYPE.TEXT,
          edited: false,
          is_deleted: false,
          sender_id: 2,
          sent_at: currentDate,
        },
      },
    ]);

    getMessageReadsMock.mockImplementation(() => []);

    const result = await getAllMessagesInConversation(req, res);
    expect(result.getStatus()).toBe(200);
    expect(result.getPayload()).toEqual({
      messages: [
        {
          id: 1,
          conversationId: 1,
          type: MESSAGE_TYPE.TEXT,
          content: "Hello john",
          edited: false,
          isDeleted: false,
          unRead: true,
          senderId: 1,
          sentAt: currentDate,
        },
        {
          id: 2,
          conversationId: 1,
          content: "Hello Jake",
          type: MESSAGE_TYPE.TEXT,
          edited: false,
          isDeleted: false,
          unRead: true,
          senderId: 2,
          sentAt: currentDate,
        },
        {
          id: 3,
          conversationId: 1,
          content: "How are you doing Jake",
          type: MESSAGE_TYPE.TEXT,
          edited: false,
          isDeleted: false,
          unRead: true,
          senderId: 2,
          sentAt: currentDate,
        },
      ],
    });

    expect(validateParticipantMock).toHaveBeenCalledTimes(1);
    expect(getAllMessagesMock).toHaveBeenCalledTimes(1);
    expect(getMessageReadsMock).toHaveBeenCalledTimes(1);

    expect(validateParticipantMock).toHaveBeenCalledWith(
      req.query.conversationId,
      req.metadata.currentUser
    );
    expect(getAllMessagesMock).toHaveBeenCalledWith(req.query.conversationId);
    expect(getMessageReadsMock).toHaveBeenCalledWith(
      [2, 3],
      req.metadata.currentUser
    );
  });

  test("Retrieve messages where no message sent by the friend to the current user", async () => {
    let req = new createRequest({
      query: requestQuery.default,
      metadata: requestMetadata.default,
    });

    validateParticipantMock.mockImplementation(() => ({
      dataValues: {
        id: 1,
        conversation_participant: { dataValues: { user_id: 1 } },
      },
    }));

    getAllMessagesMock.mockImplementation(() => [
      {
        dataValues: {
          id: 1,
          conversation_id: 1,
          content: "Hello john",
          type: MESSAGE_TYPE.TEXT,
          edited: false,
          is_deleted: false,
          sender_id: 1,
          sent_at: currentDate,
        },
      },
    ]);

    const result = await getAllMessagesInConversation(req, res);
    expect(result.getStatus()).toBe(200);
    expect(result.getPayload()).toEqual({
      messages: [
        {
          id: 1,
          conversationId: 1,
          type: MESSAGE_TYPE.TEXT,
          content: "Hello john",
          edited: false,
          isDeleted: false,
          unRead: true,
          senderId: 1,
          sentAt: currentDate,
        },
      ],
    });

    expect(validateParticipantMock).toHaveBeenCalledTimes(1);
    expect(getAllMessagesMock).toHaveBeenCalledTimes(1);
    expect(getMessageReadsMock).toHaveBeenCalledTimes(0);

    expect(validateParticipantMock).toHaveBeenCalledWith(
      req.query.conversationId,
      req.metadata.currentUser
    );
    expect(getAllMessagesMock).toHaveBeenCalledWith(req.query.conversationId);
  });

  test("Conversation id is missing from the client", async () => {
    let req = new createRequest({
      query: requestQuery.nullConversationId,
      metadata: requestMetadata.default,
    });

    const result = await getAllMessagesInConversation(req, res);

    expect(result.getStatus()).toBe(400);
    expect(result.getPayload()).toEqual({
      message: "Missing required fields",
    });

    expect(validateParticipantMock).toHaveBeenCalledTimes(0);
    expect(getAllMessagesMock).toHaveBeenCalledTimes(0);
    expect(getMessageReadsMock).toHaveBeenCalledTimes(0);
  });

  test("Error while getting all message from conversation", async () => {
    let req = new createRequest({
      query: requestQuery.default,
      metadata: requestMetadata.default,
    });

    validateParticipantMock.mockImplementation(() => {
      throw new Error("Error while implementing connection to postgres");
    });

    const result = await getAllMessagesInConversation(req, res);

    expect(result.getStatus()).toBe(500);
    expect(result.getPayload()).toEqual({
      message: "Error while getting all messages from conversation",
    });

    expect(validateParticipantMock).toHaveBeenCalledTimes(1);
    expect(getAllMessagesMock).toHaveBeenCalledTimes(0);
    expect(getMessageReadsMock).toHaveBeenCalledTimes(0);

    expect(validateParticipantMock).toHaveBeenCalledWith(
      req.query.conversationId,
      req.metadata.currentUser
    );
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

  const requestMetadata = {
    default: { currentUser: 1 },
    nullUserId: { currentUser: null },
  };

  beforeEach(() => {
    res = new createResponse();
    jest.clearAllMocks();
  });

  test("Message created in db and message sent to a user via websocket", async () => {
    const req = new createRequest({
      body: requestBody.default,
      metadata: requestMetadata.default,
    });

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
      req.metadata.currentUser
    );
    expect(findParticipantsInConversationMock).toHaveBeenCalledWith(
      req.body.conversationId,
      req.metadata.currentUser
    );
    expect(createMessageMock).toHaveBeenCalledWith({
      content: req.body.message,
      conversation_id: req.body.conversationId,
      type: MESSAGE_TYPE.TEXT,
      sent_at: currentDate,
      sender_id: req.metadata.currentUser,
      is_deleted: false,
      edited: false,
    });

    expect(updateConversationWithMessageMock).toHaveBeenCalledWith(
      req.body.conversationId,
      lastMessageId
    );
  });

  test("Message created in db and no message sent via websocket", async () => {
    const req = new createRequest({
      body: requestBody.default,
      metadata: requestMetadata.default,
    });

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
        senderId: req.metadata.currentUser,
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
      req.metadata.currentUser
    );
    expect(findParticipantsInConversationMock).toHaveBeenCalledWith(
      req.body.conversationId,
      req.metadata.currentUser
    );
    expect(createMessageMock).toHaveBeenCalledWith({
      content: req.body.message,
      conversation_id: req.body.conversationId,
      type: MESSAGE_TYPE.TEXT,
      sent_at: currentDate,
      sender_id: req.metadata.currentUser,
      is_deleted: false,
      edited: false,
    });

    expect(updateConversationWithMessageMock).toHaveBeenCalledWith(
      req.body.conversationId,
      lastMessageId
    );
  });

  test("Conversation or conversation participant that does not exist in the DB", async () => {
    const req = new createRequest({
      body: requestBody.default,
      metadata: requestMetadata.default,
    });

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
      req.metadata.currentUser
    );
  });

  test("Error while creating Message in database", async () => {
    const req = new createRequest({
      body: requestBody.default,
      metadata: requestMetadata.default,
    });

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
      req.metadata.currentUser
    );
    expect(findParticipantsInConversationMock).toHaveBeenCalledWith(
      req.body.conversationId,
      req.metadata.currentUser
    );
    expect(createMessageMock).toHaveBeenCalledWith({
      content: req.body.message,
      conversation_id: req.body.conversationId,
      type: MESSAGE_TYPE.TEXT,
      sent_at: currentDate,
      sender_id: req.metadata.currentUser,
      is_deleted: false,
      edited: false,
    });
  });

  test("Missing userId from client", async () => {
    const req = new createRequest({
      body: requestBody.default,
      metadata: requestMetadata.nullUserId,
    });

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
    const req = new createRequest({
      body: requestBody.nullConversationId,
      metadata: requestMetadata.default,
    });

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
    const req = new createRequest({
      body: requestBody.nullMessage,
      metadata: requestMetadata.default,
    });

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
    const req = new createRequest({
      body: requestBody.emptyMessage,
      metadata: requestMetadata.default,
    });

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

  const BASE_REQUEST_BODY = { messageIds: [1, 2, 3] };

  const requestBody = {
    default: { ...BASE_REQUEST_BODY },
    nullMessageId: { ...BASE_REQUEST_BODY, messageIds: null },
    emptyMessageId: { ...BASE_REQUEST_BODY, messageIds: [] },
  };

  const requestMetadata = {
    default: { currentUser: 1 },
    nullUserId: { currentUser: null },
  };

  let res = null;
  beforeEach(() => {
    jest.clearAllMocks();
    res = new createResponse();
  });

  test("Messages with no existing reads in database", async () => {
    const req = new createRequest({
      body: requestBody.default,
      metadata: requestMetadata.default,
    });

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
      req.metadata.currentUser
    );

    expect(getExistingReadMessagesMock).toHaveBeenCalledWith(
      req.body.messageIds,
      req.metadata.currentUser
    );

    expect(bulkCreateMessageReadsMock).toHaveBeenCalledWith([
      { conversation_id: 1, message_id: 1, user_id: 1, read: true },
      { conversation_id: 1, message_id: 2, user_id: 1, read: true },
      { conversation_id: 1, message_id: 3, user_id: 1, read: true },
    ]);
  });

  test("Messages with some existing reads in database", async () => {
    const req = new createRequest({
      body: requestBody.default,
      metadata: requestMetadata.default,
    });

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
      req.metadata.currentUser
    );

    expect(getExistingReadMessagesMock).toHaveBeenCalledWith(
      req.body.messageIds,
      req.metadata.currentUser
    );

    expect(bulkCreateMessageReadsMock).toHaveBeenCalledWith([
      { conversation_id: 1, message_id: 2, user_id: 1, read: true },
      { conversation_id: 1, message_id: 3, user_id: 1, read: true },
    ]);
  });

  test("Messages with all existing reads in database", async () => {
    const req = new createRequest({
      body: requestBody.default,
      metadata: requestMetadata.default,
    });

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
      req.metadata.currentUser
    );

    expect(getConversationParticipantMock).toHaveBeenCalledWith(
      [1],
      req.metadata.currentUser
    );
  });

  test("Messages in conversation in which the user does not exist is sent", async () => {
    const req = new createRequest({
      body: requestBody.default,
      metadata: requestMetadata.default,
    });

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
      req.metadata.currentUser
    );
  });

  test("Message id is sent as null from client", async () => {
    const req = new createRequest({
      body: requestBody.nullMessageId,
      metadata: requestMetadata.default,
    });

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
    const req = new createRequest({
      body: requestBody.emptyMessageId,
      metadata: requestMetadata.default,
    });

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
    const req = new createRequest({
      body: requestBody.default,
      metadata: requestMetadata.nullUserId,
    });

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
    const req = new createRequest({
      body: requestBody.default,
      metadata: requestMetadata.default,
    });

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
    const req = new createRequest({
      body: requestBody.default,
      metadata: requestMetadata.default,
    });

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
      req.metadata.currentUser
    );

    expect(getExistingReadMessagesMock).toHaveBeenCalledWith(
      req.body.messageIds,
      req.metadata.currentUser
    );

    expect(bulkCreateMessageReadsMock).toHaveBeenCalledWith([
      { conversation_id: 1, message_id: 1, user_id: 1, read: true },
      { conversation_id: 1, message_id: 2, user_id: 1, read: true },
      { conversation_id: 1, message_id: 3, user_id: 1, read: true },
    ]);
  });
});
