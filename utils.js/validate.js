import { Op } from "sequelize";
import { RequestTable } from "../database_models/requestTable.js";
import { UserTable } from "../database_models/userTable.js";
import { decodeUserId } from "./decode.js";

export const validateUser = async (userId) => {
  try {
    const user = await UserTable.findByPk(userId, { attributes: ["name"] });
    if (user) return true;
  } catch (error) {
    return false;
  }
  return false;
};

export const validateFriends = async (userId, friendId) => {
  try {
    const isFriends = await RequestTable.findOne({
      where: {
        [Op.or]: [
          { user1: userId, user2: friendId, status: "accepted" },
          { user1: friendId, user2: userId, status: "accepted" },
        ],
      },
    });

    if (isFriends) return true;
  } catch (error) {
    return false;
  }
  return false;
};

export const decodeAndValidateUser = async (sessionId) => {
  const userId = decodeUserId(sessionId);

  const user = await UserTable.findByPk(userId);

  if (!user) return { status: false, userId: null };

  return { status: true, userId: Number(user.dataValues.user_id) };
};
