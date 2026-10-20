const { test, expect } = require("@playwright/test");
const fs = require("node:fs"),
  path = require("node:path"),
  { PNG } = require("pngjs");
const seed = require("../../assets/seed.json"),
  fixture = require("../../../examples/prototype-backup.synthetic.json");
// Data-only synthetic state on both renderers. Prototype source bytes remain unchanged.
for (const size of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
])
  test(`matched reference visual comparison ${size.width}x${size.height}`, async ({
    browser,
    request,
  }, info) => {
    test.setTimeout(120000);
    await request.post("/api/reset", { data: null });
    await request.post("/api/fixture", {
      data: { text: JSON.stringify(fixture) },
    });
    await request.post("/api/import", { data: null });
    const context = await browser.newContext({
        viewport: size,
        timezoneId: "Asia/Karachi",
      }),
      ref = await context.newPage(),
      app = await context.newPage();
    await ref.route("**/reference/data.js", (r) =>
      r.fulfill({
        contentType: "text/javascript",
        body: "const D=" + JSON.stringify(seed) + ";",
      }),
    );
    await ref.route("**/reference/fonts/*", (r) => {
      const name = new URL(r.request().url()).pathname.split("/").pop();
      return r.fulfill({
        body: fs.readFileSync(path.join(__dirname, "../../dist/fonts", name)),
        contentType: "font/woff2",
      });
    });
    await ref.addInitScript(
      ({ demo }) =>
        localStorage.setItem(
          "zahoor-atlas-prototype",
          JSON.stringify({
            demo,
            ui: { date: "2027-07-01", month: 6, year: 2027 },
          }),
        ),
      fixture,
    );
    await ref.goto("/reference/index.html");
    await app.goto("/");
    await expect(app.locator("body")).toHaveAttribute("data-ready", "true");
    const out = path.join(__dirname, "../../test-evidence/visual");
    fs.mkdirSync(out, { recursive: true });
    const results = [];
    for (const theme of ["Forest", "Soft contrast"])
      for (const route of [
        "home",
        "today",
        "planner",
        "calendar",
        "resources",
        "systems",
        "assessments",
        "weakness",
        "catchup",
        "weekly",
        "focus",
        "milestones",
      ]) {
        for (const p of [ref, app])
          await p.evaluate(
            ({ route, theme }) => {
              state.page = route;
              state.date = "2027-07-01";
              state.month = 6;
              state.year = 2027;
              demo.preferences.theme = theme;
              render();
              window.scrollTo(0, 0);
            },
            { route, theme },
          );
        await Promise.all([
          ref.evaluate(() => document.fonts.ready),
          app.evaluate(() => document.fonts.ready),
        ]);
        // Main-content comparisons intentionally exclude truthful desktop storage footer changes.
        const a = await ref
            .locator("#main")
            .screenshot({ animations: "disabled" }),
          b = await app.locator("#main").screenshot({ animations: "disabled" });
        const prefix = `${size.width}-${theme.replace(" ", "-")}-${route}`;
        fs.writeFileSync(path.join(out, prefix + "-reference.png"), a);
        fs.writeFileSync(path.join(out, prefix + "-desktop.png"), b);
        const x = PNG.sync.read(a),
          y = PNG.sync.read(b);
        let changed = 0;
        if (x.width === y.width && x.height === y.height) {
          for (let i = 0; i < x.data.length; i += 4)
            if (
              Math.max(
                Math.abs(x.data[i] - y.data[i]),
                Math.abs(x.data[i + 1] - y.data[i + 1]),
                Math.abs(x.data[i + 2] - y.data[i + 2]),
              ) > 12
            )
              changed++;
        } else changed = Math.max(x.width * x.height, y.width * y.height);
        const ratio =
          changed / Math.max(x.width * x.height, y.width * y.height);
        results.push({
          route,
          theme,
          width: size.width,
          reference: [x.width, x.height],
          desktop: [y.width, y.height],
          changedPixelRatio: ratio,
        });
        // Mission has intentional storage copy changes; other selected routes preserve the approved layout.
        expect(ratio, `${prefix} visual difference`).toBeLessThan(
          route === "today" ? 0.02 : 0.005,
        );
      }
    fs.writeFileSync(
      path.join(out, `${size.width}-comparison.json`),
      JSON.stringify(results, null, 2),
    );
    await info.attach("visual-comparison", {
      body: JSON.stringify(results, null, 2),
      contentType: "application/json",
    });
    await context.close();
  });
