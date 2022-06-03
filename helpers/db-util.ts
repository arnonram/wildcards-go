import { Db, MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;

let cachedClient: MongoClient;
let cachedDb: Db;

export async function connectToDb() {
  if (cachedClient && cachedDb) {
    return {
      client: cachedClient,
      db: cachedDb,
    };
  }

  const opts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environmental variable missing");
  }

  if (!MONGODB_DB) {
    throw new Error("MONGODB_DB environmental variable missing");
  }

  let client = new MongoClient(MONGODB_URI);
  await client.connect();
  let db = client.db(MONGODB_DB);

  cachedClient = client;
  cachedDb = db;

  return { client: cachedClient, db: cachedDb };
}
