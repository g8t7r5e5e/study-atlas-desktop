const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm");
const { compile } = require("../scripts/compile-handlers.cjs"),
  {
    approvedURL,
    windowBounds,
    trustedFrame,
  } = require("../src/main/security.cjs");
test("event compiler captures untrusted strings as values, never executable code", () => {
  const source =
    "const url=payload; function make(){return `<button onclick=\"take('${url}')\">Go</button>`}; function button(){return btn('Go',`take('${url}')`)}";
  const ctx = {
    payload: "');globalThis.pwned=true;//",
    take(v) {
      ctx.value = v;
    },
    registerAction(fn) {
      ctx.fn = fn;
      return "opaque";
    },
    btn(_text, fn) {
      ctx.fn = fn;
    },
  };
  vm.createContext(ctx);
  vm.runInContext(compile(source), ctx);
  assert.match(vm.runInContext("make()", ctx), /data-onclick/);
  ctx.fn({});
  assert.equal(ctx.value, ctx.payload);
  assert.equal(ctx.pwned, undefined);
  vm.runInContext("button()", ctx);
  ctx.fn({});
  assert.equal(ctx.value, ctx.payload);
  assert.equal(ctx.pwned, undefined);
});
test("external protocols, credentials and lookalike hosts are denied", () => {
  for (const u of [
    "file:///tmp/a",
    "javascript:alert(1)",
    "https://www.nbme.org.evil.test",
    "http://www.nbme.org",
    "https://user:pass@www.nbme.org",
    "https://app.notion.com/private",
  ])
    assert.equal(approvedURL(u), null);
  assert.equal(approvedURL("https://www.nbme.org/"), "https://www.nbme.org/");
});
test("offscreen and oversized window bounds recover", () => {
  const d = [{ workArea: { x: 0, y: 0, width: 1366, height: 768 } }];
  assert.deepEqual(
    windowBounds({ x: 5000, y: 5000, width: 1440, height: 900 }, d),
    { width: 1366, height: 768 },
  );
  assert.deepEqual(
    windowBounds({ x: 20, y: 30, width: 2000, height: 1200 }, d),
    { x: 0, y: 0, width: 1366, height: 768 },
  );
});
test("IPC requires the application top frame", () => {
  const frame = { url: "atlas://app/index.html" };
  assert.ok(trustedFrame({ senderFrame: frame, sender: { mainFrame: frame } }));
  assert.equal(
    trustedFrame({
      senderFrame: { url: "https://evil.test" },
      sender: { mainFrame: frame },
    }),
    false,
  );
});
