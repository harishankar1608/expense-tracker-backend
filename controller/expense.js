import { Op } from "sequelize";
import { ExpenseTable } from "../database_models/expenseTable.js";
import { UserTable } from "../database_models/userTable.js";
import { RequestTable } from "../database_models/requestTable.js";

export const addExpense = async (req, res) => {
  const {
    expenseType,
    expenseAmount,
    expenseDescription,
    expenseCategory,
    expenseDate,
    friendId,
    currentUser,
  } = req.body;

  //validate if there a current user id provided
  if (!currentUser)
    return res.status(400).send({
      message: `No current user found`,
    });

  //validate expense type and expense date exists
  if (!expenseType || !expenseDate)
    return res.status(400).send({
      message: `Expense type ${expenseType} or Expense Date ${expenseDate} is missing`,
    });

  //validate if there is a friendId when expense type is not self
  if (expenseType !== "self" && !friendId)
    return res
      .status(400)
      .send({ message: `friendId is required to add expense` });

  //validate current user is different from friend
  if (currentUser === friendId)
    return res.status(400).send({
      message: "Current user and friend cannot be same",
    });

  const users = [currentUser];

  if (friendId) users.push(friendId);

  try {
    //verify current user and friend has a valid user id

    const userRef = await UserTable.findAll({
      where: {
        user_id: { [Op.in]: users },
      },
    });

    const validUserIds = userRef.map((user) => user.dataValues.user_id);

    users.map((user) => {
      if (!validUserIds.includes(user)) {
        throw Error(
          `Invalid user id ${user} while logging currentUser: ${currentUser} friendId: ${friendId}`
        );
      }
    });

    const body = {
      added_by: currentUser,
      amount: expenseAmount,
      category: expenseCategory,
      expense_date: expenseDate,
      description: expenseDescription,
      ...getLenderBorrower(expenseType, friendId, currentUser),
    };

    const addedExpense = await ExpenseTable.create({ ...body });

    return res.status(200).send({ status: true, expense: addedExpense });
  } catch (error) {
    console.log(error, "......error......");
    return res.status(500).send({ status: false });
  }
};

const getLenderBorrower = (expenseType, friendId, currentUser) => {
  switch (expenseType) {
    case "lended":
      return { lender: currentUser, borrower: friendId };
    case "borrowed":
      return { lender: friendId, borrower: currentUser };
    case "self":
      return { borrower: currentUser };
    default:
      throw new Error(`Invalid expense type ${expenseType}`);
  }
};

export const getFriendsExpense = async (req, res) => {
  const { currentUser } = req.query;
  try {
    const userRef = await UserTable.findOne({
      where: { user_id: currentUser },
    });
    if (!userRef?.dataValues)
      return res.status(401).send({ message: "Current user not found" });

    const friendsRef = await RequestTable.findAll({
      where: {
        [Op.or]: [
          {
            [Op.and]: {
              user1: currentUser,
              user2: {
                [Op.not]: currentUser,
              },
              status: "accepted",
            },
          },
          {
            [Op.and]: {
              user1: {
                [Op.not]: currentUser,
              },
              user2: currentUser,
              status: "accepted",
            },
          },
        ],
      },
    });
    if (friendsRef.length === 0)
      return res.status(200).send({
        friends: false,
      });

    const friends = friendsRef.map((friend) => {
      if (friend.dataValues.user1 === currentUser) {
        return friend.dataValues.user2;
      } else return friend.dataValues.user1;
    });

    const expenseRef = await ExpenseTable.findAll({
      where: {
        [Op.or]: [
          {
            lender: currentUser,
            borrower: {
              [Op.in]: friends,
            },
          },
          {
            lender: {
              [Op.in]: friends,
            },
            borrower: currentUser,
          },
          // {
          //   lender: null,
          //   borrower: currentUser,
          // },
        ],
      },
    });

    if (expenseRef.length === 0)
      return res.status(200).send({ expenses: null });

    const expenses = expenseRef.map((expense) => expense.dataValues);

    const friendsUserData = await UserTable.findAll({
      where: { user_id: { [Op.in]: friends } },
    });

    const friendsData = {};
    friendsUserData.forEach((friend) => {
      friendsData[friend.user_id] = friend;
    });

    return res.status(200).send({ expenses: expenses, friends: friendsData });
  } catch (error) {
    console.log(error, "error in get all expense");
  }
};

export const getSelfExpenses = async (req, res) => {
  const { currentUser, selectedMonth, currentTimezone } = req.query;
  try {
    const monthAndYear = selectedMonth.split("-");
    const month = Number(monthAndYear[1]);
    const year = Number(monthAndYear[0]);
    const startDate = new Date(
      new Date(year, month - 1, 1).toLocaleString("en-US", {
        // timeZone: currentTimezone,
      })
    );
    const endDate = new Date(
      new Date(year, month, 0).toLocaleString("en-US", {
        // timeZone: currentTimezone,
      })
    );
    const userRef = await UserTable.findOne({
      where: {
        user_id: currentUser,
      },
    });

    if (!userRef?.dataValues)
      return res.status(401).send({ message: "Current user not found" });

    const expenseRef = await ExpenseTable.findAll({
      where: {
        lender: null,
        borrower: currentUser,
        expense_date: { [Op.and]: { [Op.gt]: startDate, [Op.lte]: endDate } },
      },
    });

    if (expenseRef.length === 0) return res.status(200).send({ expenses: [] });

    const expenses = expenseRef.map((expense) => expense.dataValues);

    return res.status(200).send({ expenses: expenses });
  } catch (error) {
    console.log(error, "error in get all expense");
  }
};

/**Things to add
 * lender ~
 * borrower~
 * amount
 * category
 * expense_date~
 * added_by~
 * group_id - to identify if the expenses is split for multiple people
 */

// CREATE TABLE expense_table(
//   expense_id BIGSERIAL NOT NULL PRIMARY KEY,
//   lender BIGINT REFERENCES user_table(user_id) NULL,
//   borrower BIGINT REFERENCES user_table(user_id) NOT NULL,
//   amount BIGINT NOT NULL,
//   description VARCHAR(100),
//   category VARCHAR(50),
//   group_id VARCHAR(50),
//   expense_date DATE NOT NULL,
//   added_by BIGINT REFERENCES user_table(user_id) NOT NULL,
//   created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
//   updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
// );
