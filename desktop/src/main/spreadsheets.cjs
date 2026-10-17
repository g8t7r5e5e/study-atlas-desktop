"use strict";
const { unzipSync } = require("fflate");
const { XMLParser, XMLValidator } = require("fast-xml-parser");
const MAX = 10 * 1024 * 1024,
  EXPANDED = 40 * 1024 * 1024;
function csv(text) {
  text = text.replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/)[0],
    sep = first.includes("\t") ? "\t" : first.includes(";") ? ";" : ",";
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
    if (cell.length > 100000) throw Error("Spreadsheet cell is too long.");
  }
  if (quote) throw Error("Unclosed quote in CSV.");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  if (rows.length > 2001) throw Error("Spreadsheet row limit is 2,000.");
  return rows;
}
function checkZip(bytes) {
  if (bytes.length < 22) throw Error("Invalid XLSX archive.");
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (bytes.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw Error("Invalid XLSX archive.");
  const count = bytes.readUInt16LE(end + 10);
  if (count > 2000 || count === 65535)
    throw Error("Workbook has too many entries.");
  let pos = bytes.readUInt32LE(end + 16),
    expanded = 0;
  const names = new Set();
  for (let n = 0; n < count; n++) {
    if (pos + 46 > bytes.length || bytes.readUInt32LE(pos) !== 0x02014b50)
      throw Error("Invalid workbook directory.");
    const nl = bytes.readUInt16LE(pos + 28),
      el = bytes.readUInt16LE(pos + 30),
      cl = bytes.readUInt16LE(pos + 32);
    expanded += bytes.readUInt32LE(pos + 24);
    const name = bytes.toString("utf8", pos + 46, pos + 46 + nl);
    if (
      expanded > EXPANDED ||
      name.includes("..") ||
      name.startsWith("/") ||
      names.has(name) ||
      bytes.readUInt16LE(pos + 8) & 1
    )
      throw Error("Unsafe or oversized workbook.");
    names.add(name);
    pos += 46 + nl + el + cl;
    if (pos > bytes.length) throw Error("Invalid workbook offsets.");
  }
  return expanded;
}
const list = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
function xlsx(bytes) {
  const declared = checkZip(bytes);
  const files = unzipSync(bytes, {
    filter: (f) => f.name.startsWith("xl/") && /\.(xml|rels)$/.test(f.name),
  });
  let expanded = 0;
  for (const b of Object.values(files)) {
    expanded += b.length;
    if (expanded > EXPANDED || expanded > declared)
      throw Error("Workbook exceeds expanded size limit.");
  }
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    parseTagValue: false,
    processEntities: true,
    trimValues: false,
    removeNSPrefix: true,
  });
  const xml = (name) => {
    const s = Buffer.from(files[name] || []).toString("utf8");
    if (/<!DOCTYPE|<!ENTITY/i.test(s))
      throw Error("XML entities are not supported.");
    if (!s) return {};
    if (XMLValidator.validate(s) !== true)
      throw Error("Malformed workbook XML.");
    return parser.parse(s);
  };
  const text = (x) => (typeof x === "string" ? x : x?.["#text"] || "");
  const string = (x) =>
    x?.t !== undefined
      ? text(x.t)
      : list(x?.r)
          .map((r) => text(r.t))
          .join("");
  const shared = list(xml("xl/sharedStrings.xml").sst?.si).map(string),
    book = xml("xl/workbook.xml").workbook;
  if (!book) throw Error("Missing workbook.");
  const rels = list(
    xml("xl/_rels/workbook.xml.rels").Relationships?.Relationship,
  );
  const date1904 = ["1", "true"].includes(book.workbookPr?.["@date1904"]);
  const sheets = list(book.sheets?.sheet);
  if (sheets.length > 50) throw Error("At most 50 worksheets supported.");
  return sheets.map((sh) => {
    const rel = rels.find((r) => r["@Id"] === sh["@id"]);
    if (!rel || rel["@TargetMode"] === "External")
      throw Error("Invalid worksheet relationship.");
    let target = rel["@Target"];
    target = target.startsWith("/")
      ? target.slice(1)
      : "xl/" + target.replace(/^\.\//, "");
    if (target.includes("..")) throw Error("Unsafe sheet path.");
    const raw = list(xml(target).worksheet?.sheetData?.row);
    if (raw.length > 2001) throw Error("At most 2,000 data rows supported.");
    const rows = raw.map((row) => {
      const out = [];
      for (const c of list(row.c)) {
        const letters = /^[A-Z]+/.exec(c["@r"] || "A")?.[0];
        if (!letters) throw Error("Invalid cell address.");
        let col = 0;
        for (const ch of letters) col = col * 26 + ch.charCodeAt(0) - 64;
        if (col > 256) throw Error("At most 256 columns supported.");
        const v = c.v == null ? "" : text(c.v),
          type = c["@t"];
        out[col - 1] =
          type === "s"
            ? (shared[+v] ?? "")
            : type === "inlineStr"
              ? string(c.is)
              : v;
        if (String(out[col - 1]).length > 100000)
          throw Error("Spreadsheet cell is too long.");
      }
      return out;
    });
    return { name: sh["@name"], rows, date1904 };
  });
}
function readSpreadsheet(bytes, name) {
  if (bytes.length > MAX)
    throw Error("Choose a spreadsheet smaller than 10 MB.");
  if (/\.csv$/i.test(name))
    return [{ name: "CSV", rows: csv(bytes.toString("utf8")) }];
  if (/\.xlsx$/i.test(name)) return xlsx(bytes);
  throw Error("Choose CSV or XLSX; legacy XLS is unsupported.");
}
module.exports = { csv, xlsx, checkZip, readSpreadsheet };
