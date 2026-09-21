import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverDir = path.join(root, "Server");

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules") return [];
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return /\.(?:js|mjs)$/.test(entry.name) ? [target] : [];
  });
}

for (const file of sourceFiles(serverDir)) {
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
}

console.log(`Server syntax PASS (${sourceFiles(serverDir).length} files)`);
