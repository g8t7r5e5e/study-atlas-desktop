"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const root = path.join(__dirname, ".."),
  lock = require("../package-lock.json");
let text =
  "# Third-party notices\n\nStudy Atlas application source remains under the repository owner’s terms (UNLICENSED). Third-party components keep their own licenses. Electron includes Chromium/Node notices in its distributed LICENSE and LICENSES.chromium.html. SQLite is public domain. Fonts below use the SIL Open Font License. All font notices ship in dist/fonts.\n\n";
const entries = Object.entries(lock.packages).filter(
  ([name, p]) =>
    name &&
    (!p.dev || name.startsWith("node_modules/@fontsource/")) &&
    !p.optional,
);
for (const [relative, p] of entries) {
  const dir = path.join(root, relative);
  if (!fs.existsSync(path.join(dir, "package.json"))) continue;
  const meta = JSON.parse(
    fs.readFileSync(path.join(dir, "package.json"), "utf8"),
  );
  text += `## ${meta.name} ${meta.version}\n\nLicense: ${meta.license || p.license || "See license below"}.\n\n`;
  const license = fs
    .readdirSync(dir)
    .find((n) => /^(license|licence|copying)(\.|$)/i.test(n));
  if (license)
    text +=
      "```text\n" +
      fs.readFileSync(path.join(dir, license), "utf8") +
      "\n```\n\n";
}
text +=
  "## Build and test tools\n\nElectron 44.8.0 (MIT), electron-builder 26.15.3 (MIT), Playwright 1.64.1 (Apache-2.0), acorn 8.19.0 (MIT), pngjs 7.0.0 (MIT). These development dependencies are pinned in package-lock.json. Build/test tools are excluded from app.asar.\n";
fs.writeFileSync(path.join(root, "docs/THIRD_PARTY_NOTICES.md"), text);
console.log("Wrote runtime and font license notices.");
