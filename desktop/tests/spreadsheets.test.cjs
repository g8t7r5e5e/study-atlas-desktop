const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { zipSync, strToU8 } = require("fflate");
const { readSpreadsheet } = require("../src/main/spreadsheets.cjs");
function workbook(date1904 = false) {
  const entries = {
    "xl/workbook.xml": `<workbook xmlns:r="urn:r"><workbookPr date1904="${date1904 ? 1 : 0}"/><sheets><sheet name="Plan" r:id="rId1"/><sheet name="Other" r:id="rId2"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels":
      '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
    "xl/sharedStrings.xml":
      "<sst><si><t>Date</t></si><si><r><t>Plan </t></r><r><t>text</t></r></si></sst>",
    "xl/worksheets/sheet1.xml":
      '<worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>Main Task</t></is></c></row><row><c r="A2"><v>45200</v></c><c r="B2" t="s"><v>1</v></c><c r="C2"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>',
    "xl/worksheets/sheet2.xml":
      '<worksheet><sheetData><row><c r="A1" t="inlineStr"><is><t>Second</t></is></c></row></sheetData></worksheet>',
  };
  return Buffer.from(
    zipSync(
      Object.fromEntries(
        Object.entries(entries).map(([k, v]) => [k, strToU8(v)]),
      ),
    ),
  );
}
test("CSV BOM, quoted comma/newline and escaped quote", () => {
  const x = readSpreadsheet(
    Buffer.from('\uFEFFDate,Notes\r\n2027-07-01,"a,b\n""quoted"""'),
    "test.csv",
  );
  assert.deepEqual(x[0].rows, [
    ["Date", "Notes"],
    ["2027-07-01", 'a,b\n"quoted"'],
  ]);
  assert.throws(
    () => readSpreadsheet(Buffer.from('a,"oops'), "a.csv"),
    /Unclosed/,
  );
});
test("XLSX shared strings, inline strings, sheets, cached formula and 1904 metadata", () => {
  for (const epoch of [false, true]) {
    const x = readSpreadsheet(workbook(epoch), "a.xlsx");
    assert.equal(x.length, 2);
    assert.equal(x[0].date1904, epoch);
    assert.deepEqual(x[0].rows[1], ["45200", "Plan text", "2"]);
    assert.equal(x[1].rows[0][0], "Second");
  }
});
test("malformed, oversized and expanded archive limits reject before parsing", () => {
  assert.throws(
    () => readSpreadsheet(Buffer.alloc(10 * 1024 * 1024 + 1), "a.csv"),
    /smaller/,
  );
  assert.throws(() => readSpreadsheet(Buffer.from("invalid"), "a.xlsx"));
  const z = workbook();
  const at = z.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  z.writeUInt32LE(50 * 1024 * 1024, at + 24);
  assert.throws(() => readSpreadsheet(z, "a.xlsx"), /oversized/);
  assert.throws(
    () => readSpreadsheet(Buffer.from("a"), "a.xls"),
    /unsupported/,
  );
});
module.exports = { workbook };
