import jwt from "jsonwebtoken";

export const decodeUserId = (sessionId) => {
  try {
    const decoded = jwt.verify(sessionId, process.env.JWT_SECRET_HASH_KEY);

    const { user_id } = decoded;

    return user_id || null;
  } catch (error) {
    return null;
  }
};
