"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const { compile } = require("./compile-handlers.cjs");
const root = path.join(__dirname, ".."),
  out = path.join(root, "dist");
fs.mkdirSync(out, { recursive: true });
for (const name of ["app.js", "dashboard.js", "import.js", "desktop.js"]) {
  const source = fs.readFileSync(path.join(root, "src/renderer", name), "utf8");
  const result = compile(source);
  new (require("node:vm").Script)(result, { filename: name });
  fs.writeFileSync(path.join(out, name), result);
}
for (const name of ["index.html", "bootstrap.js", "events.js"])
  fs.copyFileSync(path.join(root, "src/renderer", name), path.join(out, name));
fs.copyFileSync(
  path.join(root, "assets/seed.json"),
  path.join(out, "seed.json"),
);
let fonts = "";
fs.mkdirSync(path.join(out, "fonts"), { recursive: true });
for (const [family, weights] of [
  ["manrope", [400, 500, 600, 700, 800]],
  ["dm-sans", [400, 500, 600, 700]],
]) {
  const dir = path.join(root, "node_modules/@fontsource", family);
  for (const weight of weights) {
    const file = `${family}-latin-${weight}-normal.woff2`;
    fs.copyFileSync(
      path.join(dir, "files", file),
      path.join(out, "fonts", file),
    );
    fonts += `@font-face{font-family:'${family === "manrope" ? "Manrope" : "DM Sans"}';font-style:normal;font-weight:${weight};font-display:swap;src:url('fonts/${file}') format('woff2')}\n`;
  }
  fs.copyFileSync(
    path.join(dir, "LICENSE"),
    path.join(out, "fonts", family + "-LICENSE.txt"),
  );
}
const symbols = path.join(root, "node_modules/@fontsource/noto-sans-symbols-2");
for (const subset of ["symbols", "math"]) {
  const file = `noto-sans-symbols-2-${subset}-400-normal.woff2`;
  fs.copyFileSync(
    path.join(symbols, "files", file),
    path.join(out, "fonts", file),
  );
  fonts += `@font-face{font-family:'Atlas Symbols ${subset}';font-style:normal;font-weight:400;src:url('fonts/${file}') format('woff2')}\n`;
}
fs.copyFileSync(
  path.join(symbols, "LICENSE"),
  path.join(out, "fonts", "symbols-LICENSE.txt"),
);
fs.writeFileSync(
  path.join(out, "style.css"),
  fonts +
    fs
      .readFileSync(path.join(root, "src/renderer/style.css"), "utf8")
      .replace(/^@import[^;]+;[^\n]*\n/, "")
      .replaceAll(
        "'DM Sans',Arial",
        "'DM Sans','Atlas Symbols symbols','Atlas Symbols math',Arial",
      )
      .replaceAll(
        "'Manrope',sans-serif",
        "'Manrope','Atlas Symbols symbols','Atlas Symbols math',sans-serif",
      ),
);
fs.copyFileSync(
  path.join(root, "assets/icons/icon.png"),
  path.join(out, "icon.png"),
);
console.log(
  "Built local renderer, compiled handlers, clean seed and licensed fonts.",
);
