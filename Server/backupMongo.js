// file: backup-mongo.mjs
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Load .env (from current dir) ----
dotenv.config({ path: path.resolve(__dirname, ".env") });

// ---- Helpers ----
const nowIso = () => new Date().toISOString();
const log = (level, msg, extra) =>
  console.log(
    JSON.stringify({ ts: nowIso(), level, msg, ...(extra || {}) })
  );

const redacted = (uri = "") => {
  try {
    const u = new URL(uri);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return uri ? "<redacted-uri>" : "<unset>";
  }
};

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  const get = (key, def = undefined) => {
    // supports --key=value
    const raw = [...args].find(a => a.startsWith(`--${key}=`));
    if (!raw) return def;
    return raw.split("=").slice(1).join("=");
  };
  return {
    useLocal: args.has("--local"),
    withOplog: args.has("--oplog"),
    verify: args.has("--verify"),
    retentionDays: parseInt(get("retention-days", process.env.RETENTION_DAYS || "14"), 10),
    tag: get("tag", process.env.BACKUP_TAG || "default"),
    readPreference: get("readPreference", "secondaryPreferred"),
    dumpBinary: process.env.MONGODUMP_PATH || "mongodump",
    restoreBinary: process.env.MONGORESTORE_PATH || "mongorestore",
    backupsRoot: path.resolve(get("out", process.env.BACKUPS_DIR || path.join(__dirname, "backups"))),
    encrypt: !!process.env.BACKUP_ENCRYPT_PASSPHRASE,
    passphrase: process.env.BACKUP_ENCRYPT_PASSPHRASE || "",
    timeoutMs: parseInt(process.env.BACKUP_TIMEOUT_MS || "0", 10) || 0,
  };
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function buildDumpArgs({ mongoUri, archivePath, readPreference, withOplog }) {
  const args = [
    "--uri", mongoUri,
    `--archive=${archivePath}`,
    "--gzip",
    `--readPreference=${readPreference}`,
  ];
  if (withOplog) args.push("--oplog");
  return args;
}

function spawnLogged(cmd, args, { timeoutMs = 0 } = {}) {
  log("info", "spawn", { cmd, args });
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    let timeoutId = null;
    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        log("error", "process-timeout", { cmd, timeoutMs });
        child.kill("SIGKILL");
        reject(new Error(`Process timeout after ${timeoutMs}ms: ${cmd}`));
      }, timeoutMs);
    }
    child.on("error", (err) => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(err);
    });
    child.on("close", (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function computeSha256(filePath) {
  const h = crypto.createHash("sha256");
  const fh = await fs.open(filePath, "r");
  try {
    const rs = fh.createReadStream();
    await new Promise((res, rej) => {
      rs.on("data", (c) => h.update(c));
      rs.on("error", rej);
      rs.on("end", res);
    });
  } finally {
    await fh.close();
  }
  return h.digest("hex");
}

async function encryptAesGcm(inFile, outFile, passphrase) {
  // AES-256-GCM with salt & iv; KDF: scrypt
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = await new Promise((resolve, reject) =>
    crypto.scrypt(passphrase, salt, 32, (err, derived) =>
      err ? reject(err) : resolve(derived)
    )
  );
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const inFh = await fs.open(inFile, "r");
  const outFh = await fs.open(outFile, "w", 0o600);
  try {
    // header: magic | salt(16) | iv(12)
    const header = Buffer.concat([Buffer.from("MGBAK1"), salt, iv]);
    await outFh.write(header);

    await new Promise((resolve, reject) => {
      const rs = inFh.createReadStream();
      const ws = outFh.createWriteStream({ flags: "a" });
      rs.pipe(cipher).pipe(ws);
      ws.on("finish", resolve);
      ws.on("error", reject);
      rs.on("error", reject);
    });

    const tag = cipher.getAuthTag();
    await outFh.write(tag);
  } finally {
    await inFh.close();
    await outFh.close();
  }
}

async function cleanupOldBackups(dir, retentionDays) {
  if (!retentionDays || retentionDays <= 0) return;
  const entries = await fs.readdir(dir);
  const cutoff = Date.now() - retentionDays * 86400_000;
  let removed = 0;
  for (const name of entries) {
    if (!name.startsWith("mongo-backup-")) continue;
    const full = path.join(dir, name);
    const stat = await fs.stat(full);
    if (stat.isFile() && stat.mtimeMs < cutoff) {
      await fs.rm(full).catch(() => {});
      removed++;
    }
  }
  if (removed) log("info", "retention-cleanup", { removed, retentionDays });
}

async function checkBinary(binaryName) {
  try {
    await spawnLogged(binaryName, ["--version"]);
    return true;
  } catch (e) {
    log("error", "binary-missing", { binary: binaryName, error: String(e) });
    return false;
  }
}

async function main() {
  const {
    useLocal, withOplog, verify, retentionDays, tag,
    readPreference, dumpBinary, restoreBinary,
    backupsRoot, encrypt, passphrase, timeoutMs
  } = parseArgs();

  const mongoUri =
    (useLocal ? process.env.LOCAL_MONGO_URI : process.env.MONGO_URI) ||
    process.env.LOCAL_MONGO_URI;

  if (!mongoUri) {
    console.error("Missing MongoDB URI. Set MONGO_URI or LOCAL_MONGO_URI in .env");
    process.exit(1);
  }

  log("info", "starting-backup", {
    uri: redacted(mongoUri),
    readPreference,
    withOplog,
    backupsRoot,
    tag,
    encrypt,
    retentionDays
  });

  // binaries
  const hasDump = await checkBinary(dumpBinary);
  if (!hasDump) process.exit(1);
  if (verify) {
    const hasRestore = await checkBinary(restoreBinary);
    if (!hasRestore) {
      log("warn", "verify-disabled-no-mongorestore");
    }
  }

  await ensureDir(backupsRoot);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = `mongo-backup-${tag}-${ts}.archive.gz`;
  const tmpPath = path.join(backupsRoot, `.${baseName}.tmp`);
  const finalPath = path.join(backupsRoot, baseName);

  // build args
  const dumpArgs = buildDumpArgs({
    mongoUri,
    archivePath: tmpPath,
    readPreference,
    withOplog
  });

  // trap signals
  const onSig = async (sig) => {
    log("warn", "signal", { sig });
    if (await fileExists(tmpPath)) {
      await fs.rm(tmpPath).catch(() => {});
    }
    process.exit(130);
  };
  process.on("SIGINT", onSig);
  process.on("SIGTERM", onSig);

  // 1) run mongodump → tmp file
  await spawnLogged(dumpBinary, dumpArgs, { timeoutMs });

  // 2) move atomically to final
  await fs.rename(tmpPath, finalPath);

  // 3) sha256
  const sha = await computeSha256(finalPath);
  await fs.writeFile(`${finalPath}.sha256`, `${sha}  ${path.basename(finalPath)}\n`, { mode: 0o600 });
  log("info", "backup-complete", { file: finalPath, sha256: sha });

  // 4) optional encryption (creates .enc and .enc.sha256)
  let exportedPath = finalPath;
  if (encrypt) {
    const encPath = `${finalPath}.enc`;
    await encryptAesGcm(finalPath, encPath, passphrase);
    const encSha = await computeSha256(encPath);
    await fs.writeFile(`${encPath}.sha256`, `${encSha}  ${path.basename(encPath)}\n`, { mode: 0o600 });
    exportedPath = encPath;
    log("info", "encryption-complete", { file: encPath, sha256: encSha });

    // (اختیاری) حذف نسخهِ غیررمزشده:
    if (process.env.DELETE_PLAIN_AFTER_ENCRYPT === "1") {
      await fs.rm(finalPath).catch(() => {});
      await fs.rm(`${finalPath}.sha256`).catch(() => {});
      log("info", "plain-removed");
    }
  }

  // 5) optional verify (dry-run)
  if (verify) {
    try {
      await spawnLogged(restoreBinary, ["--dryRun", "--gzip", `--archive=${finalPath}`]);
      log("info", "verify-ok", { file: finalPath });
    } catch (e) {
      log("error", "verify-failed", { error: String(e) });
      // قصد توقف نداریم؛ گزارش می‌دهیم. اگر می‌خواهید شکست بخورد:
      // process.exit(2);
    }
  }

  // 6) retention policy
  await cleanupOldBackups(backupsRoot, retentionDays);

  log("info", "done", { exportedPath });
}

main().catch((e) => {
  log("error", "unexpected-error", { error: String(e) });
  process.exit(1);
});



// # بکاپ پیش‌فرض از MONGO_URI، خواندن از Secondary، gzip+archive
// node backupMongo.js

// # از LOCAL_MONGO_URI
// node backupMongo.js --local

// # با Oplog (Replica Set) برای نزدیکی سازگاری زمانی
// node backupMongo.js --oplog

// # تأیید ساختار بکاپ (dry-run با mongorestore)
// node backupMongo.js --verify

// # تغییر فولدر خروجی و تگ
// node backupMongo.js --out=/srv/backups/mongo --tag=staging

// # نگه‌داری فقط 7 روز
// node backupMongo.js --retention-days=7
