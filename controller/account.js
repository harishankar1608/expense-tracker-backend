import { UserTable } from '../database_models/userTable.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function createAccount(req, res) {
  const { email, name, password } = req.body;
  try {
    const isExistingUser = await UserTable.findOne({ where: { email } });

    if (isExistingUser)
      return res.status(403).send({
        message: 'User already exist, please try a different email address',
      });

    const passwordHash = await bcrypt.hash(password, 16);

    await UserTable.create({ email, name, password: passwordHash });
    return res.status(200).send({ message: 'User created successfully' });
  } catch (error) {
    console.log(error, 'Error while creating an account');
    return res
      .status(500)
      .send({ message: `Error while creating user account` });
  }
}

export async function loginUser(req, res) {
  const { email, password } = req.body;
  try {
    const user = await UserTable.findOne({ where: { email } });
    if (!user) return res.status(404).send(false);
    const userEncryptedPassword = user.password;

    const isValidPassword = await bcrypt.compare(
      password,
      userEncryptedPassword
    );

    if (!isValidPassword)
      return res.status(401).send({ message: 'Invalid Credentials' });

    const token = jwt.sign(
      { user_id: user.dataValues.user_id, current_date: new Date() },
      process.env.JWT_SECRET_HASH_KEY,
      { expiresIn: '30d' }
    );
    const cookieExpiration = 1000 * 60 * 60 * 24 * 30; //30 days
    res.cookie('session_id', token, {
      maxAge: cookieExpiration,
      httpOnly: true,
    });
    return res.status(200).send(true);
  } catch (error) {
    console.log('Error while logging in', error.message);
    return res
      .status(500)
      .send({ message: 'Error while validating user account' });
  }
}
