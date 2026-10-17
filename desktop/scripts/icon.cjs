"use strict";
// Existing outlined triangle brand mark, rasterized at installer icon sizes.
const fs = require("node:fs"),
  path = require("node:path"),
  { PNG } = require("pngjs");
const dir = path.join(__dirname, "../assets/icons");
fs.mkdirSync(dir, { recursive: true });
const size = 256,
  png = new PNG({ width: size, height: size });
function distance(px, py, ax, ay, bx, by) {
  const dx = bx - ax,
    dy = by - ay,
    t = Math.max(
      0,
      Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)),
    );
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const line = Math.min(
      distance(x, y, 128, 48, 211, 198),
      distance(x, y, 211, 198, 45, 198),
      distance(x, y, 45, 198, 128, 48),
    );
    const c = line < 5 ? [214, 187, 127] : [27, 34, 30];
    png.data.set([...c, 255], i);
  }
const bytes = PNG.sync.write(png);
fs.writeFileSync(path.join(dir, "icon.png"), bytes);
const head = Buffer.alloc(22);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(1, 4);
head.writeUInt16LE(1, 10);
head.writeUInt16LE(32, 12);
head.writeUInt32LE(bytes.length, 14);
head.writeUInt32LE(22, 18);
fs.writeFileSync(path.join(dir, "icon.ico"), Buffer.concat([head, bytes]));
