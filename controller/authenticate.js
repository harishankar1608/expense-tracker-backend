import { UserTable } from "../database_models/userTable.js";
import { decodeUserId } from "../utils.js/decode.js";

export async function verifyUserCredentials(req, res) {
  try {
    const { session_id: sessionId } = req?.cookies;

    if (!sessionId) return res.status(401).send({ user_id: null });

    const userId = decodeUserId(sessionId);

    const user = await UserTable.findByPk(userId);

    if (!user) return res.status(401).send({ message: "Not authorised" });

    return res.status(200).send({ user_id: userId, name: user.name });
  } catch (error) {
    console.log(error, "Error while getting user credentials");
    return res.status(500).send("Error while verifying user credentials");
  }
}
