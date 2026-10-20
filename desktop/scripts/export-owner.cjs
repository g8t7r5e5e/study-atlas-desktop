"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const out = process.argv[2];
if (!out) {
  console.error(
    "Usage: npm run export:owner-plan -- <absolute-path-outside-repository.json>",
  );
  process.exit(1);
}
const target = path.resolve(out),
  repo = path.resolve(__dirname, "../..");
if (
  !path.isAbsolute(out) ||
  target === repo ||
  target.startsWith(repo + path.sep)
)
  throw Error("Choose an absolute private path outside this repository.");
const raw = fs.readFileSync(path.join(repo, "prototype/data.js"), "utf8");
const seed = JSON.parse(
  raw
    .slice(raw.indexOf("=") + 1)
    .trim()
    .replace(/;$/, ""),
);
require("../src/main/model.cjs").validateSeed(seed);
fs.writeFileSync(
  target,
  JSON.stringify(
    { format: "study-atlas-owner-plan", version: 1, seed },
    null,
    2,
  ),
  { flag: "wx", mode: 0o600 },
);
console.log(
  "Private plan exported to " +
    target +
    ". Import this on the owner machine only; do not share it with the installer.",
);
