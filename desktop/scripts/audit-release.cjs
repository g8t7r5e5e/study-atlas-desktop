"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.join(__dirname, "..");
const { auditArchive } = require("./audit-archive.cjs");
let checked = 0;
const forbiddenPath =
  /(^|\/)(prototype|examples|private|user-data|backups|test-results|test-evidence)(\/|$)|\.(sqlite|db|log)(-|$)|owner-plan\.json$/i;
const forbiddenText =
  /https?:\/\/(?:app\.)?notion\.com\/(?:p\/)?[a-f0-9-]{16}|zahoor-study-atlas|ab4ad66b4db08313a92a81b624f8dcc8/;
function inspect(name, bytes) {
  assert.ok(
    !forbiddenPath.test(name),
    "Private/generated data in package: " + name,
  );
  if (
    /\.(js|cjs|json|html|css|md)$/.test(name) &&
    !name.includes("node_modules/")
  )
    assert.ok(
      !forbiddenText.test(bytes.toString()),
      "Private source link in " + name,
    );
  checked++;
}
function walk(dir, prefix = "") {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = prefix + e.name,
      p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, name + "/");
    else inspect(name, fs.readFileSync(p));
  }
}
walk(path.join(root, "dist"), "dist/");
const seed = JSON.parse(fs.readFileSync(path.join(root, "dist/seed.json")));
for (const key of [
  "daily",
  "anki",
  "assessments",
  "weekly",
  "uworld",
  "milestones",
])
  assert.equal(seed[key].length, 0, "Friend seed contains " + key);
assert.ok(
  seed.curriculum.every(
    (r) =>
      r.url.startsWith("topic:") &&
      !Object.keys(r).some((k) => k.startsWith("date:")),
  ),
);
const release = path.join(root, "release");
let archives = 0;
if (fs.existsSync(release)) {
  const asar = require("@electron/asar");
  for (const dir of fs
    .readdirSync(release, { withFileTypes: true })
    .filter((e) => e.isDirectory())) {
    const file = path.join(release, dir.name, "resources/app.asar");
    if (!fs.existsSync(file)) continue;
    archives++;
    auditArchive(file, inspect, asar);
  }
}
console.log(
  `Friend-safety audit passed: ${checked} files, ${archives} packaged archives. No owner plan, private links or user records.`,
);
