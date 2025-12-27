import { Op } from "sequelize";
import {
  ConversationParticipantsTable,
  ConversationTable,
  MessagesTable,
} from "../../database_models/index.js";
import {
  CONVERSATION_TYPE,
  MESSAGE_TYPE,
  PARTICIPANT_ROLE,
} from "../../enum/messages.js";
import { validateFriends } from "../../utils.js/validate.js";

export const handleSendMessage = async (ws, users, messageData, userId) => {
  const messageDate = new Date();
  if (!(messageData.to || messageData.conversationId) || !messageData.messageId)
    return ws.send(
      JSON.stringify({
        requestType: "send_message_failure",
        data: {
          messageId: messageData.messageId,
          conversationId: messageData.conversationId,
          error: "missing required fields conversationId, messageId, to",
        },
      })
    );

  if (messageData.to) {
    //check if the user is friend with the destination user
    const isFriends = await validateFriends(userId, messageData.to);

    if (!isFriends)
      return ws.send(
        JSON.stringify({
          requestType: "send_message_failure",
          data: {
            messageId: messageData.messageId,
            conversationId: messageData.conversationId,
            error: "Destination should be a friend before sending messages",
          },
        })
      );
  }

  let to = null;
  let successEventType = null;

  if (!messageData.conversationId) {
    successEventType = "conversation_creation_confirmation";
    //check if the a conversation already exist for the friends
    const existingConversation = await ConversationParticipantsTable.findOne({
      where: { user_id: userId },
      include: [
        {
          model: ConversationTable,
          as: "conversation",
          include: [
            {
              model: ConversationParticipantsTable,
              as: "conversation_participant",
              where: { user_id: messageData.to },
            },
          ],
        },
      ],
    });

    console.log(existingConversation, "Conversation existing");
    if (existingConversation) {
      messageData.conversationId = existingConversation.conversation_id;
      console.log("Existing COnversation ");
    } else {
      //if it doesn't exist create a new conversation for send and receiver
      const newConversation = await ConversationTable.create({
        type: CONVERSATION_TYPE.DM,
        created_by: userId,
      });

      messageData.conversationId = newConversation.dataValues.id;

      const participantsData = [
        {
          conversation_id: newConversation.dataValues.id,
          user_id: userId,
          role: PARTICIPANT_ROLE.USER,
        },
        {
          conversation_id: newConversation.dataValues.id,
          user_id: messageData.to,
          role: PARTICIPANT_ROLE.USER,
        },
      ];

      await ConversationParticipantsTable.bulkCreate(participantsData);
    }
    to = messageData.to;
  } else {
    console.log("Gettting into else");
    successEventType = "send_message_confirmation";
    const existingConversation = await ConversationTable.findOne({
      where: {
        id: messageData.conversationId,
      },
      attributes: ["id"],
      include: [
        {
          model: ConversationParticipantsTable,
          as: "conversation_participant",
          where: {
            user_id: {
              [Op.not]: userId,
            },
          },
          limit: 1,
        },
      ],
    });
    console.log("crossing first query");
    const participantId =
      existingConversation?.dataValues?.conversation_participant?.[0]?.user_id;
    console.log(participantId, "Crossed participant id");
    if (!participantId)
      return ws.send(
        JSON.stringify({
          requestType: "send_message_failure",
          data: {
            messageId: messageData.messageId,
            conversationId: messageData.conversationId,
            error: "Participant not found in message",
          },
        })
      );
    to = participantId;
  }

  if (users.has(to)) {
    users.get(to).send(
      JSON.stringify({
        requestType: "deliver_message",
        data: {
          messageId: messageData.messageId,
          message: messageData.message,
          sent_at: messageDate,
          conversationId: messageData.conversationId,
          userId: to,
        },
      })
    );
  }

  const lastMessage = await MessagesTable.create({
    content: messageData.message,
    client_message_id: messageData.messageId,
    conversation_id: messageData.conversationId,
    type: MESSAGE_TYPE.TEXT,
    sent_at: messageDate,
    sender_id: userId,
  });

  await ConversationTable.update(
    { last_message_id: lastMessage.id },
    {
      where: {
        id: messageData.conversationId,
      },
    }
  );

  ws.send(
    JSON.stringify({
      requestType: successEventType,
      data: {
        conversationId: messageData.conversationId,
        messageId: messageData.messageId,
        tempId: messageData.tempId,
      },
    })
  );
};
