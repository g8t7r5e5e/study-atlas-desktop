const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const { auditArchive } = require("../scripts/audit-archive.cjs");

for (const [platform, paths] of [["Windows", path.win32], ["Unix", path.posix]]) {
  test(`archive audit reads scoped packages with ${platform} path semantics`, () => {
    // Exercise ASAR's actual traversal, not a mock that tolerates both separators.
    const entry = require.resolve("@electron/asar");
    const file = path.join(path.dirname(entry), "filesystem.js");
    const localRequire = createRequire(file);
    const exported = {};
    vm.runInNewContext(fs.readFileSync(file, "utf8"), {
      exports: exported,
      require: (name) => name === "path" ? paths : localRequire(name),
      Buffer,
    }, { filename: file });
    const archive = new exported.Filesystem("fixture");
    const header = () => ({ files: {
      node_modules: { files: {
        "@nodable": { files: {
          entities: { files: { "index.js": { size: 7, offset: "0" } } },
        } },
      } },
    } });
    archive.setHeader(header(), 0);
    if (platform === "Windows") {
      assert.throws(() => archive.getFile("node_modules/@nodable/entities"), /not found/);
      archive.setHeader(header(), 0);
    }
    const seen = [];
    auditArchive("fixture.asar", (name, bytes) => seen.push([name, bytes.toString()]), {
      listPackage: () => archive.listFiles(),
      statFile: (_file, name) => archive.getFile(name),
      extractFile: (_file, name) => {
        assert.equal(archive.getFile(name).size, 7);
        return Buffer.from("fixture");
      },
    }, paths);
    assert.deepEqual(seen, [["node_modules/@nodable/entities/index.js", "fixture"]]);
  });
}
