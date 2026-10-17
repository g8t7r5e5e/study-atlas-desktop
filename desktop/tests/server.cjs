// Test-only local harness. Never packaged. Exercises real SQLite through a synchronous bridge.
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const { Store } = require("../src/main/store.cjs");
const { readSpreadsheet } = require("../src/main/spreadsheets.cjs");
const root = path.join(__dirname, ".."),
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-browser-")),
  seed = require("../assets/seed.json");
let store = new Store(dir, seed),
  selected = null;
const bridge = `(()=>{function rpc(op,value){const r=new XMLHttpRequest();r.open('POST','/api/'+op,false);r.setRequestHeader('content-type','application/json');r.send(JSON.stringify(value??null));const x=JSON.parse(r.responseText);if(!x.ok)throw Error(x.error);return x.value;}window.atlas={load:()=>rpc('load'),save:x=>rpc('save',x),paths:()=>({backups:'Synthetic test backups'}),confirmDiscard:()=>true,exportBackup:async()=>rpc('export'),previewBackup:async()=>rpc('preview'),importBackup:async()=>rpc('import'),openBackups:async()=>true,spreadsheet:async()=>rpc('spreadsheet'),photo:async()=>rpc('photo'),reset:async()=>rpc('reset')};})();`;
const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) {
      let data = "";
      for await (const b of req) data += b;
      if (data.length > 22e6) throw Error("Too large");
      const v = JSON.parse(data || "null"),
        op = req.url.slice(5);
      let result;
      switch (op) {
        case "load":
          result = store.load();
          break;
        case "save":
          result = store.save(v);
          break;
        case "reset":
          result = store.reset(seed);
          break;
        case "fixture":
          selected = v;
          result = true;
          break;
        case "preview":
          result = store.preview(selected.text);
          delete result._data;
          result.token = "test-preview";
          break;
        case "import":
          result = store.import(selected.text);
          break;
        case "spreadsheet":
          result = readSpreadsheet(
            Buffer.from(selected.base64, "base64"),
            selected.name,
          );
          break;
        case "photo":
          result = selected;
          break;
        case "export":
          result = store.snapshot();
          break;
        case "seed":
          store.setMeta("seed", v);
          result = true;
          break;
        case "failure":
          store.db.exec(v ? "PRAGMA query_only=ON" : "PRAGMA query_only=OFF");
          result = true;
          break;
        default:
          throw Error("Unknown operation");
      }
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true, value: result }));
      return;
    }
    if (req.url === "/test-bridge.js") {
      res.setHeader("content-type", "text/javascript");
      res.end(bridge);
      return;
    }
    const reference = req.url.startsWith("/reference/");
    const base = reference
      ? path.resolve(root, "../prototype")
      : path.join(root, "dist");
    const name = decodeURIComponent(
      req.url.split("?")[0].replace(/^\/reference\//, "/"),
    );
    const file = path.resolve(
      base,
      "." + (name === "/" ? "/index.html" : name),
    );
    if (!file.startsWith(base + path.sep)) throw Error("Forbidden");
    let body = fs.readFileSync(file);
    if (file.endsWith("index.html") && !reference)
      body = body
        .toString()
        .replace("connect-src 'none'", "connect-src 'self'")
        .replace(
          '<script src="bootstrap.js">',
          '<script src="/test-bridge.js"></script><script src="bootstrap.js">',
        );
    if (reference && file.endsWith("style.css"))
      body = fs.readFileSync(path.join(root, "dist/style.css"));
    res.setHeader(
      "content-type",
      file.endsWith(".html")
        ? "text/html"
        : file.endsWith(".js")
          ? "text/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : file.endsWith(".json")
              ? "application/json"
              : "application/octet-stream",
    );
    res.end(body);
  } catch (e) {
    res.statusCode = 400;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, error: e.message }));
  }
});
server.listen(4184, "127.0.0.1");
function stop() {
  store.close();
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
  process.exit();
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
