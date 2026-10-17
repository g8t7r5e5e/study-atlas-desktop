"use strict";
const { _electron } = require("playwright");
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  assert = require("node:assert/strict");
(async () => {
  const retained = process.env.STUDY_ATLAS_PERSIST_TEST_PROFILE;
  const profile =
    retained || fs.mkdtempSync(path.join(os.tmpdir(), "atlas-electron-"));
  if (process.env.STUDY_ATLAS_EXPECT_EXISTING === "1")
    assert.ok(
      fs.existsSync(path.join(profile, "atlas.sqlite")),
      "Expected existing upgrade profile",
    );
  const packaged = !!process.env.STUDY_ATLAS_EXECUTABLE;
  const executablePath =
    process.env.STUDY_ATLAS_EXECUTABLE || require("electron");
  const args = packaged ? [] : [path.join(__dirname, "..")];
  const noSandbox =
    process.env.STUDY_ATLAS_LINUX_TEST_NO_SANDBOX === "1" &&
    process.platform === "linux";
  if (noSandbox) args.unshift("--no-sandbox");
  let electron;
  const errors = [];
  async function launch() {
    const app = await _electron.launch({
      executablePath,
      args,
      env: {
        ...process.env,
        STUDY_ATLAS_TEST_PROFILE: profile,
        STUDY_ATLAS_INSTALLED_TEST: packaged ? "1" : "",
      },
      timeout: 30000,
    });
    const page = await app.firstWindow();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.waitForSelector('body[data-ready="true"]');
    return { app, page };
  }
  try {
    let launched = await launch();
    electron = launched.app;
    let page = launched.page;
    const info = await electron.evaluate(({ BrowserWindow }) => ({
      electron: process.versions.electron,
      node: process.versions.node,
      prefs:
        BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences(),
    }));
    assert.equal(info.prefs.contextIsolation, true);
    assert.equal(info.prefs.nodeIntegration, false);
    assert.equal(info.prefs.sandbox, true);
    const routes = [
      "home",
      "today",
      "focus",
      "planner",
      "calendar",
      "resources",
      "curriculum",
      "uworld",
      "anki",
      "weakness",
      "catchup",
      "systems",
      "assessments",
      "weekly",
      "analytics",
      "phases",
      "milestones",
      "settings",
      "guide",
      "howto",
      "sources",
      "profile",
    ];
    for (const route of routes) {
      await page.evaluate((route) => {
        state.page = route;
        render();
      }, route);
      assert.ok(await page.locator("#main").textContent());
      assert.equal(
        await page.locator("[onclick],[onsubmit],[oninput],[onchange]").count(),
        0,
      );
    }
    assert.equal(await page.evaluate(() => typeof require), "undefined");
    if (process.env.STUDY_ATLAS_EXPECT_EXISTING === "1")
      assert.equal(
        await page.getByLabel("Display name").inputValue(),
        "Synthetic Electron Test",
      );
    await page.getByLabel("Display name").fill("Synthetic Electron Test");
    await page
      .getByRole("button", { name: "Save profile", exact: true })
      .click();
    assert.equal(
      await page.locator("#save-status").textContent(),
      "Saved on this device",
    );
    await page.evaluate(() => {
      state.date = "2027-07-01";
      go("today");
    });
    await page.getByLabel("Actual study hours").fill("3");
    await page.locator('[name="questions"]').fill("24");
    await page.locator('[name="correct"]').fill("18");
    await page.locator('[name="reviewed"]').fill("22");
    await page.getByRole("button", { name: "Save today’s record →" }).click();
    const before = await page.evaluate(() => window.atlas.load());
    assert.equal(before.demo.logs.length, 1);
    assert.equal(+before.demo.logs[0].questions, 24);
    // The privileged API rejects invalid counts even if renderer validation is bypassed.
    assert.match(
      await page.evaluate(() => {
        const x = window.atlas.load();
        x.demo.logs[0].correct = 999;
        try {
          window.atlas.save(x);
          return "unexpected success";
        } catch (e) {
          return e.message;
        }
      }),
      /cannot exceed/,
    );
    await electron.close();
    electron = null;
    launched = await launch();
    electron = launched.app;
    page = launched.page;
    const after = await page.evaluate(() => window.atlas.load());
    assert.deepEqual(after.demo, before.demo);
    assert.equal(after.demo.logs[0].id, before.demo.logs[0].id);
    const out = path.join(__dirname, "../test-evidence");
    fs.mkdirSync(out, { recursive: true });
    const result = {
      electron: info.electron,
      node: info.node,
      routes: routes.length,
      inlineHandlers: 0,
      rendererRequire: "undefined",
      contextIsolation: true,
      nodeIntegration: false,
      sandboxPreference: true,
      linuxSandboxDisabled: noSandbox,
      persistenceRestart: true,
      ipcValidation: true,
      platform: process.platform,
      arch: process.arch,
      packaged,
      errors,
    };
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(
        out,
        packaged ? "electron-packaged.json" : "electron-smoke.json",
      ),
      JSON.stringify(result, null, 2),
    );
    console.log(result);
  } finally {
    if (electron) await electron.close();
    if (!retained) fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
