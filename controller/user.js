import { Op } from 'sequelize';
import { UserTable } from '../database_models/userTable.js';
import { RequestTable } from '../database_models/requestTable.js';

export async function findUsersForFriendRequest(req, res) {
  const { email, current_user } = req.query;
  try {
    console.log(current_user);

    const existingRequestRef = await RequestTable.findAll({
      where: {
        [Op.or]: [{ user1: current_user }, { user2: current_user }],
        status: {
          [Op.notIn]: ['rejected', 'cancelled'],
        },
      },
    });

    console.log(existingRequestRef, 'existing request');
    const existingRequestedUsers = existingRequestRef.map((request) =>
      request.dataValues.user1 === current_user
        ? request.dataValues.user2
        : request.dataValues.user1
    );

    const usersRef = await UserTable.findAll({
      where: {
        email: {
          [Op.iLike]: `%${email}%`,
        },
        user_id: {
          [Op.not]: [current_user, ...existingRequestedUsers],
        },
      },
    });

    if (!usersRef || usersRef?.length === 0)
      return res.status(200).send({ results: [] });

    const foundUsers = usersRef.map((user) => user.dataValues);

    return res.status(200).send({ results: foundUsers });
  } catch (error) {
    console.log(error, 'error');
    return res.status(500).send({ message: 'Error while searching people' });
  }
}

export async function findFriendsWithEmail(req, res) {
  // find-friends?currentUser=${userData.userId}&email=${email}
  const { currentUser, email } = req.query;

  try {
    if (!currentUser) throw new Error('No current user specified in request');

    const userRef = await UserTable.findOne({
      where: {
        user_id: currentUser,
      },
      attributes: ['user_id'],
    });

    if (!userRef)
      throw new Error(`Current user does not exists ${currentUser}`);

    const requestRef = await RequestTable.findAll({
      where: {
        [Op.or]: [{ user1: currentUser }, { user2: currentUser }],
        status: 'accepted',
      },
    });

    if (requestRef.length === 0) return res.status(200).send({ friends: [] });

    const friendsId = requestRef.map((request) =>
      request.dataValues.user1 === currentUser
        ? request.dataValues.user2
        : request.dataValues.user1
    );

    const emailMatchingFriends = await UserTable.findAll({
      where: {
        user_id: {
          [Op.in]: friendsId,
        },
        email: {
          [Op.iLike]: `%${email}%`,
        },
      },
      attributes: ['name', 'email', 'user_id'],
    });

    const friends = emailMatchingFriends.map((friend) => friend.dataValues);

    return res.status(200).send({ friends });
  } catch (error) {
    console.log(error, 'error....');
  }
}

export async function createFriendRequest(req, res) {
  const { userId: userIdString, friendId: friendIdString } = req.body;

  if (!userIdString && !friendIdString)
    throw new Error(`user id ${userId} or friend id ${friendId} missing`);

  const userId = Number(userIdString);
  const friendId = Number(friendIdString);

  const users = [userId, friendId];
  try {
    const userRef = await UserTable.findAll({
      where: {
        user_id: {
          [Op.any]: users,
        },
      },
      attributes: ['user_id'],
    });

    if (userRef.length !== users.length) {
      if (userRef.length === 0)
        throw new Error(
          `Invalid users userId: ${userId} friendId: ${friendId}`
        );
      const usersFound = userRef.map((user) => user.dataValues.user_id);

      if (!usersFound.includes(userId))
        throw new Error(`Invalid user id ${userId}`);

      if (!usersFound.includes(friendId))
        throw new Error(`Invalid friend id ${friendId}`);
    }

    const requestRef = await RequestTable.findOne({
      where: {
        [Op.or]: [
          {
            user1: userId,
            user2: friendId,
          },
          {
            user1: friendId,
            user2: userId,
          },
        ],
        status: {
          [Op.notIn]: ['rejected', 'cancelled'],
        },
      },
    });

    if (requestRef)
      return res.status(400).send({
        message: 'request already exists',
      });

    console.log(friendId, 'friendId');

    await RequestTable.create({
      user1: userId,
      user2: friendId,
      status: 'requested',
    });
    return res.status(200).send({ message: 'Request created successfully' });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ status: false });
  }
}
