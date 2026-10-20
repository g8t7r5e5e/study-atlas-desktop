/* Local-only CSV and XLSX reading. No file contents leave this browser. */
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, "");
  const sep = text.split(/\r?\n/)[0].includes("\t")
    ? "\t"
    : text.split(/\r?\n/)[0].includes(";")
      ? ";"
      : ",";
  const rows = [];
  let row = [],
    cell = "",
    quote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quote && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quote = !quote;
    } else if (c === sep && !quote) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quote) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quote) throw Error("Unclosed quote in CSV.");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
let importSheets = [],
  importPreview = [];
function importDialog() {
  modal(
    "Import your study schedule",
    `<p>Upload a CSV or Excel workbook (.xlsx). Files are read locally.</p><label class="upload-zone">↑ Choose your schedule<input type="file" accept=".csv,.xlsx" onchange="loadSchedule(this.files[0])"></label><p class="screen-note">Recognized columns: Date, System, Plan & Targets (or Main Task), Hours, UWorld, Status, First Aid Target, B&B Target, Anki Target, New Card Budget, Secondary Task, Notes. Dates: YYYY-MM-DD or DD/MM/YYYY. Existing dates are updated only for supplied columns.</p><div id="import-result" aria-live="polite"></div>`,
  );
}
async function loadSchedule(file) {
  if (!file) return;
  try {
    if (file.size > 10e6) throw Error("Use a file smaller than 10 MB.");
    $("#import-result").textContent = "Reading schedule…";
    if (/\.csv$/i.test(file.name))
      importSheets = [{ name: "CSV", rows: parseCSV(await file.text()) }];
    else if (/\.xlsx$/i.test(file.name))
      importSheets = await window.atlas.spreadsheet();
    else throw Error("Choose a .csv or .xlsx file.");
    if (!importSheets.length) throw Error("No worksheets found.");
    showImportSheet(0);
  } catch (err) {
    $("#import-result").textContent = err.message;
  }
}
function importDate(value, date1904 = false) {
  let s = String(value ?? "").trim();
  if (/^\d+(\.\d+)?$/.test(s)) {
    const serial = Math.floor(+s);
    if (!date1904 && serial === 60) return "Invalid Excel leap day";
    const d = new Date(
      Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 31) +
        (date1904 ? serial : serial - (serial > 60 ? 1 : 0)) * 864e5,
    );
    s = d.toISOString().slice(0, 10);
  } else if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(s)) {
    const [d, m, y] = s.split(/[\/-]/);
    s = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return s;
}
const importAliases = {
  date: "date:Date:start",
  studydate: "date:Date:start",
  datestart: "date:Date:start",
  datedatestart: "date:Date:start",
  system: "Primary System/Subject",
  primarysystemsubject: "Primary System/Subject",
  plantargets: "Main Task",
  plan: "Main Task",
  lesson: "Main Task",
  topic: "Main Task",
  maintask: "Main Task",
  hours: "Planned Hours",
  plannedhours: "Planned Hours",
  uworld: "UWorld Target",
  uworldtarget: "UWorld Target",
  uworldquestions: "UWorld Target",
  status: "Status",
  firstaidtarget: "First Aid Target",
  bbtarget: "B&B Target",
  ankitarget: "Anki Target",
  newcardbudget: "New Card Budget",
  secondarytask: "Secondary Task",
  notes: "Notes",
  daytype: "Day Type",
};
function mapImport(rows, date1904) {
  const nonempty = rows.filter((r) => r.some((x) => String(x ?? "").trim()));
  if (!nonempty.length) throw Error("This sheet is empty.");
  const headers = nonempty[0].map(
    (h) =>
      importAliases[
        String(h)
          .toLowerCase()
          .replace(/[^a-z]/g, "")
      ],
  );
  if (!headers.includes("date:Date:start"))
    throw Error("A Date column is required in the first row.");
  const seen = new Set(),
    result = [],
    errors = [];
  nonempty.slice(1).forEach((row, i) => {
    const f = {};
    headers.forEach((key, j) => {
      if (key && row[j] !== undefined && String(row[j]).trim() !== "")
        f[key] = String(row[j]).trim();
    });
    if (!Object.keys(f).length) return;
    f["date:Date:start"] = importDate(f["date:Date:start"], date1904);
    let err = validPlan(f);
    if (!err && seen.has(f["date:Date:start"]))
      err = "Duplicate date in this sheet.";
    if (err) errors.push(`Row ${i + 2}: ${err}`);
    else {
      seen.add(f["date:Date:start"]);
      result.push(f);
    }
  });
  if (errors.length) throw Error(errors.slice(0, 8).join(" "));
  if (!result.length) throw Error("No valid schedule rows found.");
  if (result.length > 1500) throw Error("Import up to 1,500 days at a time.");
  return result.sort((a, b) =>
    a["date:Date:start"].localeCompare(b["date:Date:start"]),
  );
}
function showImportSheet(i) {
  const selector =
    importSheets.length > 1
      ? `<label>Worksheet<select onchange="showImportSheet(+this.value)">${importSheets.map((s, j) => `<option value="${j}" ${i === j ? "selected" : ""}>${E(s.name)}</option>`).join("")}</select></label>`
      : "";
  try {
    importPreview = mapImport(importSheets[i].rows, importSheets[i].date1904);
    const updates = importPreview.filter((f) =>
      D.daily.some((r) => dt(r) === f["date:Date:start"]),
    ).length;
    $("#import-result").innerHTML =
      selector +
      `<p>${importPreview.length - updates} new days · ${updates} existing days to update. Blank cells preserve existing values.</p>` +
      table(
        ["Date", "System", "Plan", "Hours"],
        importPreview
          .slice(0, 8)
          .map(
            (f) =>
              `<tr><td>${E(f["date:Date:start"])}</td><td>${E(f["Primary System/Subject"])}</td><td>${E(f["Main Task"])}</td><td>${E(f["Planned Hours"])}</td></tr>`,
          ),
      ) +
      `<p class="screen-note">Showing the first ${Math.min(8, importPreview.length)} rows. Break dates remain protected.</p><div class="modal-actions">${btn("Cancel", "closeModal()")}${btn("Import " + importPreview.length + " days", "commitImport()", "primary")}</div>`;
  } catch (err) {
    importPreview = [];
    $("#import-result").innerHTML =
      selector + `<p role="alert">${E(err.message)}</p>`;
  }
}
function commitImport() {
  if (!importPreview.length) return;
  importPreview.forEach(upsertPlan);
  applyPause();
  persist();
  closeModal();
  render();
  toast("Schedule imported in date order. Calendar updated.");
  importPreview = [];
}
