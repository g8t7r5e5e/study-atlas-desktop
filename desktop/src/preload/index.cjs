"use strict";
const { contextBridge, ipcRenderer } = require("electron");
function sync(name, value) {
  const r = ipcRenderer.sendSync("atlas:" + name, value);
  if (!r?.ok) throw Error(r?.error || "Desktop service unavailable.");
  return r.value;
}
async function invoke(name, value) {
  const r = await ipcRenderer.invoke("atlas:" + name, value);
  if (!r?.ok) throw Error(r?.error || "Desktop service unavailable.");
  return r.value;
}
contextBridge.exposeInMainWorld(
  "atlas",
  Object.freeze({
    onPower: (callback) => {
      if (typeof callback !== "function") return;
      ipcRenderer.on("atlas:power", (_event, kind) => callback(kind));
    },
    load: () => sync("load"),
    save: (value) => sync("save", value),
    paths: () => sync("paths"),
    confirmDiscard: () => sync("discard"),
    exportBackup: () => invoke("export"),
    previewBackup: () => invoke("preview"),
    importBackup: (token) => invoke("import", token),
    openBackups: () => invoke("open-backups"),
    spreadsheet: () => invoke("spreadsheet"),
    photo: () => invoke("photo"),
    reset: () => invoke("reset"),
  }),
);
