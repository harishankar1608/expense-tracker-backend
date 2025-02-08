import { Op } from 'sequelize';
import { RequestTable } from '../database_models/requestTable.js';
import { UserTable } from '../database_models/userTable.js';

export const getRequestedList = async (req, res) => {
  const { currentUser } = req.query;
  console.log(currentUser);
  try {
    const requestRef = await RequestTable.findAll({
      where: { user1: currentUser, status: 'requested' },
    });

    if (!requestRef)
      throw new Error(
        `Error while getting requested data for user ${currentUser}`
      );

    const friendsId = requestRef.map((request) => request.dataValues.user2);

    if (friendsId.length === 0) return res.status(200).send({ requests: [] });

    const usersRef = await UserTable.findAll({
      where: {
        user_id: {
          [Op.in]: friendsId,
        },
      },
      attributes: ['user_id', 'email', 'name'],
    });

    if (usersRef.length === 0) return res.status(200).send({ requests: [] });
    const usersData = usersRef.map((user) => user.dataValues);
    return res.status(200).send({ requests: usersData });
  } catch (error) {
    console.log(error, 'error');
    return res
      .status(500)
      .send({ error: 'Error while getting friends requested to' });
  }
};

export const getMyRequests = async (req, res) => {
  const { currentUser } = req.query;
  console.log(currentUser);
  try {
    const requestRef = await RequestTable.findAll({
      where: { user2: currentUser, status: 'requested' },
    });

    if (!requestRef)
      throw new Error(
        `Error while getting requested data for user ${currentUser}`
      );

    const friendsId = requestRef.map((request) => request.dataValues.user1);

    if (friendsId.length === 0) return res.status(200).send({ requests: [] });

    const usersRef = await UserTable.findAll({
      where: {
        user_id: {
          [Op.in]: friendsId,
        },
      },
      attributes: ['user_id', 'email', 'name'],
    });
    if (usersRef.length === 0) return res.status(200).send({ requests: [] });
    const usersData = usersRef.map((user) => user.dataValues);
    return res.status(200).send({ requests: usersData });
  } catch (error) {
    console.log(error, 'error');
    return res
      .status(500)
      .send({ error: 'Error while getting friends requested to' });
  }
};

export const acceptFriendRequest = async (req, res) => {
  const { currentUser, friendId } = req.body;
  try {
    const requestRef = await RequestTable.findOne({
      where: {
        user1: friendId,
        user2: currentUser,
        status: 'requested',
      },
    });

    console.log(requestRef, 'request ref in accept friend reqquest');

    if (!requestRef) return res.status(204).send({ request_exists: false });

    await requestRef.update({ status: 'accepted' });

    return res.status(200).send({ request_exists: true });
  } catch (error) {
    console.log(error, 'error/////');
    res.status(500).send({ status: 'Error while accept friend request' });
  }
};

export const cancelFriendRequest = async (req, res) => {
  const { currentUser, friendId } = req.body;
  try {
    const requestRef = await RequestTable.findOne({
      where: {
        user1: currentUser,
        user2: friendId,
        status: 'requested',
      },
    });
    if (!requestRef) return res.status(204).send({ request_exists: false });

    await requestRef.update({ status: 'cancelled' });
    return res.status(200).send({ request_exists: true });
  } catch (error) {
    console.log(error, 'error');
    return res.status(500).send({ status: false });
  }
};

export const rejectFriendRequest = async (req, res) => {
  const { currentUser, friendId } = req.body;
  try {
    const requestRef = await RequestTable.findOne({
      where: {
        user1: friendId,
        user2: currentUser,
        status: 'requested',
      },
    });
    if (!requestRef) return res.status(204).send({ request_exists: false });

    await requestRef.update({ status: 'rejected' });
    return res.status(200).send({ request_exists: true });
  } catch (error) {
    console.log(error, 'error');
    return res.status(500).send({ status: false });
  }
};
