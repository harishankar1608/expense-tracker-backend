import { createClient } from "redis";

const client = createClient({ url: process.env.REDIS_CONNECTION_URL });

const connect = async () => {
  await client
    .on("error", (err) => console.log("Redis Client Error", err))
    .connect();

  // client.flushAll();
  // await add("test", new Set([1, 2, 3, 4]));
  // console.log(await get("test"));
};

const get = async (key) => {
  const value = await client.get(key);
  if (!value) return value;

  return JSON.parse(value);
};

const add = async (key, value) => {
  return client.set(key, JSON.stringify(value));
};
// docker run --name expense_tracker_redis -p 6379:6379 -d redis:latest --requirepass "9535"
export default {
  connect,
  get,
  add,
};
