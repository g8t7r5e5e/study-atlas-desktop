"use strict";
let revision = window.atlasInitial.revision;
function desktopSave() {
  let result;
  try {
    result = window.atlas.save({
      demo,
      ui: { date: state.date, month: state.month, year: state.year },
      revision,
    });
  } catch (error) {
    // Keep entered DOM fields available for retry, but undo the failed model mutation.
    discardDraft();
    formDirty = true;
    throw error;
  }
  revision = result.revision;
  for (const key of [
    "logs",
    "weakness",
    "catchup",
    "addedDays",
    "addedTopics",
    "assessmentRecords",
    "milestoneRecords",
  ])
    if (result.demo[key])
      for (let i = 0; i < result.demo[key].length; i++)
        if (demo[key]?.[i]) demo[key][i].id = result.demo[key][i].id;
  document.getElementById("save-status").textContent =
    result.warning || "Saved on this device";
  delete document.getElementById("save-status").dataset.error;
  formDirty = false;
  return true;
}
// Hoisted function is used by the preserved synchronous save entry points.
window.desktopSave = desktopSave;
let formDirty = false,
  modalFocus = null;
function discardDraft() {
  const committed = window.atlas.load();
  revision = committed.revision;
  for (const k of Object.keys(demo)) delete demo[k];
  Object.assign(demo, committed.demo);
  for (const k of Object.keys(D)) delete D[k];
  Object.assign(D, structuredClone(committed.seed));
  originalDaily.splice(0, originalDaily.length, ...structuredClone(D.daily));
  for (const r of demo.addedDays || []) {
    if (!D.daily.some((x) => x.url === r.url)) {
      D.daily.push({ ...r });
      originalDaily.push({ ...r });
    }
  }
  for (const r of demo.addedTopics || [])
    if (!D.curriculum.some((x) => x.url === r.url)) D.curriculum.push({ ...r });
  for (const r of D.curriculum) Object.assign(r, demo.edits[r.url] || {});
  applyPause();
  formDirty = false;
}

document.addEventListener("input", (e) => {
  if (e.target.closest("form")) formDirty = true;
});
const desktopModal = modal;
modal = function (...args) {
  modalFocus = document.activeElement;
  formDirty = false;
  desktopModal(...args);
};
const desktopClose = closeModal;
closeModal = function () {
  if (formDirty) {
    if (!window.atlas.confirmDiscard()) return;
    discardDraft();
  }
  formDirty = false;
  desktopClose();
  document.getElementById("overlay").innerHTML = "";
  modalFocus?.focus?.();
};
const desktopGo = go;
go = function (...args) {
  if (formDirty) {
    if (!window.atlas.confirmDiscard()) return;
    discardDraft();
  }
  formDirty = false;
  desktopGo(...args);
};
document.addEventListener(
  "click",
  (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a && formDirty && !window.atlas.confirmDiscard()) {
      e.preventDefault();
      e.stopImmediatePropagation();
    } else if (a && formDirty) discardDraft();
  },
  true,
);
window.addEventListener("beforeunload", (e) => {
  if (formDirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
// Preserve field contents when storage validation fails; do not emit success.
function syncDate() {
  const zone = demo.preferences.timezone || "Asia/Karachi";
  const next = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (next !== TODAY) {
    const following = state.date === TODAY;
    const old = TODAY;
    TODAY = next;
    if (following) {
      state.date = next;
      if (
        state.month === Number(old.slice(5, 7)) - 1 &&
        state.year === Number(old.slice(0, 4))
      ) {
        state.month = Number(next.slice(5, 7)) - 1;
        state.year = Number(next.slice(0, 4));
      }
    }
    applyPause();
    if (!formDirty) render();
  }
}
syncDate();
setInterval(syncDate, 30000);
const saveSettingsBeforeDesktop = saveSettings;
saveSettings = function (event) {
  const before = revision;
  saveSettingsBeforeDesktop(event);
  if (revision !== before) timerState();
  syncDate();
};
const settingsRender = settings;
settings = function () {
  return (
    settingsRender().replace(
      "Records are stored in this browser. Download a backup of your entries and settings before clearing browser data.",
      "Records and photos are saved in your local SQLite workspace. Export backups to another drive regularly.",
    ) + backupPanel()
  );
};
function backupPanel() {
  return `<section class="card section-gap"><h2>Backup & recovery</h2><p>Preview a prototype backup, desktop backup, or your optional private owner plan. Import replaces records only after confirmation. A safety backup is saved first.</p><div class="flex">${btn("Import / restore backup", "chooseBackup()", "primary")}${btn("Open backup folder", "openBackupFolder()")}${btn("Download backup", "exportBackup()")}</div><p class="screen-note">Seven daily backups are retained automatically. Pre-import backups remain available. ${E(window.atlas.paths().backups)}</p></section>`;
}
async function exportBackup() {
  const r = await window.atlas.exportBackup();
  if (r) toast("Backup exported.");
}
async function openBackupFolder() {
  await window.atlas.openBackups();
}
let backupToken;
async function chooseBackup() {
  const p = await window.atlas.previewBackup();
  if (!p) return;
  backupToken = p.token;
  modal(
    "Review import",
    `<p>${E(p.policy)}</p><p>${p.alreadyImported ? "This backup was already imported; it will be skipped." : `${p.added} incoming new records · ${p.updated} existing identities · ${p.conflicted} unresolved references`}</p>${table(
      ["Category", "Incoming records"],
      Object.entries(p.counts).map(
        ([k, v]) => `<tr><td>${E(k)}</td><td>${v}</td></tr>`,
      ),
    )}${p.unresolved ? '<p role="alert">This backup references base records not present in this workspace. Import the optional owner plan to resolve them. All edits will be preserved.</p>' : ""}<div class="modal-actions">${btn("Cancel", "closeModal()")}${btn("Confirm import", "confirmBackup()", "primary")}</div>`,
  );
}
async function confirmBackup() {
  const receipt = await window.atlas.importBackup(backupToken);
  backupToken = null;
  formDirty = false;
  modal(
    "Import receipt",
    `<p>${receipt.alreadyImported ? "Already imported; no records duplicated." : "Import committed successfully."}</p><p>${receipt.added} added · ${receipt.updated} updated · ${receipt.skipped} skipped · ${receipt.conflicted} unresolved references</p><p>Safety copy: ${E(receipt.safety || "Existing import receipt")}</p>${btn("Open restored workspace", "location.reload()", "primary")}`,
  );
}
function sources() {
  return (
    head(
      "Your workspace, clearly explained.",
      "Your local records, connected across every study view.",
    ) +
    `<div class="grid three uniform-grid source-grid">${card("Your starting point", '<p>A generic, undated curriculum gives you editable study topics. Add your own lessons and activity, or explicitly import a private owner plan.</p><div class="card-foot">' + link("resources", "Resource map") + "</div>")}${card("Connected inside this app", '<p>Today’s Mission shares records with UWorld, Anki, resources, weekly review, and analytics. Lessons appear in both Daily plan and Calendar.</p><div class="card-foot">' + link("howto", "How everything works") + "</div>")}${card("Saved on this device", '<p>SQLite records and profile assets live in your Windows user profile. No account or network connection is required.</p><div class="card-foot">' + btn("Download backup", "exportBackup()", "small") + "</div>")}</div>` +
    backupPanel() +
    `<div class="card section-gap"><div class="flex between"><div><h3>Reset this workspace</h3><p>Clear activity and return to the generic curriculum. A safety backup is retained.</p></div>${btn("Reset workspace", "resetPreview()", "ghost")}</div></div>`
  );
}
function resetPreview() {
  modal(
    "Reset local workspace?",
    `<p>This removes this profile’s active study records and owner plan. A complete safety backup is saved first.</p><div class="modal-actions">${btn("Keep records", "closeModal()")}${btn("Confirm reset", "confirmReset()", "primary")}</div>`,
  );
}
async function confirmReset() {
  const r = await window.atlas.reset();
  if (!r.cancelled) {
    formDirty = false;
    location.reload();
  }
}
helpSections[7] = [
  "Keep your records safe",
  [
    "Your entries are saved to SQLite in your Windows user profile.",
    "Export a backup in Settings and keep a copy on another drive.",
    "Use Import / restore backup to preview and restore a prototype or desktop backup.",
    "A safety backup is created before import or reset; seven automatic daily copies rotate.",
    "Open backup folder in Settings to see the files.",
    "Importing CSV or XLSX updates plans or resources; it does not restore a complete workspace.",
    "Uninstall preserves your personal data. Back up before upgrading.",
  ],
];
function importDialog() {
  modal(
    "Import your study schedule",
    `<p>Choose a CSV or Excel workbook (.xlsx). Files stay on your device.</p>${btn("↑ Choose your schedule", "chooseSpreadsheet('schedule')", "upload-zone")}<p class="screen-note">Required: Date. Blank cells preserve existing fields. ISO dates or DD/MM/YYYY are accepted.</p><div id="import-result" aria-live="polite"></div>`,
  );
}
function resourceImportDialog() {
  modal(
    "Import a resource map",
    `<p>Topics match by name and system. Files stay on your device.</p>${btn("↑ Choose your resource map", "chooseSpreadsheet('resource')", "upload-zone")}<p class="screen-note">Required: Topic, System. Blank cells preserve existing fields.</p><div id="resource-import-result" aria-live="polite"></div>`,
  );
}
async function chooseSpreadsheet(kind) {
  try {
    const sheets = await window.atlas.spreadsheet();
    if (!sheets) return;
    if (kind === "schedule") {
      importSheets = sheets;
      showImportSheet(0);
    } else {
      resourceSheets = sheets;
      showResourceSheet(0);
    }
  } catch (e) {
    document.querySelector(
      kind === "schedule" ? "#import-result" : "#resource-import-result",
    ).textContent = e.message;
  }
}
async function chooseProfilePhoto() {
  const photo = await window.atlas.photo();
  if (!photo) return;
  const bytes = Uint8Array.from(atob(photo.base64), (x) => x.charCodeAt(0));
  await uploadProfilePhoto(
    new File([bytes], "profile." + photo.extension, { type: photo.mime }),
  );
}
// Absolute time counts sleep/minimize. Clock jumps pause rather than changing work duration.
let timerLastWall = Date.now(),
  timerLastMono = performance.now(),
  timerSleeping = false;
window.atlas.onPower?.((kind) => {
  if (kind === "suspend") {
    timerSleeping = true;
    timerTick();
  } else {
    timerTick();
    timerSleeping = false;
    timerLastWall = Date.now();
    timerLastMono = performance.now();
  }
});
function timerState() {
  const dirty = formDirty;
  demo.focusTimer = {
    duration: timerDuration,
    remaining: timerSeconds,
    active: timerActive,
    end: timerEnd,
    wall: Date.now(),
  };
  desktopSave();
  formDirty = dirty;
}
const previousTimer = demo.focusTimer;
if (previousTimer) {
  timerDuration = previousTimer.duration || 1500;
  timerSeconds = previousTimer.active
    ? Math.max(0, Math.ceil((previousTimer.end - Date.now()) / 1000))
    : previousTimer.remaining;
  timerActive = false;
  timerEnd = 0;
}
function timerTick() {
  const wall = Date.now(),
    mono = performance.now(),
    delta = wall - timerLastWall,
    drift = delta - (mono - timerLastMono);
  timerLastWall = wall;
  timerLastMono = mono;
  if (!timerActive) return;
  if (delta < 0 || (Math.abs(drift) > 5000 && !timerSleeping)) {
    timerActive = false;
    timerEnd = 0;
    timerState();
    if (!formDirty) render();
    toast("Clock changed. Session paused; resume when ready.");
    return;
  }
  timerSeconds = Math.max(0, Math.ceil((timerEnd - wall) / 1000));
  if ($("#clock")) $("#clock").textContent = clockText();
  if (timerSeconds === 0) {
    timerActive = false;
    timerState();
    if (!formDirty) render();
    toast("Session complete. Take a breath.");
  }
}
function toggleTimer() {
  timerTick();
  if (timerActive) {
    timerActive = false;
    timerEnd = 0;
  } else {
    if (timerSeconds <= 0) {
      toast("Session completed. Reset to begin another.");
      return;
    }
    timerActive = true;
    timerEnd = Date.now() + timerSeconds * 1000;
    timerLastWall = Date.now();
    timerLastMono = performance.now();
  }
  timerState();
  render();
}
function resetTimer() {
  timerActive = false;
  timerEnd = 0;
  timerSeconds = timerDuration;
  timerState();
  render();
}
function setTimerMinutes(n) {
  if (!Number.isInteger(n) || n < 1 || n > 720) {
    toast("Choose 1–720 whole minutes.");
    return false;
  }
  timerActive = false;
  timerEnd = 0;
  timerDuration = n * 60;
  timerSeconds = timerDuration;
  timerState();
  render();
  return true;
}
setInterval(timerTick, 250);
render();
