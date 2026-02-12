import { ConversationParticipantsTable } from "../../database_models/index.js";
import { REDIS_CACHE_KEYS } from "../../enum/redis.js";
import { sendEventsToKafka } from "../../kafka.js";
import redis from "../../redis.js";

const getAllParticipants = async (conversationId) => {
  const { get } = redis;
  const participantsCache = await get(
    `${REDIS_CACHE_KEYS.CONVERSATION_PARTICIPANTS}:${conversationId}`
  );

  if (participantsCache) {
    console.log("CACHED");
    return participantsCache;
  } else {
    console.log("DB Call");
    const allParticipants = await ConversationParticipantsTable.findAll({
      where: { conversation_id: conversationId },
      attributes: ["user_id"],
    });

    const participants = allParticipants.map(
      (participant) => participant.dataValues.user_id
    );

    await sendEventsToKafka("redis_cache_data", {
      requestType: REDIS_CACHE_KEYS.CONVERSATION_PARTICIPANTS,
      data: {
        conversationId,
        participants,
      },
    });

    return participants;
  }
};

export default { getAllParticipants };
