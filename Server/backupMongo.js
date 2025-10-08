import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, ".env");
dotenv.config({ path: envPath });

const argSet = new Set(process.argv.slice(2));
const mongoUri = argSet.has("--local")
  ? process.env.LOCAL_MONGO_URI
  : process.env.MONGO_URI || process.env.LOCAL_MONGO_URI;

if (!mongoUri) {
  console.error(
    "Missing MongoDB connection string. Please set MONGO_URI or LOCAL_MONGO_URI in Server/.env."
  );
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupsRoot = path.resolve(__dirname, "backups");
const archiveName = `mongo-backup-${timestamp}.gz`;
const archivePath = path.join(backupsRoot, archiveName);

const mongodumpBinary = process.env.MONGODUMP_PATH || "mongodump";
const dumpArgs = ["--uri", mongoUri, `--archive=${archivePath}`, "--gzip"];

async function ensureBackupFolder() {
  await fs.mkdir(backupsRoot, { recursive: true });
}

function runMongodump() {
  console.log(`Backing up MongoDB to ${archivePath}`);
  return new Promise((resolve, reject) => {
    const dumpProcess = spawn(mongodumpBinary, dumpArgs, { stdio: "inherit" });

    dumpProcess.on("error", (error) => {
      reject(new Error(`Failed to start mongodump: ${error.message}`));
    });

    dumpProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`mongodump exited with code ${code}`));
      }
    });
  });
}

async function main() {
  try {
    await ensureBackupFolder();
    await runMongodump();
    console.log(`Backup completed successfully. Saved as ${archiveName}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();
