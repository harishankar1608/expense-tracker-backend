import { UserTable } from "../database_models/userTable.js";
import { decodeUserId } from "../utils.js/decode.js";
import { decodeAndValidateUser } from "../utils.js/validate.js";

export async function verifyUserCredentials(req, res) {
  try {
    const { session_id: sessionId } = req?.cookies || {};

    if (!sessionId) return res.status(401).send({ user_id: null });

    const userId = decodeUserId(sessionId);

    const user = await UserTable.findByPk(userId);

    if (!user) return res.status(401).send({ message: "Not authorised" });

    return res.status(200).send({ user_id: userId, name: user.name });
  } catch (error) {
    console.log(error, "Error while getting user credentials");
    return res
      .status(500)
      .send({ message: "Error while verifying user credentials" });
  }
}

export async function verifyUserMiddleWare(req, res, next) {
  try {
    const { session_id: sessionId } = req?.cookies || {};

    const { status, userId, name, email } = await decodeAndValidateUser(
      sessionId
    );

    if (!status) return res.status(401).send({ message: "Not authorised" });

    if (!req?.metadata) req.metadata = {};

    req.metadata.currentUser = userId;
    req.metadata.name = name;
    req.metadata.email = email;

    next();
  } catch (error) {
    console.log("Error", error.message);
    return res
      .status(500)
      .send({ message: "Error while verifying user credentials" });
  }
}
