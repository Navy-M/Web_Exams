import { execFile, spawn } from "node:child_process";
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverDir = path.join(root, "Server");
const clientDir = path.join(root, "Client");
const serverEnvFile = path.join(serverDir, ".env");
const host = "127.0.0.1";
const serverPort = 5000;
const clientPort = 5174;
const children = new Set();
let shuttingDown = false;

function fail(message) {
  throw new Error(message);
}

function loadEnvironment() {
  try {
    process.loadEnvFile(serverEnvFile);
  } catch (error) {
    fail(`Could not read Server/.env: ${error.message}`);
  }

  const mongoUri = process.env.LOCAL_MONGO_URI || process.env.local_mongo_uri;
  if (!mongoUri) fail("LOCAL_MONGO_URI or local_mongo_uri is not configured in Server/.env.");
  if (!process.env.JWT_SECRET?.trim()) fail("JWT_SECRET is not configured in Server/.env.");
  if (process.env.PORT && Number(process.env.PORT) !== serverPort) {
    fail(`PORT must be ${serverPort} for the local runner; current value: ${process.env.PORT}`);
  }
  return mongoUri;
}

function canBind(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.unref();
    probe.once("error", () => resolve(false));
    probe.listen({ host, port, exclusive: true }, () => probe.close(() => resolve(true)));
  });
}

async function windowsPortOwner(port) {
  if (process.platform !== "win32") return "";
  const command = [
    `$row=Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -First 1`,
    "if($row){$p=Get-Process -Id $row.OwningProcess -ErrorAction SilentlyContinue",
    "if($p){[pscustomobject]@{PID=$p.Id;Name=$p.ProcessName;Path=$p.Path}|ConvertTo-Json -Compress}else{[pscustomobject]@{PID=$row.OwningProcess;Name='unknown'}|ConvertTo-Json -Compress}}",
  ].join(";");
  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", command]);
    return stdout.trim();
  } catch {
    return "";
  }
}

async function assertPortFree(port, label) {
  if (await canBind(port)) return;
  const owner = await windowsPortOwner(port);
  fail(`${label} cannot start because port ${port} is occupied.${owner ? ` Process: ${owner}` : ""} No process was terminated.`);
}

async function mongoServices() {
  if (process.platform !== "win32") return [];
  const command = "Get-Service -ErrorAction SilentlyContinue | Where-Object {$_.Name -match 'mongo' -or $_.DisplayName -match 'mongo'} | Select-Object Name,DisplayName,Status,StartType | ConvertTo-Json -Compress";
  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", command]);
    if (!stdout.trim()) return [];
    const value = JSON.parse(stdout);
    return Array.isArray(value) ? value : [value];
  } catch {
    return [];
  }
}

async function verifyMongo(uri) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
  try {
    await client.connect();
    await client.db().command({ ping: 1 });
    console.log("[preflight] MongoDB: PASS");
  } catch (error) {
    const services = await mongoServices();
    const serviceText = services.length
      ? services.map((service) => `${service.Name} (${service.Status}, ${service.StartType})`).join(", ")
      : "No MongoDB Windows service was detected";
    fail(`MongoDB connection failed: ${error.message}. Windows services: ${serviceText}. No service was changed.`);
  } finally {
    await client.close().catch(() => {});
  }
}

function resolveFrom(packageDir, moduleId) {
  return createRequire(path.join(packageDir, "package.json")).resolve(moduleId);
}

function resolveViteCli() {
  const viteEntry = resolveFrom(clientDir, "vite");
  return path.resolve(path.dirname(viteEntry), "bin", "vite.js");
}

function startChild(label, script, args, cwd, env) {
  const child = spawn(process.execPath, [script, ...args], {
    cwd,
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  child.runnerLabel = label;
  children.add(child);
  child.once("exit", () => children.delete(child));
  return child;
}

async function waitForUrl(url, label, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return response;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  fail(`${label} did not become ready before the timeout (${lastError || "no response"}).`);
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode != null || child.signalCode != null) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

async function stopChild(child) {
  if (child.exitCode != null || child.signalCode != null) return;
  child.kill("SIGTERM");
  if (await waitForExit(child, 3500)) return;

  if (process.platform === "win32") {
    await execFileAsync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"]).catch(() => {});
  } else {
    child.kill("SIGKILL");
  }
  await waitForExit(child, 1500);
}

async function shutdown(code = 0, reason = "") {
  if (shuttingDown) return;
  shuttingDown = true;
  if (reason) console.log(`\n[runner] ${reason}`);
  await Promise.all([...children].map(stopChild));
  console.log("[runner] All child processes started by this run have stopped.");
  process.exitCode = code;
}

async function main() {
  console.log("[preflight] Validating the development environment...");
  const mongoUri = loadEnvironment();
  await assertPortFree(serverPort, "Express Server");
  await assertPortFree(clientPort, "Vite Client");
  await verifyMongo(mongoUri);

  const childEnv = {
    ...process.env,
    NODE_ENV: "development",
    PORT: String(serverPort),
    LOCAL_MONGO_URI: mongoUri,
    VITE_DEV_API_TARGET: `http://${host}:${serverPort}`,
  };
  const serverScript = path.join(serverDir, "scripts", "devServer.mjs");
  const viteScript = resolveViteCli();
  const server = startChild("Server", serverScript, [], serverDir, childEnv);
  const client = startChild("Client", viteScript, ["--host", host, "--port", String(clientPort), "--strictPort"], clientDir, childEnv);

  const unexpectedExit = (child) => {
    child.once("exit", (code, signal) => {
      if (!shuttingDown) shutdown(1, `${child.runnerLabel} exited unexpectedly (code=${code}, signal=${signal || "none"}).`);
    });
  };
  unexpectedExit(server);
  unexpectedExit(client);

  await waitForUrl(`http://${host}:${serverPort}/api/health`, "API health");
  console.log("[startup] API Health: PASS");
  await waitForUrl(`http://${host}:${clientPort}/`, "Vite Client");
  console.log("[startup] Client: PASS");
  await waitForUrl(`http://${host}:${clientPort}/api/health`, "Vite /api proxy");
  console.log("[startup] Vite Proxy: PASS");
  console.log("\nDevelopment environment is ready:");
  console.log(`  Client: http://${host}:${clientPort}`);
  console.log(`  API:    http://${host}:${serverPort}`);
  console.log(`  Proxy:  /api -> http://${host}:${serverPort}`);
  console.log("  Stop:   Ctrl+C");

  await new Promise(() => {});
}

process.once("SIGINT", () => void shutdown(0, "Ctrl+C received; starting graceful shutdown."));
process.once("SIGTERM", () => void shutdown(0, "SIGTERM received; starting graceful shutdown."));

main().catch(async (error) => {
  console.error(`[runner] ERROR: ${error.message}`);
  await shutdown(1);
});
