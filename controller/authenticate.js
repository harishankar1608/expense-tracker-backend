import jwt from 'jsonwebtoken';
import { UserTable } from '../database_models/userTable.js';

export async function verifyUserCredentials(req, res) {
  try {
    const { session_id: sessionId } = req?.cookies;

    if (!sessionId) return res.status(200).send({ user_id: null });

    const decoded = jwt.verify(sessionId, process.env.JWT_SECRET_HASH_KEY);

    const { user_id } = decoded;

    const user = await UserTable.findByPk(user_id);

    if (!user) return res.status(401).send({ message: 'Not authorised' });

    return res.status(200).send({ user_id, name: user.name });
  } catch (error) {
    console.log(error, 'Error while getting user credentials');
    return res.status(500).send('Error while verifying user credentials');
  }
}
