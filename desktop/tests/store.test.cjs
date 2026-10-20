const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { DatabaseSync } = require("node:sqlite"),
  { Store } = require("../src/main/store.cjs"),
  M = require("../src/main/model.cjs");
const seed = require("../assets/seed.json"),
  fixture = require("../../examples/prototype-backup.synthetic.json");
function fresh(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-test-"));
  const store = new Store(dir, seed);
  t.after(() => {
    try {
      store.close();
    } catch {}
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return store;
}
test("friend first run is empty, seeded once, and restart retains stable IDs", (t) => {
  const s = fresh(t);
  assert.equal(s.load().demo.logs.length, 0);
  assert.equal(s.load().seed.daily.length, 0);
  assert.equal(JSON.stringify(s.load()).includes("notion.com"), false);
  let x = s.load();
  x.demo.logs.push({
    date: "2027-07-01",
    hours: 3,
    questions: 20,
    correct: 15,
    reviewed: 18,
  });
  s.save(x);
  const before = s.load();
  s.close();
  const next = new Store(s.dir, seed);
  assert.deepEqual(next.load(), before);
  next.close();
});
test("mission + edited mission + separate block + Anki use shared identities and totals", (t) => {
  const s = fresh(t);
  let x = s.load();
  x.demo.logs = [
    {
      date: "2027-07-01",
      questions: 20,
      correct: 15,
      reviewed: 18,
      hours: 3,
      anki: 80,
      due: 100,
      newcards: 5,
    },
  ];
  s.save(x);
  x = s.load();
  const id = x.demo.logs[0].id;
  Object.assign(x.demo.logs[0], { questions: 24, correct: 18, reviewed: 22 });
  x.demo.logs.push({
    date: "2027-07-01",
    _block: true,
    questions: 10,
    correct: 8,
    reviewed: 10,
  });
  s.save(x);
  x = s.load();
  Object.assign(x.demo.logs[0], { anki: 90, deck: "Example" });
  s.save(x);
  const logs = s.load().demo.logs;
  assert.equal(logs.length, 2);
  assert.equal(logs[0].id, id);
  assert.equal(logs[0].hours, 3);
  assert.equal(
    logs.reduce((n, r) => n + r.questions, 0),
    34,
  );
  assert.equal(
    logs.reduce((n, r) => n + r.correct, 0),
    26,
  );
});
test("prototype import covers every category, retains extensions and is idempotent", (t) => {
  const s = fresh(t);
  const x = M.clone(fixture);
  x.demo.legacyExtra = { detail: "retained" };
  const text = JSON.stringify(x);
  const preview = s.preview(text);
  assert.equal(preview.type, "prototype");
  assert.equal(preview.unresolved, 2);
  const receipt = s.import(text);
  assert.equal(receipt.counts.logs, 2);
  assert.equal(s.import(text).alreadyImported, true);
  const d = s.load().demo;
  for (const key of Object.keys(x.demo)) assert.ok(Object.hasOwn(d, key), key);
  assert.equal(d.logs.length, 2);
  assert.equal(
    d.weekly["legacy-example"]["Biggest Wins"],
    "Synthetic legacy reflection",
  );
  assert.equal(d.profile.name, "Example Student");
  assert.ok(fs.existsSync(receipt.safety));
});
test("complete backup round trip retains identities, assets, seed, history, receipts and blank values", (t) => {
  const s = fresh(t),
    dest = fresh(t);
  s.import(JSON.stringify(fixture));
  let x = s.load();
  x.demo.profile.photo =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfS8AAAAASUVORK5CYII=";
  s.save(x);
  const snap = s.snapshot();
  dest.import(JSON.stringify(snap));
  assert.deepEqual(dest.load().demo, s.load().demo);
  assert.deepEqual(dest.load().seed, s.load().seed);
  assert.equal(dest.load().demo.assessmentRecords[0].probability, "");
  assert.equal(dest.snapshot().events.length, snap.events.length);
  assert.ok(fs.readdirSync(path.join(dest.dir, "assets")).length);
});
test("malformed, oversized, unknown-version, malicious and invalid data do not change DB", (t) => {
  const s = fresh(t),
    before = s.load();
  for (const text of [
    "{",
    JSON.stringify({ version: 99, demo: {} }),
    '{"version":1,"demo":{"__proto__":{"evil":true}}}',
    JSON.stringify({ version: 1, demo: { logs: [{ date: "2027-02-30" }] } }),
    " ".repeat(M.MAX_BYTES + 1),
  ])
    assert.throws(() => s.import(text));
  assert.deepEqual(s.load(), before);
  const x = s.load();
  x.demo.logs = [{ date: "2027-07-01", questions: 2, correct: 3 }];
  assert.throws(() => s.save(x), /cannot exceed/);
  assert.deepEqual(s.load(), before);
});
test("main validation rejects duplicates, bad enums, impossible counts and stale saves", (t) => {
  const s = fresh(t);
  for (const demo of [
    { logs: [{ date: "2027-01-01" }, { date: "2027-01-01" }] },
    { logs: [{ date: "2027-01-01", questions: -1 }] },
    { preferences: { timezone: "Fake/Zone" } },
    {
      assessmentRecords: [
        { title: "Test", status: "Completed", score: 101, metric: "EPC %" },
      ],
    },
    { milestoneRecords: [{ title: "Test", status: "Achieved" }] },
    { topic: { a: "Magic" } },
    { profile: { photo: "data:image/png;base64,AAAAAAAAAAAAAAAA" } },
  ])
    assert.throws(() => s.save({ demo }));
  const x = s.load();
  s.save(x);
  assert.throws(() => s.save(x), /changed/);
});
test("restore transaction rollback keeps current data after injected write failure", (t) => {
  const s = fresh(t);
  const before = s.load();
  const write = s.write.bind(s);
  s.write = (x) => {
    write(x);
    throw Error("Injected write failure");
  };
  assert.throws(() => s.import(JSON.stringify(fixture)), /Injected/);
  assert.deepEqual(s.load(), before);
  assert.equal(s.db.prepare("SELECT COUNT(*) n FROM imports").get().n, 0);
  assert.ok(fs.readdirSync(s.backups).some((x) => x.startsWith("pre-import")));
});
test("schema 1 upgrades to schema 2 without changing records", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-v1-"));
  const db = new DatabaseSync(path.join(dir, "atlas.sqlite"));
  db.exec(
    fs.readFileSync(path.join(__dirname, "../migrations/001.sql"), "utf8"),
  );
  const put = db.prepare("INSERT INTO meta VALUES(?,?)");
  put.run("initialized", "true");
  put.run("seed", JSON.stringify(seed));
  put.run("demo", JSON.stringify({ profile: { name: "Synthetic" } }));
  put.run("arrayKeys", '["logs"]');
  db.prepare("INSERT INTO records VALUES(?,?,?,?,?,?)").run(
    "logs",
    "daily:2027-07-01",
    0,
    "2027-07-01",
    1,
    JSON.stringify({ id: "daily:2027-07-01", date: "2027-07-01", hours: 2 }),
  );
  db.close();
  const s = new Store(dir, seed);
  assert.equal(s.db.prepare("PRAGMA user_version").get().user_version, 2);
  assert.equal(s.load().demo.logs[0].hours, 2);
  assert.equal(s.load().demo.profile.name, "Synthetic");
  s.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
test("automatic backups rotate, pre-restore copies survive and corrupt restore is rejected", (t) => {
  const s = fresh(t);
  for (let i = 0; i < 9; i++) s.backup("auto");
  s.backup("pre-import");
  assert.equal(
    fs.readdirSync(s.backups).filter((x) => x.startsWith("auto-")).length,
    7,
  );
  assert.equal(
    fs.readdirSync(s.backups).filter((x) => x.startsWith("pre-import")).length,
    1,
  );
});
test("present-empty lists remain empty; missing lists use explicit owner seed defaults", (t) => {
  const s = fresh(t);
  s.setMeta("seed", {
    ...seed,
    assessments: [
      {
        url: "a",
        Assessment: "Example",
        Status: "Scheduled",
        "date:Date:start": "2027-07-01",
      },
    ],
  });
  s.import(JSON.stringify({ version: 1, demo: { profile: { name: "A" } } }));
  assert.equal(s.load().demo.assessmentRecords.length, 1);
  s.import(
    JSON.stringify({
      version: 1,
      demo: { assessmentRecords: [], profile: { name: "B" } },
    }),
  );
  assert.equal(s.load().demo.assessmentRecords.length, 0);
});
test("source IDs and edits resolve after separate owner-plan import; activity survives", (t) => {
  const s = fresh(t);
  s.import(JSON.stringify(fixture));
  const plan = {
    ...seed,
    daily: [
      {
        url: Object.keys(fixture.demo.edits)[0],
        "date:Date:start": "2026-10-16",
        "Main Task": "Original",
      },
    ],
  };
  const old = s.load().demo.logs;
  s.import(
    JSON.stringify({
      format: "study-atlas-owner-plan",
      version: 1,
      seed: plan,
    }),
  );
  assert.deepEqual(s.load().demo.logs, old);
  assert.equal(s.load().seed.daily[0].url, Object.keys(fixture.demo.edits)[0]);
});
test("source actuals are included only when explicitly logged and not superseded; unresolved formulas stay nonnumeric", () => {
  const src = {
    daily: [
      {
        url: "a",
        "date:Date:start": "2027-07-01",
        "Day Logged?": "__YES__",
        "Actual Hours": 2,
        "UWorld Actual Value": 20,
        "UWorld Correct Value": "formulaResult://unresolved",
      },
      { url: "b", "date:Date:start": "2027-07-02", "Actual Hours": 4 },
    ],
  };
  const logs = M.sourceLogs(src, []);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].hours, 2);
  assert.equal(logs[0].correct, undefined);
  assert.equal(
    M.sourceLogs(src, [{ date: "2027-07-01", hours: 3 }])[0].hours,
    3,
  );
});
test("the same backup may deliberately restore again after later edits without duplicates", (t) => {
  const s = fresh(t);
  const text = JSON.stringify(fixture);
  s.import(text);
  assert.equal(s.preview(text).alreadyImported, true);
  const x = s.load();
  x.demo.logs[0].hours = 6;
  s.save(x);
  assert.equal(s.preview(text).alreadyImported, false);
  s.import(text);
  assert.equal(s.load().demo.logs.length, 2);
  assert.equal(s.load().demo.logs[0].hours, "3");
});
