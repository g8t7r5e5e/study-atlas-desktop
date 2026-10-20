"use strict";
const { spawnSync } = require("node:child_process"),
  path = require("node:path");
if (process.platform !== "win32") {
  console.error(
    "Windows installer packaging runs on Windows. Use the Windows installer workflow in .github/workflows/windows-desktop.yml. Linux does not close the installed-Windows release gate.",
  );
  process.exit(1);
}
const args = process.argv.slice(2),
  i = args.indexOf("--arch"),
  arch = i >= 0 ? args[i + 1] : process.arch;
if (!["x64", "arm64"].includes(arch))
  throw Error("Supported installer architectures: x64 and arm64.");
function run(file, args) {
  const r = spawnSync(process.execPath, [file, ...args], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status || 1);
}
run(path.join(__dirname, "build.cjs"), []);
run(require.resolve("electron-builder/out/cli/cli.js"), [
  "--win",
  "nsis",
  "--" + arch,
  "--publish",
  "never",
]);
run(path.join(__dirname, "audit-release.cjs"), []);
run(path.join(__dirname, "checksums.cjs"), []);
