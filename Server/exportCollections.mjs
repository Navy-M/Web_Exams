// exportCollections.mjs
import fs from "fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";
import { EJSON } from "bson";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

const arg = (name) => {
  // supports --name=value
  const hit = process.argv.slice(2).find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : undefined;
};

const MONGO_URI = arg("uri") || process.env.MONGO_URI;
const DB_NAME = arg("db") || process.env.DB_NAME;
const OUT_DIR = path.resolve(arg("out") || process.env.OUT_DIR || path.join(__dirname, "json_exports"));

function ensureUri(u) {
  if (!u) throw new Error("MONGO_URI is missing. Set it in .env or pass --uri=...");
  if (!/^mongodb(\+srv)?:\/\//.test(u)) {
    throw new Error(`Invalid MongoDB URI (must start with mongodb:// or mongodb+srv://). Got: ${u}`);
  }
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  ensureUri(MONGO_URI);
  if (!DB_NAME) throw new Error("DB_NAME is missing. Set it in .env or pass --db=...");

  await ensureDir(OUT_DIR);

  console.log(`[i] Connecting → ${MONGO_URI.replace(/\/\/([^:]+):[^@]+@/, "//$1:***@")} (db=${DB_NAME})`);
  const client = new MongoClient(MONGO_URI, { appName: "json-exporter" });
  await client.connect();

  try {
    const db = client.db(DB_NAME);
    const cols = await db.listCollections({}, { nameOnly: true }).toArray();
    if (!cols.length) {
      console.log(`[!] No collections in database "${DB_NAME}".`);
      return;
    }

    for (const { name } of cols) {
      console.log(`📤 Exporting ${name} ...`);
      const cursor = db.collection(name).find({});
      const docs = await cursor.toArray();
      // Use Extended JSON so ObjectId/Date/Decimal128 are preserved cleanly
      const json = EJSON.stringify(docs, { relaxed: false, indent: 2 });
      const filePath = path.join(OUT_DIR, `${name}.json`);
      await fs.writeFile(filePath, json);
      console.log(`✅ ${name} → ${filePath} (${docs.length} docs)`);
    }

    console.log(`\n🎉 Done. Files at: ${OUT_DIR}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("❌ Export failed:", err.message);
  process.exit(1);
});
