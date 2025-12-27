import { Op } from "sequelize";
import { RequestTable } from "../database_models/requestTable.js";
import { UserTable } from "../database_models/userTable.js";

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
