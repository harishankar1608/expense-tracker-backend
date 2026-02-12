const users = new Map(); // {user_id: socket}

const addUser = (userId, socketObject) => {
  users.set(userId, socketObject);
};

const removeUser = (userId) => {
  users.delete(userId);
};

const hasUser = (userId) => users.has(userId);

const sendMessageToUser = (userId, messagePayload) => {
  users.get(userId).send(JSON.stringify(messagePayload));
};

export default { addUser, hasUser, sendMessageToUser };
