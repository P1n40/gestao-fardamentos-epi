#!/usr/bin/env node
import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const args = process.argv.slice(2);
const cleanArgs = [];

for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--host") {
    const value = args[index + 1];
    if (value && !value.startsWith("-")) {
      cleanArgs.push("--hostname", value);
      index += 1;
    }
    continue;
  }

  if (args[index].startsWith("--host=")) {
    cleanArgs.push("--hostname", args[index].split("=")[1]);
    continue;
  }

  cleanArgs.push(args[index]);
}

const rootDir = dirname(fileURLToPath(import.meta.url));
const nextBin = join(rootDir, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, ...cleanArgs], {
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error("[next-shim] Failed to start Next.js:", error);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
