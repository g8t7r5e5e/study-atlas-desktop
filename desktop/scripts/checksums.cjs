"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const dir = path.join(__dirname, "../release");
const artifacts = fs
  .readdirSync(dir)
  .filter((f) => /\.exe$/.test(f))
  .sort();
if (!artifacts.length) throw Error("No installer was produced.");
const sums =
  artifacts
    .map(
      (f) =>
        crypto
          .createHash("sha256")
          .update(fs.readFileSync(path.join(dir, f)))
          .digest("hex") +
        "  " +
        f,
    )
    .join("\n") + "\n";
fs.writeFileSync(path.join(dir, "SHA256SUMS.txt"), sums);
console.log(sums);
