"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const M = require("./model.cjs");
const SCHEMA = 2;
class Store {
  constructor(dir, seed) {
    this.dir = dir;
    this.backups = path.join(dir, "backups");
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(this.backups, { recursive: true });
    fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
    this.db = new DatabaseSync(path.join(dir, "atlas.sqlite"));
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
    );
    const version = this.db.prepare("PRAGMA user_version").get().user_version;
    if (version > SCHEMA)
      throw Error("This database needs a newer Study Atlas version.");
    for (let n = version + 1; n <= SCHEMA; n++) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        this.db.exec(
          fs.readFileSync(
            path.join(
              __dirname,
              "../../migrations",
              String(n).padStart(3, "0") + ".sql",
            ),
            "utf8",
          ),
        );
        this.db.exec("COMMIT");
      } catch (e) {
        this.db.exec("ROLLBACK");
        throw e;
      }
    }
    if (!this.meta("initialized")) {
      this.save({ demo: M.emptyDemo(), ui: {} }, false);
      this.setMeta("seed", M.validateSeed(seed));
      this.setMeta("initialized", true);
    }
    this.materializeAssets();
    this.autoBackup();
  }
  meta(k) {
    const r = this.db.prepare("SELECT value FROM meta WHERE key=?").get(k);
    return r ? JSON.parse(r.value) : undefined;
  }
  setMeta(k, v) {
    this.db
      .prepare(
        "INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .run(k, JSON.stringify(v));
  }
  transaction(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const r = fn();
      this.db.exec("COMMIT");
      return r;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  load() {
    const demo = this.meta("demo") || {};
    for (const key of this.meta("arrayKeys") || []) demo[key] = [];
    for (const row of this.db
      .prepare("SELECT category,body FROM records ORDER BY category,ordinal")
      .all())
      (demo[row.category] ||= []).push(JSON.parse(row.body));
    if (demo.profile?.photoAsset) {
      const a = this.db
        .prepare("SELECT mime,bytes FROM assets WHERE id=?")
        .get(demo.profile.photoAsset);
      if (!a) throw Error("Profile image is missing. Restore a backup.");
      demo.profile.photo =
        "data:" + a.mime + ";base64," + Buffer.from(a.bytes).toString("base64");
    }
    return {
      demo,
      ui: this.meta("ui") || {},
      seed: this.meta("seed"),
      revision: this.meta("revision") || 0,
    };
  }
  write(input) {
    const d = M.normalize(input.demo);
    const previous = this.load().demo;
    const photo = M.image(d.profile?.photo);
    if (photo) {
      this.db
        .prepare("INSERT OR IGNORE INTO assets(id,mime,bytes) VALUES(?,?,?)")
        .run(photo.id, photo.mime, photo.bytes);
      d.profile.photoAsset = photo.id;
      delete d.profile.photo;
    } else if (d.profile) delete d.profile.photoAsset;
    this.db.exec("DELETE FROM records");
    const insert = this.db.prepare(
      "INSERT INTO records(category,id,ordinal,date,daily,body) VALUES(?,?,?,?,?,?)",
    );
    const keys = [];
    for (const k of M.arrays)
      if (Object.hasOwn(d, k)) {
        keys.push(k);
        d[k].forEach((r, i) =>
          insert.run(
            k,
            r.id,
            i,
            r.date || r["date:Date:start"] || null,
            k === "logs" && !r._block ? 1 : 0,
            JSON.stringify(r),
          ),
        );
        delete d[k];
      }
    for (const [id, status] of Object.entries(d.topic || {}))
      if (previous.topic?.[id] !== status)
        this.db
          .prepare("INSERT INTO topic_events(topic,status,at) VALUES(?,?,?)")
          .run(id, status, new Date().toISOString());
    this.setMeta("demo", d);
    this.setMeta("arrayKeys", keys);
    this.setMeta("ui", this.validateUI(input.ui || {}));
    this.setMeta("revision", (this.meta("revision") || 0) + 1);
  }
  validateUI(ui) {
    M.inspect(ui);
    const out = {};
    if (M.dateOK(ui.date)) out.date = ui.date;
    if (Number.isInteger(ui.month) && ui.month >= 0 && ui.month < 12)
      out.month = ui.month;
    if (Number.isInteger(ui.year) && ui.year >= 1900 && ui.year <= 9999)
      out.year = ui.year;
    return out;
  }
  save(input, backup = true) {
    if (!input || !input.demo) throw Error("Missing workspace.");
    M.validateDemo(input.demo);
    if (
      input.revision != null &&
      input.revision !== (this.meta("revision") || 0)
    )
      throw Error("Workspace changed. Reload before saving.");
    this.transaction(() => this.write(input));
    let warning;
    try {
      this.materializeAssets();
      if (backup) this.autoBackup();
    } catch (e) {
      warning = "Records saved, but backup/asset copy failed: " + e.message;
    }
    return { ...this.load(), warning };
  }
  materializeAssets() {
    for (const a of this.db.prepare("SELECT id,mime,bytes FROM assets").all()) {
      const file = path.join(
        this.dir,
        "assets",
        a.id + "." + a.mime.split("/")[1],
      );
      if (!fs.existsSync(file))
        fs.writeFileSync(file, a.bytes, { mode: 0o600 });
    }
  }
  snapshot() {
    return this.transaction(() => {
      const s = this.load();
      return {
        format: "study-atlas-desktop",
        version: 2,
        schema: SCHEMA,
        exportedAt: new Date().toISOString(),
        demo: s.demo,
        ui: s.ui,
        seed: s.seed,
        events: this.db
          .prepare("SELECT topic,status,at FROM topic_events ORDER BY id")
          .all(),
        receipts: this.db
          .prepare("SELECT hash,receipt FROM imports")
          .all()
          .map((r) => ({ hash: r.hash, ...JSON.parse(r.receipt) })),
      };
    });
  }
  atomicJSON(file, value) {
    const tmp = file + "." + process.pid + ".tmp";
    const fd = fs.openSync(tmp, "wx", 0o600);
    try {
      fs.writeFileSync(fd, JSON.stringify(value, null, 2));
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    try {
      fs.renameSync(tmp, file);
    } catch (e) {
      fs.rmSync(tmp, { force: true });
      throw e;
    }
  }
  backup(reason = "manual") {
    const file = path.join(
      this.backups,
      `${reason}-${new Date().toISOString().replace(/[:.]/g, "-")}-${require("node:crypto").randomUUID().slice(0, 8)}.json`,
    );
    this.atomicJSON(file, this.snapshot());
    if (reason === "auto") {
      const files = fs
        .readdirSync(this.backups)
        .filter((f) => f.startsWith("auto-") && f.endsWith(".json"))
        .sort()
        .reverse();
      for (const name of files.slice(7))
        fs.unlinkSync(path.join(this.backups, name));
    }
    return file;
  }
  autoBackup() {
    const day = new Date().toISOString().slice(0, 10);
    if (this.meta("lastAutoDay") !== day) {
      this.backup("auto");
      this.setMeta("lastAutoDay", day);
    }
  }
  export(file) {
    this.atomicJSON(file, this.snapshot());
    return { file };
  }
  preview(text) {
    const x = M.parse(text);
    let type, seed, demo;
    if (x.format === "study-atlas-owner-plan" && x.version === 1) {
      type = "owner-plan";
      seed = M.validateSeed(x.seed);
      demo = this.load().demo;
    } else if (x.format === "study-atlas-desktop") {
      if (![1, 2].includes(x.version) || x.schema > SCHEMA)
        throw Error("Unsupported desktop backup version.");
      type = "desktop";
      seed = M.validateSeed(x.seed);
      demo = M.normalize(x.demo, M.hash(x.demo));
      if (x.events && !Array.isArray(x.events))
        throw Error("Invalid topic history.");
      for (const e of x.events || [])
        if (
          typeof e.topic !== "string" ||
          typeof e.status !== "string" ||
          isNaN(Date.parse(e.at))
        )
          throw Error("Invalid topic history event.");
      if (x.receipts && !Array.isArray(x.receipts))
        throw Error("Invalid import receipts.");
      for (const r of x.receipts || [])
        if (!/^[a-f0-9]{64}$/.test(r.hash))
          throw Error("Invalid import receipt.");
    } else if (
      (x.version === 1 && !x.format && x.demo) ||
      (x.version === undefined && x.demo && x.ui)
    ) {
      type = "prototype";
      demo = M.normalize(x.demo, M.hash(x.demo));
    } else throw Error("Choose a supported prototype or desktop JSON backup.");
    const hash = M.hash(type === "owner-plan" ? seed : { type, demo });
    const old = this.db
      .prepare("SELECT receipt FROM imports WHERE hash=?")
      .get(hash);
    const current = this.load();
    const counts = {};
    for (const k of M.arrays) counts[k] = (demo[k] || []).length;
    const effectiveSeed = seed || current.seed;
    const known = new Set(
      [
        ...effectiveSeed.daily,
        ...effectiveSeed.curriculum,
        ...(demo.addedDays || []),
        ...(demo.addedTopics || []),
      ].map((r) => r.url),
    );
    const unresolved = Object.keys(demo.edits || {}).filter(
      (k) => !known.has(k),
    ).length;
    let added = 0,
      updated = 0;
    for (const k of M.arrays) {
      const ids = new Set((current.demo[k] || []).map((r) => r.id));
      for (const r of demo[k] || []) ids.has(r.id) ? updated++ : added++;
    }
    return {
      type,
      hash,
      counts,
      unresolved,
      alreadyImported:
        !!old &&
        JSON.parse(old.receipt).appliedRevision === (current.revision || 0),
      policy:
        type === "owner-plan"
          ? "Replace the base plan; keep your activity and explicit edits."
          : "Replace this workspace with the backup. A safety backup is created first.",
      added,
      updated,
      skipped: old ? Object.values(counts).reduce((a, b) => a + b, 0) : 0,
      conflicted: unresolved,
      _data: { ...x, demo, seed },
    };
  }
  import(text) {
    const p = this.preview(text);
    if (p.alreadyImported)
      return {
        ...JSON.parse(
          this.db
            .prepare("SELECT receipt FROM imports WHERE hash=?")
            .get(p.hash).receipt,
        ),
        alreadyImported: true,
        added: 0,
        updated: 0,
        skipped: Object.values(p.counts).reduce((sum, n) => sum + n, 0),
      };
    const safety = this.backup("pre-import");
    const x = p._data;
    const receipt = {
      hash: p.hash,
      type: p.type,
      at: new Date().toISOString(),
      counts: p.counts,
      added: p.added,
      updated: p.updated,
      skipped: 0,
      conflicted: p.conflicted,
      unresolved: p.unresolved,
      safety,
    };
    this.transaction(() => {
      if (p.type === "owner-plan") {
        this.setMeta("seed", x.seed);
        const state = this.load();
        state.demo.logs = M.sourceLogs(x.seed, state.demo.logs);
        this.write(state);
      } else {
        const current = this.load();
        const imported = { ...M.emptyDemo(), ...x.demo };
        if (!Object.hasOwn(x.demo, "assessmentRecords"))
          imported.assessmentRecords = ((x.seed || current.seed).assessments || []).map(
            (r) => ({
              id: r.url,
              title: r.Assessment,
              date: r["date:Date:start"] || "",
              status: r.Status || "Scheduled",
              score: "",
              metric: "EPC %",
              probability: "",
              actualDate: "",
            }),
          );
        if (!Object.hasOwn(x.demo, "milestoneRecords"))
          imported.milestoneRecords = ((x.seed || current.seed).milestones || []).map(
            (r) => ({
              id: r.url,
              title: r.Milestone,
              date: r["date:Date:start"] || "",
              category: r.Type || "Study",
              status: "Planned",
              completedDate: "",
            }),
          );
        imported.logs = M.sourceLogs(x.seed || current.seed, imported.logs);
        this.write({ demo: imported, ui: x.ui || {} });
        if (x.seed) this.setMeta("seed", x.seed);
        this.db.exec("DELETE FROM topic_events");
        for (const e of x.events || [])
          this.db
            .prepare("INSERT INTO topic_events(topic,status,at) VALUES(?,?,?)")
            .run(e.topic, e.status, e.at);
        for (const r of x.receipts || [])
          this.db
            .prepare("INSERT OR IGNORE INTO imports(hash,receipt) VALUES(?,?)")
            .run(r.hash, JSON.stringify(r));
      }
      receipt.appliedRevision = this.meta("revision") || 0;
      this.db
        .prepare(
          "INSERT INTO imports(hash,receipt) VALUES(?,?) ON CONFLICT(hash) DO UPDATE SET receipt=excluded.receipt",
        )
        .run(p.hash, JSON.stringify(receipt));
    });
    this.materializeAssets();
    return receipt;
  }
  reset(seed) {
    const safety = this.backup("pre-reset");
    this.transaction(() => {
      this.write({ demo: M.emptyDemo(), ui: {} });
      this.setMeta("seed", seed);
      this.db.exec(
        "DELETE FROM imports; DELETE FROM topic_events; DELETE FROM assets;",
      );
    });
    return { safety };
  }
  close() {
    this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    this.db.close();
  }
}
module.exports = { Store, SCHEMA };
