"use strict";
const {
  app,
  BrowserWindow,
  protocol,
  ipcMain,
  dialog,
  shell,
  session,
  screen,
  powerMonitor,
} = require("electron");
const fs = require("node:fs"),
  path = require("node:path"),
  { randomUUID } = require("node:crypto");
const { Store } = require("./store.cjs"),
  { MAX_BYTES, image } = require("./model.cjs"),
  { readSpreadsheet } = require("./spreadsheets.cjs"),
  { approvedURL, trustedFrame, windowBounds } = require("./security.cjs");
protocol.registerSchemesAsPrivileged([
  {
    scheme: "atlas",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);
const root = path.resolve(__dirname, "../../dist");
const testProfile = process.env.STUDY_ATLAS_TEST_PROFILE;
if (testProfile && app.isPackaged && !process.env.STUDY_ATLAS_INSTALLED_TEST)
  throw Error("Test profile override is disabled in normal packaged runs.");
app.setPath(
  "userData",
  testProfile
    ? path.resolve(testProfile)
    : path.join(app.getPath("appData"), "Study Atlas"),
);
const logDir = path.join(app.getPath("userData"), "logs");
function logEvent(event, error) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
    const file = path.join(logDir, "application.log");
    if (fs.existsSync(file) && fs.statSync(file).size > 1024 * 1024) {
      fs.rmSync(file + ".1", { force: true });
      fs.renameSync(file, file + ".1");
    }
    fs.appendFileSync(
      file,
      JSON.stringify({
        at: new Date().toISOString(),
        event,
        code: error?.code || error?.name || null,
      }) + "\n",
    );
  } catch {}
}
let store, win;
const pending = new Map();
let closing = false;
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });
  app
    .whenReady()
    .then(async () => {
      const seed = JSON.parse(
        fs.readFileSync(path.join(root, "seed.json"), "utf8"),
      );
      store = new Store(app.getPath("userData"), seed);
      protocol.handle("atlas", (request) => {
        const u = new URL(request.url);
        if (u.hostname !== "app")
          return new Response("Forbidden", { status: 403 });
        let relative;
        try {
          relative = decodeURIComponent(u.pathname);
        } catch {
          return new Response("Invalid URL", { status: 400 });
        }
        const file = path.resolve(root, "." + relative);
        if (!file.startsWith(root + path.sep))
          return new Response("Forbidden", { status: 403 });
        try {
          const body = fs.readFileSync(file);
          const mime =
            {
              ".html": "text/html",
              ".js": "text/javascript",
              ".css": "text/css",
              ".json": "application/json",
              ".woff2": "font/woff2",
              ".png": "image/png",
            }[path.extname(file)] || "application/octet-stream";
          return new Response(body, {
            headers: {
              "content-type": mime,
              "X-Content-Type-Options": "nosniff",
            },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      });
      session.defaultSession.setPermissionRequestHandler(
        (_wc, _permission, callback) => callback(false),
      );
      session.defaultSession.setPermissionCheckHandler(() => false);
      session.defaultSession.webRequest.onBeforeRequest((details, callback) =>
        callback({
          cancel: !["atlas:", "data:", "blob:", "devtools:"].some((p) =>
            details.url.startsWith(p),
          ),
        }),
      );
      function guard(event, fn) {
        if (!trustedFrame(event)) throw Error("Untrusted IPC sender.");
        return fn();
      }
      function sync(name, fn) {
        ipcMain.on("atlas:" + name, (event, value) => {
          try {
            event.returnValue = {
              ok: true,
              value: guard(event, () => fn(value)),
            };
          } catch (e) {
            logEvent("ipc-" + name, e);
            event.returnValue = { ok: false, error: e.message };
          }
        });
      }
      function asyncHandler(name, fn) {
        ipcMain.handle("atlas:" + name, async (event, value) => {
          try {
            guard(event, () => true);
            return { ok: true, value: await fn(value) };
          } catch (e) {
            logEvent("ipc-" + name, e);
            return { ok: false, error: e.message };
          }
        });
      }
      function readLimited(file, max) {
        const st = fs.statSync(file);
        if (!st.isFile() || st.size > max)
          throw Error("Selected file is too large.");
        return fs.readFileSync(file);
      }
      async function choose(filters) {
        const r = await dialog.showOpenDialog(win, {
          properties: ["openFile"],
          filters,
        });
        return r.canceled ? null : r.filePaths[0];
      }
      sync("load", () => store.load());
      sync("save", (value) => store.save(value));
      sync("paths", () => ({ backups: store.backups }));
      sync(
        "discard",
        () =>
          dialog.showMessageBoxSync(win, {
            type: "question",
            message: "Discard unsaved changes?",
            buttons: ["Keep editing", "Discard changes"],
            defaultId: 0,
            cancelId: 0,
          }) === 1,
      );
      asyncHandler("export", async () => {
        const r = await dialog.showSaveDialog(win, {
          defaultPath:
            "study-atlas-backup-" +
            new Date().toISOString().slice(0, 10) +
            ".json",
          filters: [{ name: "Study Atlas backup", extensions: ["json"] }],
        });
        return r.canceled ? null : store.export(r.filePath);
      });
      asyncHandler("preview", async () => {
        const file = await choose([
          { name: "Study Atlas JSON", extensions: ["json"] },
        ]);
        if (!file) return null;
        const text = readLimited(file, MAX_BYTES).toString("utf8");
        const p = store.preview(text);
        const token = randomUUID();
        pending.clear();
        pending.set(token, { text, expires: Date.now() + 10 * 60 * 1000 });
        delete p._data;
        return { ...p, token };
      });
      asyncHandler("import", (token) => {
        if (typeof token !== "string") throw Error("Invalid import token.");
        const item = pending.get(token);
        if (!item || item.expires < Date.now())
          throw Error("Import preview expired. Choose the file again.");
        const r = store.import(item.text);
        pending.delete(token);
        return r;
      });
      asyncHandler("open-backups", async () => {
        const error = await shell.openPath(store.backups);
        if (error) throw Error(error);
        return true;
      });
      asyncHandler("spreadsheet", async () => {
        const file = await choose([
          { name: "Study spreadsheet", extensions: ["csv", "xlsx"] },
        ]);
        return file
          ? readSpreadsheet(readLimited(file, 10 * 1024 * 1024), file)
          : null;
      });
      asyncHandler("photo", async () => {
        const file = await choose([
          { name: "Profile image", extensions: ["jpg", "jpeg", "png", "webp"] },
        ]);
        if (!file) return null;
        const extension = path.extname(file).slice(1).toLowerCase(),
          mime = "image/" + (extension === "jpg" ? "jpeg" : extension),
          bytes = readLimited(file, 5 * 1024 * 1024);
        image("data:" + mime + ";base64," + bytes.toString("base64"));
        return { extension, mime, base64: bytes.toString("base64") };
      });
      asyncHandler("reset", async () => {
        const r = await dialog.showMessageBox(win, {
          type: "warning",
          message: "Reset this local workspace?",
          detail:
            "A complete safety backup is saved first. This clears activity and restores the generic curriculum.",
          buttons: ["Keep records", "Reset workspace"],
          defaultId: 0,
          cancelId: 0,
        });
        return r.response === 1 ? store.reset(seed) : { cancelled: true };
      });
      const bounds = windowBounds(
        store.meta("window"),
        screen.getAllDisplays(),
      );
      win = new BrowserWindow({
        ...bounds,
        minWidth: 800,
        minHeight: 600,
        show: false,
        backgroundColor: "#111714",
        title: "Study Atlas",
        icon: path.join(__dirname, "../../dist/icon.png"),
        webPreferences: {
          preload: path.join(__dirname, "../preload/index.cjs"),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webviewTag: false,
          spellcheck: false,
        },
      });
      logEvent("started");
      powerMonitor.on("suspend", () => {
        if (!win.isDestroyed()) win.webContents.send("atlas:power", "suspend");
      });
      powerMonitor.on("resume", () => {
        if (!win.isDestroyed()) win.webContents.send("atlas:power", "resume");
      });
      win.webContents.on("render-process-gone", (_event, details) =>
        logEvent("renderer-" + details.reason),
      );
      win.removeMenu();
      win.webContents.setWindowOpenHandler(({ url }) => {
        const safe = approvedURL(url);
        if (safe) shell.openExternal(safe);
        return { action: "deny" };
      });
      win.webContents.on("will-navigate", (event, url) => {
        if (!url.startsWith("atlas://app/index.html")) {
          event.preventDefault();
          const safe = approvedURL(url);
          if (safe) shell.openExternal(safe);
        }
      });
      win.webContents.on("will-attach-webview", (event) =>
        event.preventDefault(),
      );
      win.webContents.on("will-prevent-unload", (event) => {
        const choice = dialog.showMessageBoxSync(win, {
          message: "Discard unsaved changes and close?",
          buttons: ["Keep editing", "Close"],
          defaultId: 0,
          cancelId: 0,
        });
        if (choice === 1) event.preventDefault();
      });
      win.once("ready-to-show", () => win.show());
      win.on("close", () => {
        if (store && !win.isDestroyed())
          store.setMeta("window", win.getNormalBounds());
      });
      await win.loadURL("atlas://app/index.html");
    })
    .catch((error) => {
      logEvent("startup-failed", error);
      console.error(error);
      dialog.showErrorBox(
        "Study Atlas could not start",
        error.message +
          "\nYour data has not been reset. Restore a backup or contact support.",
      );
    });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => {
    if (!closing) closing = true;
  });
  app.on("will-quit", () => store?.close());
}
