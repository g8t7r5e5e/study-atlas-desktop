"use strict";
// Owner-only export. This script and its output are excluded from the installer.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { Store } = require("../src/main/store.cjs");
const root = path.resolve(__dirname, "../..");
const arg = process.argv[2];
if (!arg || !path.isAbsolute(arg)) throw Error("Supply an absolute output directory outside the repository.");
const out = path.resolve(arg);
if (out === root || out.startsWith(root + path.sep)) throw Error("Personal exports must remain outside the repository.");
fs.mkdirSync(out, { recursive: true });
const element = () => ({
  innerHTML: "", textContent: "", hidden: true, style: {},
  classList: { add() {}, remove() {}, toggle() {} },
  addEventListener() {}, querySelector() { return null; },
  querySelectorAll() { return []; }, focus() {},
});
const elements = new Map();
const get = (s) => {
  if (!elements.has(s)) elements.set(s, element());
  return elements.get(s);
};
const sandbox = {
  console, Intl, Date, Math, JSON, Set, Map, Number, String, Array, Object,
  crypto: crypto.webcrypto, URL, TextDecoder, Uint8Array, DataView,
  setTimeout() {}, clearInterval() {},
  localStorage: { getItem() { return null; }, setItem() {} },
  location: { hash: "#home" },
  document: { querySelector: get, body: element(), addEventListener() {}, title: "" },
  window: { addEventListener() {}, scrollTo() {} },
};
vm.createContext(sandbox);
for (const name of ["data.js", "import.js", "app.js", "dashboard.js"])
  vm.runInContext(fs.readFileSync(path.join(root, "prototype", name), "utf8"), sandbox, { filename: name });
const raw = fs.readFileSync(path.join(root, "prototype/data.js"), "utf8");
const seed = JSON.parse(raw.slice(raw.indexOf("=") + 1).trim().replace(/;$/, ""));
const demo = JSON.parse(vm.runInContext("JSON.stringify(demo)", sandbox));
demo.preferences.timezone = "Asia/Karachi";
for (const record of demo.assessmentRecords) {
  if (["Planned", "Optional"].includes(record.status)) {
    record.sourceStatus = record.status;
    record.notes = (record.notes ? record.notes + "\n" : "") + "Original plan status: " + record.status + ".";
    record.status = "Scheduled";
  }
}
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-owner-export-"));
let source, verify;
try {
  const generic = require("../assets/seed.json");
  source = new Store(path.join(temp, "source"), generic);
  source.import(JSON.stringify({ format: "study-atlas-desktop", version: 2, schema: 2, seed, demo, ui: {} }));
  const backup = source.snapshot();
  backup.receipts = [];
  const text = JSON.stringify(backup, null, 2);
  verify = new Store(path.join(temp, "verify"), generic);
  assert.equal(verify.preview(text).unresolved, 0);
  verify.import(text);
  assert.deepEqual(verify.load().seed, seed);
  assert.deepEqual(verify.load().demo, backup.demo);
  assert.equal(verify.load().demo.assessmentRecords.length, seed.assessments.length);
  assert.equal(verify.load().demo.milestoneRecords.length, seed.milestones.length);
  const before = verify.load();
  verify.close();
  verify = new Store(path.join(temp, "verify"), generic);
  assert.deepEqual(verify.load(), before);
  const files = {
    "Study-Atlas-My-Step1-Backup.json": text,
    "Study-Atlas-My-Step1-Plan-Only.json": JSON.stringify({ format: "study-atlas-owner-plan", version: 1, seed }, null, 2),
    "READ-ME-FIRST.txt": [
      "YOUR PRIVATE STUDY ATLAS DATA",
      "Source: the approved project prototype, not a live Notion or browser export.",
      "First open Settings -> Download backup in your installed app.",
      "Then use Settings -> Import / restore backup and select Study-Atlas-My-Step1-Backup.json.",
      "FULL RESTORE REPLACES YOUR CURRENT WORKSPACE with the source timetable, settings, assessments and milestones.",
      "Alternative: Plan-Only.json replaces the base schedule but keeps your activity, preferences and editable assessment/milestone lists.",
      "Choose one option. No reinstall is needed. Keep your previous backup.",
      "Later browser-only edits, photos and progress require the browser's own backup export.",
      "Planned/Optional assessment labels are retained in notes; their desktop status is Scheduled.",
      "These files contain your personal source plan and links. Do not share them with the installer.",
      "Validation: source data equality, import, state round-trip, zero unresolved references and restart persistence passed.",
    ].join("\r\n") + "\r\n",
  };
  for (const [name, contents] of Object.entries(files))
    fs.writeFileSync(path.join(out, name), contents, { flag: "wx", mode: 0o600 });
  const sums = Object.keys(files).map(name => crypto.createHash("sha256").update(fs.readFileSync(path.join(out, name))).digest("hex") + "  " + name).join("\n") + "\n";
  fs.writeFileSync(path.join(out, "SHA256SUMS.txt"), sums, { flag: "wx", mode: 0o600 });
  console.log("Owner export verified and written. Personal record contents omitted from logs.");
} finally {
  source?.close();
  verify?.close();
  fs.rmSync(temp, { recursive: true, force: true });
}
