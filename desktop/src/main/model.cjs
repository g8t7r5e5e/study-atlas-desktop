"use strict";
const { createHash, randomUUID } = require("node:crypto");
const MAX_BYTES = 20 * 1024 * 1024;
const arrays = [
  "logs",
  "weakness",
  "catchup",
  "addedDays",
  "addedTopics",
  "assessmentRecords",
  "milestoneRecords",
];
const maps = [
  "edits",
  "topic",
  "taskStates",
  "checks",
  "settings",
  "preferences",
  "weekly",
  "reflections",
  "profile",
];
const clone = (x) => JSON.parse(JSON.stringify(x));
const hash = (x) =>
  createHash("sha256")
    .update(typeof x === "string" ? x : canonical(x))
    .digest("hex");
function canonical(x) {
  return Array.isArray(x)
    ? "[" + x.map(canonical).join(",") + "]"
    : x && typeof x === "object"
      ? "{" +
        Object.keys(x)
          .sort()
          .map((k) => JSON.stringify(k) + ":" + canonical(x[k]))
          .join(",") +
        "}"
      : JSON.stringify(x);
}
function plain(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}
function dateOK(x) {
  return (
    typeof x === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(x) &&
    !isNaN(Date.parse(x + "T12:00Z")) &&
    new Date(x + "T12:00Z").toISOString().slice(0, 10) === x
  );
}
function inspect(x, depth = 0) {
  if (depth > 30) throw Error("Data is nested too deeply.");
  if (typeof x === "number" && !Number.isFinite(x))
    throw Error("Non-finite number.");
  if (typeof x === "string" && x.length > 8 * 1024 * 1024)
    throw Error("Text field is too large.");
  if (x && typeof x === "object") {
    if (Object.keys(x).length > 20000) throw Error("Too many entries.");
    for (const [k, v] of Object.entries(x)) {
      if (["__proto__", "constructor", "prototype"].includes(k))
        throw Error("Unsafe object key.");
      inspect(v, depth + 1);
    }
  }
}
function parse(text) {
  if (typeof text !== "string" || Buffer.byteLength(text) > MAX_BYTES)
    throw Error("Backup exceeds 20 MB.");
  const x = JSON.parse(text);
  inspect(x);
  return x;
}
function numeric(x, keys, max = 1000000, integer = true) {
  for (const k of keys) {
    const v = x[k];
    if (v == null || v === "") continue;
    if (
      !["number", "string"].includes(typeof v) ||
      !Number.isFinite(+v) ||
      +v < 0 ||
      +v > max ||
      (integer && !Number.isInteger(+v))
    )
      throw Error(
        `Invalid ${k}: use ${integer ? "whole " : ""}values from 0 to ${max}.`,
      );
  }
}
function dates(x, keys) {
  for (const k of keys)
    if (x[k] != null && x[k] !== "" && !dateOK(x[k]))
      throw Error("Invalid date: " + k);
}
function enumValue(x, k, values) {
  if (x[k] != null && x[k] !== "" && !values.includes(x[k]))
    throw Error("Unsupported " + k + ": " + x[k]);
}
function image(photo) {
  if (!photo) return null;
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]*={0,2})$/.exec(
    photo,
  );
  if (!m) throw Error("Profile photo must be PNG, JPEG or WebP.");
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > 5 * 1024 * 1024 || bytes.length < 12)
    throw Error("Invalid photo size.");
  const valid =
    m[1] === "png"
      ? bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : m[1] === "jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP";
  if (!valid) throw Error("Photo contents do not match its type.");
  return { id: hash(bytes.toString("base64")), mime: "image/" + m[1], bytes };
}
function validateDemo(input) {
  if (!plain(input)) throw Error("Expected a demo object.");
  inspect(input);
  if (Buffer.byteLength(JSON.stringify(input)) > MAX_BYTES)
    throw Error("Workspace exceeds 20 MB.");
  const d = clone(input);
  for (const k of arrays) {
    if (d[k] !== undefined && !Array.isArray(d[k]))
      throw Error(k + " must be a list.");
    const ids = new Set();
    for (const r of d[k] || []) {
      if (!plain(r)) throw Error("Invalid " + k + " record.");
      if (
        r.id != null &&
        (typeof r.id !== "string" || !r.id || r.id.length > 2048)
      )
        throw Error("Invalid record ID.");
      if (r.id && ids.has(r.id)) throw Error("Duplicate record ID in " + k);
      if (r.id) ids.add(r.id);
    }
  }
  for (const k of maps)
    if (d[k] !== undefined && !plain(d[k]))
      throw Error(k + " must be an object.");
  const days = new Set();
  for (const r of d.logs || []) {
    if (!dateOK(r.date)) throw Error("Every log needs a valid date.");
    if (r._block !== undefined && typeof r._block !== "boolean")
      throw Error("Invalid block flag.");
    if (!r._block) {
      if (days.has(r.date)) throw Error("Duplicate daily record: " + r.date);
      days.add(r.date);
    }
    numeric(r, ["hours", "target"], 24, false);
    numeric(r, [
      "questions",
      "correct",
      "reviewed",
      "anki",
      "due",
      "newcards",
      "budget",
      "ankiMinutes",
    ]);
    for (const k of ["correct", "reviewed"])
      if (+(r[k] || 0) > +(r.questions || 0))
        throw Error(k + " cannot exceed attempts.");
    if (r._block && r.selection === "System-wise" && !r.system)
      throw Error("Select a system for this block.");
    dates(r, ["catchupDate"]);
  }
  const planDates = new Set();
  for (const r of d.addedDays || []) {
    if (planDates.has(r["date:Date:start"]))
      throw Error("Duplicate lesson date.");
    planDates.add(r["date:Date:start"]);
    if (typeof r.url !== "string" || !dateOK(r["date:Date:start"]))
      throw Error("Invalid lesson identity/date.");
  }
  const pairs = new Set();
  for (const r of d.addedTopics || []) {
    if (typeof r.url !== "string" || !r.Topic?.trim() || !r.System?.trim())
      throw Error("Topic and System required.");
    const key =
      r.Topic.trim().toLowerCase() + "|" + r.System.trim().toLowerCase();
    if (pairs.has(key)) throw Error("Duplicate topic/system.");
    pairs.add(key);
  }
  for (const r of [
    ...(d.addedDays || []),
    ...(d.addedTopics || []),
    ...Object.values(d.edits || {}),
  ]) {
    if (!plain(r)) throw Error("Invalid edit.");
    numeric(r, ["Planned Hours"], 24, false);
    numeric(r, ["UWorld Target", "New Card Budget", "FA order"]);
    dates(
      r,
      Object.keys(r).filter((k) => /^date:.*:(start|end)$/.test(k)),
    );
    if (
      r["date:Start Date:start"] &&
      r["date:End Date:start"] &&
      r["date:Start Date:start"] > r["date:End Date:start"]
    )
      throw Error("End date precedes start date.");
    for (const k of [
      "FA Status",
      "B&B Status",
      "Anki Status",
      "UWorld Status",
      "Overall Status",
    ])
      enumValue(r, k, [
        "Not Started",
        "In Progress",
        "Reviewed",
        "Mastered",
        "Skipped",
      ]);
  }
  for (const s of Object.values(d.topic || {}))
    if (
      ![
        "Not Started",
        "In Progress",
        "Reviewed",
        "Mastered",
        "Skipped",
      ].includes(s)
    )
      throw Error("Invalid topic status.");
  for (const [key, t] of Object.entries(d.taskStates || {})) {
    if (
      !/^\d{4}-\d{2}-\d{2}-\d+$/.test(key) ||
      !dateOK(key.slice(0, 10)) ||
      !plain(t)
    )
      throw Error("Invalid task identity.");
    enumValue(t, "status", [
      "Not started",
      "In progress",
      "Completed",
      "Needs review",
      "Deferred",
      "Skipped",
    ]);
    enumValue(t, "priority", ["Normal", "High", "Low"]);
  }
  for (const r of d.weakness || []) {
    if (typeof r["Weak Topic"] !== "string" || !r["Weak Topic"].trim())
      throw Error("Weak concept required.");
    dates(r, ["Date Identified", "Review Date"]);
    enumValue(r, "Status", ["Open", "In Progress", "Resolved"]);
    enumValue(r, "Severity", ["High", "Medium", "Low"]);
    if (
      r._missionDates &&
      (!Array.isArray(r._missionDates) ||
        r._missionDates.some((x) => !dateOK(x)))
    )
      throw Error("Invalid mission links.");
  }
  for (const r of d.catchup || []) {
    if (typeof r.Item !== "string" || !r.Item.trim())
      throw Error("Catch-up title required.");
    dates(r, ["Rescheduled For", "_entryDate"]);
    numeric(r, ["Estimated Hours"], 24, false);
    enumValue(r, "Status", [
      "Queued",
      "Scheduled",
      "In Progress",
      "Done",
      "Dropped",
    ]);
  }
  for (const r of d.assessmentRecords || []) {
    if (!r.title?.trim()) throw Error("Assessment title required.");
    dates(r, ["date", "actualDate"]);
    enumValue(r, "status", ["Scheduled", "Completed", "Deferred", "Cancelled"]);
    enumValue(r, "metric", ["EPC %", "Percent correct", "Three-digit score"]);
    if (r.status === "Completed" && !dateOK(r.actualDate))
      throw Error("Completed assessment needs a date taken.");
    numeric(r, ["score"], r.metric === "Three-digit score" ? 300 : 100, false);
    numeric(r, ["probability"], 100, false);
  }
  for (const r of d.milestoneRecords || []) {
    if (!r.title?.trim()) throw Error("Milestone title required.");
    dates(r, ["date", "completedDate"]);
    enumValue(r, "status", ["Planned", "In Progress", "Achieved", "Deferred"]);
    if (r.status === "Achieved" && !dateOK(r.completedDate))
      throw Error("Achieved milestone needs a date.");
  }
  if (d.pause) {
    if (!plain(d.pause)) throw Error("Invalid pause.");
    dates(d.pause, ["start", "end"]);
    if (
      Boolean(d.pause.start) !== Boolean(d.pause.end) ||
      d.pause.start > d.pause.end
    )
      throw Error("Invalid break range.");
  }
  const p = d.preferences || {};
  numeric(p, ["weekday", "saturday", "sunday"], 24, false);
  numeric(p, ["questions"]);
  if (p.focusMinutes != null) {
    numeric(p, ["focusMinutes"], 720);
    if (+p.focusMinutes < 1) throw Error("Focus duration must be positive.");
  }
  if (p.timezone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: p.timezone });
    } catch {
      throw Error("Unknown timezone.");
    }
  }
  enumValue(p, "theme", ["Forest", "Soft contrast"]);
  enumValue(p, "density", ["Comfortable", "Compact"]);
  if (p.applyDefaults != null && typeof p.applyDefaults !== "boolean")
    throw Error("Invalid defaults flag.");
  const s = d.settings || {};
  dates(
    s,
    Object.keys(s).filter((k) => /^date:.*:start$/.test(k)),
  );
  numeric(s, ["New Card Budget", "UWorld Total Available"]);
  if (
    s["date:Provisional Window Start:start"] >
    s["date:Provisional Window End:start"]
  )
    throw Error("Invalid exam window.");
  if (d.resourceOrder) enumValue(d, "resourceOrder", ["study", "fa"]);
  if (d.profile?.photo) image(d.profile.photo);
  if (d.focusTimer) {
    const t = d.focusTimer;
    if (
      !plain(t) ||
      !Number.isInteger(t.duration) ||
      t.duration < 60 ||
      t.duration > 43200 ||
      !Number.isInteger(t.remaining) ||
      t.remaining < 0 ||
      t.remaining > t.duration ||
      typeof t.active !== "boolean" ||
      !Number.isFinite(t.end) ||
      t.end < 0 ||
      !Number.isFinite(t.wall)
    )
      throw Error("Invalid focus timer.");
  }
  return d;
}
function normalize(d, stablePrefix = "") {
  d = validateDemo(d);
  for (const k of arrays) {
    const seen = new Set();
    for (const [i, r] of (d[k] || []).entries()) {
      r.id ||=
        k === "logs" && !r._block
          ? "daily:" + r.date
          : r.url ||
            (stablePrefix
              ? "import:" + hash(stablePrefix + ":" + k + ":" + i).slice(0, 32)
              : randomUUID());
      if (seen.has(r.id)) throw Error("Duplicate identity in " + k);
      seen.add(r.id);
    }
  }
  return d;
}
function emptyDemo() {
  return {
    logs: [],
    weakness: [],
    catchup: [],
    addedDays: [],
    addedTopics: [],
    assessmentRecords: [],
    milestoneRecords: [],
    edits: {},
    topic: {},
    taskStates: {},
    checks: {},
    settings: {},
    preferences: {
      timezone: "Asia/Karachi",
      weekday: 4.5,
      saturday: 8,
      sunday: 0,
      questions: 20,
      focusMinutes: 25,
      theme: "Forest",
      density: "Comfortable",
    },
    weekly: {},
    reflections: {},
    profile: {},
    pause: { start: "", end: "", label: "No protected break set" },
    resourceOrder: "study",
  };
}
function validateSeed(seed) {
  if (
    !plain(seed) ||
    !Array.isArray(seed.daily) ||
    !Array.isArray(seed.curriculum) ||
    !plain(seed.settings)
  )
    throw Error("Invalid plan seed.");
  inspect(seed);
  validateDemo({
    addedDays: seed.daily,
    addedTopics: seed.curriculum,
    settings: seed.settings,
  });
  const out = clone(seed);
  for (const k of [
    "anki",
    "assessments",
    "weekly",
    "uworld",
    "milestones",
    "phases",
    "coverage",
  ]) {
    out[k] ??= [];
    if (!Array.isArray(out[k]) || out[k].some((r) => !plain(r)))
      throw Error("Invalid seed category: " + k);
  }
  out.guide ??= "";
  return out;
}
function sourceLogs(seed, logs = []) {
  const result = clone(logs),
    days = new Set(logs.filter((r) => !r._block).map((r) => r.date));
  const mapping = {
    hours: ["Actual Hours"],
    questions: ["UWorld Actual", "UWorld Actual Value"],
    correct: ["UWorld Correct", "UWorld Correct Value"],
    reviewed: ["UWorld Reviewed", "UWorld Reviewed Value"],
    anki: ["Anki Reviews", "Anki Reviews Value"],
    due: ["Anki Due", "Anki Due Value"],
    newcards: ["Anki New Cards", "Anki New Cards Value"],
  };
  for (const r of seed.daily || []) {
    const date = r["date:Date:start"];
    if (r["Day Logged?"] !== "__YES__" || days.has(date) || !dateOK(date))
      continue;
    const row = { id: "daily:" + date, date, _sourceId: r.url };
    for (const [k, keys] of Object.entries(mapping))
      for (const key of keys)
        if (typeof r[key] === "number" && Number.isFinite(r[key])) {
          row[k] = r[key];
          break;
        }
    if (Object.keys(row).length > 3) {
      result.push(row);
      days.add(date);
    }
  }
  return result;
}
module.exports = {
  sourceLogs,
  MAX_BYTES,
  arrays,
  maps,
  clone,
  hash,
  canonical,
  dateOK,
  parse,
  inspect,
  numeric,
  validateDemo,
  normalize,
  emptyDemo,
  image,
  validateSeed,
};
