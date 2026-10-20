const { test, expect } = require("@playwright/test");
const fs = require("node:fs"),
  path = require("node:path");
const fixture = require("../../../examples/prototype-backup.synthetic.json");
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
async function ready(page) {
  await page.goto("/");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
}
async function route(page, name) {
  await page.evaluate((name) => go(name), name);
  await expect.poll(() => page.evaluate(() => state.page)).toBe(name);
  await expect(page.locator("#main")).not.toBeEmpty();
}
async function api(request, op, value) {
  const r = await request.post("/api/" + op, { data: value ?? null });
  const x = await r.json();
  if (!x.ok) throw Error(x.error);
  return x.value;
}
test.beforeEach(async ({ page, request }) => {
  await api(request, "reset");
  await ready(page);
});
test("all 22 routes render offline with compiled handlers, readable themes and working navigation", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const remote = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1:4184") &&
      !r.url().startsWith("data:")
    )
      remote.push(r.url());
  });
  for (const name of routes) {
    await route(page, name);
    await expect(page.locator("#main")).not.toBeEmpty();
    expect(
      await page.locator("[onclick],[onchange],[oninput],[onsubmit]").count(),
    ).toBe(0);
  }
  await page.getByRole("button", { name: "☀ Today", exact: true }).click();
  await expect(page.locator("#daily-form")).toBeVisible();
  await page.getByRole("button", { name: "◷ Focus", exact: true }).click();
  await expect(page.locator("#clock")).toBeVisible();
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await expect(page.locator("#daily-form")).toBeVisible();
  await page.getByRole("button", { name: "Open my profile" }).click();
  await expect(page).toHaveURL(/#profile$/);
  await page.reload();
  await expect(page.getByText("Your space. Your story.")).toBeVisible();
  expect(errors).toEqual([]);
  expect(remote).toEqual([]);
});
test("linked mission edit, UWorld block edit, Anki edit and restart preserve totals and identities", async ({
  page,
  request,
}) => {
  await route(page, "today");
  await page.getByLabel("Plan date", { exact: true }).fill("2027-07-01");
  const fields = {
    hours: "3",
    questions: "20",
    correct: "15",
    reviewed: "18",
    anki: "80",
    due: "100",
    newcards: "5",
    weakness: "Synthetic concept",
    unfinished: "Repair concept",
    catchupDate: "2027-07-02",
  };
  for (const [k, v] of Object.entries(fields))
    await page.locator(`#daily-form [name="${k}"]`).fill(v);
  await page.getByRole("button", { name: "Save today’s record →" }).click();
  await expect(page.locator("#save-status")).toHaveText("Saved on this device");
  for (const [k, v] of Object.entries({
    questions: "24",
    correct: "18",
    reviewed: "22",
  }))
    await page.locator(`#daily-form [name="${k}"]`).fill(v);
  await page.getByRole("button", { name: "Save today’s record →" }).click();
  await route(page, "uworld");
  await page
    .getByLabel("Question selection", { exact: true })
    .selectOption("Mixed");
  for (const [label, v] of [
    ["Attempted", "10"],
    ["Correct", "8"],
    ["Reviewed", "10"],
  ])
    await page.getByLabel(label, { exact: true }).fill(v);
  await page.getByRole("button", { name: "Save block", exact: true }).click();
  await expect(page.locator(".stat").first()).toContainText("34");
  let d = (await api(request, "load")).demo;
  expect(d.logs).toHaveLength(2);
  const ids = d.logs.map((x) => x.id);
  expect(d.weakness).toHaveLength(1);
  expect(d.catchup).toHaveLength(1);
  await page.getByRole("button", { name: "Edit", exact: true }).last().click();
  await page.getByRole("button", { name: "Save block", exact: true }).click();
  await route(page, "anki");
  await page.getByLabel("Reviews completed", { exact: true }).fill("90");
  await page.getByRole("button", { name: "Save Anki record" }).click();
  await page.reload();
  await expect(
    page.getByLabel("Reviews completed", { exact: true }),
  ).toHaveValue("90");
  d = (await api(request, "load")).demo;
  expect(d.logs.map((x) => x.id)).toEqual(ids);
  expect(+d.logs[0].hours).toBe(3);
  expect(d.logs.reduce((n, x) => n + +x.questions, 0)).toBe(34);
  expect(d.logs.reduce((n, x) => n + +x.correct, 0)).toBe(26);
});
test("lesson, settings, pause move, calendar and explicit overrides survive restart", async ({
  page,
  request,
}) => {
  await route(page, "planner");
  await page
    .getByRole("button", { name: "＋ Add a lesson", exact: true })
    .click();
  await page.getByLabel("Choose lesson date").fill("2027-07-01");
  await page
    .getByLabel("Plan & targets", { exact: true })
    .fill("Synthetic lesson");
  await page.getByLabel("Hours", { exact: true }).fill("4");
  await page.getByLabel("UWorld questions", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Save lesson", exact: true }).click();
  await route(page, "settings");
  await page.getByLabel("Weekday hours", { exact: true }).fill("7");
  await page.getByLabel("Apply capacity to future plans").selectOption("Yes");
  await page.getByLabel("Break starts").fill("2027-07-01");
  await page.getByLabel("Break ends").fill("2027-07-02");
  await page.getByRole("button", { name: "Save all settings" }).click();
  expect(
    await page.evaluate(
      () => D.daily.find((x) => dt(x) === "2027-07-01")["Planned Hours"],
    ),
  ).toBe(0);
  await page.reload();
  await page.getByLabel("Break starts").fill("2027-08-01");
  await page.getByLabel("Break ends").fill("2027-08-02");
  await page.getByRole("button", { name: "Save all settings" }).click();
  expect(
    await page.evaluate(
      () => D.daily.find((x) => dt(x) === "2027-07-01")["Planned Hours"],
    ),
  ).toBe(4);
  await route(page, "calendar");
  await page.getByLabel("Choose month").fill("2027-07");
  await page.locator('[data-date="2027-07-01"]').click();
  await expect(page.getByRole("dialog")).toContainText("Synthetic lesson");
  expect((await api(request, "load")).demo.addedDays).toHaveLength(1);
});
test("native-dialog import previews CSV, validates duplicate rows, preserves blanks and commits once", async ({
  page,
  request,
}) => {
  const text =
    'Date,System,Main Task,Hours\n2027-07-01,Cardio,"Synthetic, lesson",4\n';
  await api(request, "fixture", {
    name: "plan.csv",
    base64: Buffer.from(text).toString("base64"),
  });
  await route(page, "planner");
  await page.getByRole("button", { name: "↑ Import schedule" }).click();
  await page.getByRole("button", { name: "↑ Choose your schedule" }).click();
  await expect(page.locator("#import-result")).toContainText("1 new days");
  await page
    .getByRole("button", { name: "Import 1 days", exact: true })
    .click();
  expect((await api(request, "load")).demo.addedDays).toHaveLength(1);
  await api(request, "fixture", {
    name: "plan.csv",
    base64: Buffer.from("Date,Main Task,Hours\n2027-07-01,Updated,\n").toString(
      "base64",
    ),
  });
  await page.getByRole("button", { name: "↑ Import schedule" }).click();
  await page.getByRole("button", { name: "↑ Choose your schedule" }).click();
  await page
    .getByRole("button", { name: "Import 1 days", exact: true })
    .click();
  expect(await page.evaluate(() => D.daily[0]["Planned Hours"])).toBe(4);
  await api(request, "fixture", {
    name: "plan.csv",
    base64: Buffer.from("Date\n2027-07-01\n2027-07-01").toString("base64"),
  });
  await page.getByRole("button", { name: "↑ Import schedule" }).click();
  await page.getByRole("button", { name: "↑ Choose your schedule" }).click();
  await expect(page.locator("#import-result")).toContainText("Duplicate");
  expect((await api(request, "load")).demo.addedDays).toHaveLength(1);
});
test("resource upload, both orderings, status links, assessments, milestones and weekly reflection", async ({
  page,
  request,
}) => {
  await api(request, "fixture", {
    name: "resource.csv",
    base64: Buffer.from(
      "Topic,System,Study Date,Overall Status\nSynthetic topic,Cardio,2027-07-01,Reviewed",
    ).toString("base64"),
  });
  await route(page, "resources");
  await page
    .getByRole("button", { name: "↑ Resource map (CSV or Excel)" })
    .click();
  await page
    .getByRole("button", { name: "↑ Choose your resource map" })
    .click();
  await page.getByRole("button", { name: "Import 1 topics" }).click();
  await page
    .getByRole("button", { name: "First Aid sequence", exact: true })
    .click();
  await page
    .getByRole("button", { name: "My study schedule", exact: true })
    .click();
  await page.getByLabel("Search resources").fill("Synthetic topic");
  await expect(page.locator("#main tbody")).toContainText("Reviewed");
  await route(page, "assessments");
  await page.getByRole("button", { name: "＋ Plan assessment" }).click();
  await page
    .getByLabel("Assessment name", { exact: true })
    .fill("Synthetic assessment");
  await page.getByLabel("Planned date", { exact: true }).fill("2027-07-01");
  await page.getByLabel("Date taken", { exact: true }).fill("2027-07-01");
  await page.getByLabel("Status", { exact: true }).selectOption("Completed");
  await page.getByRole("button", { name: "Save assessment" }).click();
  await expect(page.locator(".analytics-side")).toContainText("Not entered");
  await route(page, "milestones");
  await page.getByRole("button", { name: "＋ Create milestone" }).click();
  await page
    .getByLabel("A clear, meaningful milestone")
    .fill("Synthetic milestone");
  await page.getByLabel("Status", { exact: true }).selectOption("Achieved");
  await page.getByLabel("Date achieved").fill("2027-07-01");
  await page
    .getByRole("button", { name: "Save milestone", exact: true })
    .click();
  await route(page, "weekly");
  await page.getByLabel("Choose review week").fill("2027-07-01");
  await expect(page.locator("#main")).toContainText("Synthetic milestone");
  await page.locator('[name="wins"]').fill("Synthetic win");
  await page
    .getByRole("button", { name: "Save this week’s reflection" })
    .click();
  await page.reload();
  expect((await api(request, "load")).demo.reflections["2027-06-28"].wins).toBe(
    "Synthetic win",
  );
});
test("backup preview, receipt, restore and repeat import work through UI", async ({
  page,
  request,
}) => {
  await api(request, "fixture", { text: JSON.stringify(fixture) });
  await route(page, "settings");
  await page.getByRole("button", { name: "Import / restore backup" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Replace this workspace",
  );
  await page
    .getByRole("button", { name: "Confirm import", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Import committed");
  await page.getByRole("button", { name: "Open restored workspace" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
  expect((await api(request, "load")).demo.logs).toHaveLength(2);
  await page.getByRole("button", { name: "Import / restore backup" }).click();
  await page
    .getByRole("button", { name: "Confirm import", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("no records duplicated");
});
test("storage failure is visible and never reports saved; retry succeeds", async ({
  page,
  request,
}) => {
  await route(page, "profile");
  await page.getByLabel("Display name").fill("Synthetic Student");
  await api(request, "failure", true);
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.locator("#save-status")).toContainText("Not saved");
  expect((await api(request, "load")).demo.profile.name).toBeUndefined();
  await api(request, "failure", false);
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.locator("#save-status")).toHaveText("Saved on this device");
  await page.reload();
  await expect(page.getByLabel("Display name")).toHaveValue(
    "Synthetic Student",
  );
});
test("timer pause/resume/reset, completion and reopen do not restart completed work", async ({
  page,
}) => {
  await route(page, "focus");
  await page.getByRole("button", { name: "Custom time" }).click();
  await page.getByLabel("Session length in minutes").fill("1");
  await page.getByRole("button", { name: "Set custom time" }).click();
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator("#clock")).toHaveText("01:00");
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await page.evaluate(() => {
    timerEnd = Date.now() - 1000;
    timerTick();
  });
  await expect(page.locator("#clock")).toHaveText("00:00");
  await page.reload();
  await expect(page.locator("#clock")).toHaveText("00:00");
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  await expect(page.locator("#clock")).toHaveText("00:00");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator("#clock")).toHaveText("01:00");
});
test("weakness repair and catch-up edits keep identities, leave active work when done, and retain history", async ({
  page,
  request,
}) => {
  await route(page, "weakness");
  await page.getByRole("button", { name: "＋ Capture weakness" }).click();
  await page.getByRole("button", { name: "＋ New weakness" }).click();
  await page
    .getByLabel("Concept", { exact: true })
    .fill("Synthetic repair concept");
  await page
    .getByLabel("Correct concept in your own words")
    .fill("Synthetic explanation");
  await page
    .getByRole("button", { name: "Save weakness", exact: true })
    .click();
  const id = (await api(request, "load")).demo.weakness[0].id;
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByLabel("Correct concept in your own words")
    .fill("Revised explanation");
  await page
    .getByRole("button", { name: "Save weakness", exact: true })
    .click();
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await page.getByLabel("Designated date", { exact: true }).fill("2027-07-02");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await route(page, "catchup");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Designated date", { exact: true }).fill("2027-07-03");
  await page.getByRole("button", { name: "Save item", exact: true }).click();
  const catchupId = (await api(request, "load")).demo.catchup[0].id;
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Status", { exact: true }).selectOption("Done");
  await page.getByRole("button", { name: "Save item", exact: true }).click();
  expect(await page.evaluate(() => scheduledFor("2027-07-03").length)).toBe(0);
  const d = (await api(request, "load")).demo;
  expect(d.weakness[0].id).toBe(id);
  expect(d.weakness).toHaveLength(1);
  expect(d.catchup[0].id).toBe(catchupId);
  expect(d.catchup[0].Status).toBe("Done");
});
test("profile photo crops, survives reload, removes, and modal supports Escape and focus", async ({
  page,
  request,
}) => {
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const x = c.getContext("2d");
    x.fillStyle = "#d6bb7f";
    x.fillRect(0, 0, 512, 256);
    return c.toDataURL("image/png").split(",")[1];
  });
  await api(request, "fixture", {
    base64: png,
    mime: "image/png",
    extension: "png",
  });
  await route(page, "profile");
  await page
    .getByRole("button", { name: "Change profile picture", exact: true })
    .click();
  await expect(page.locator(".profile-portrait img")).toBeVisible();
  await page.reload();
  await expect(page.locator(".profile-portrait img")).toBeVisible();
  const dim = await page
    .locator(".profile-portrait img")
    .evaluate((img) => [img.naturalWidth, img.naturalHeight]);
  expect(dim).toEqual([256, 256]);
  await page
    .getByRole("button", { name: "Remove picture", exact: true })
    .click();
  expect((await api(request, "load")).demo.profile.photo).toBeUndefined();
  await route(page, "planner");
  await page
    .getByRole("button", { name: "＋ Add a lesson", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "＋ Add a lesson", exact: true }),
  ).toBeFocused();
});
test("date-only values, midnight rollover, historical selection and Excel leap-day rules", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-12-31T18:59:50Z") });
  await page.reload();
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
  await page.evaluate(() => {
    demo.preferences.timezone = "Asia/Karachi";
    TODAY = "2026-12-31";
    state.date = TODAY;
    state.month = 11;
    state.year = 2026;
  });
  await page.clock.fastForward(40000);
  expect(
    await page.evaluate(() => ({
      today: TODAY,
      date: state.date,
      month: state.month,
      year: state.year,
    })),
  ).toEqual({ today: "2027-01-01", date: "2027-01-01", month: 0, year: 2027 });
  await page.evaluate(() => {
    state.date = "2020-02-29";
  });
  await page.clock.fastForward(86400000);
  expect(await page.evaluate(() => state.date)).toBe("2020-02-29");
  expect(
    await page.evaluate(() => [
      importDate("1"),
      importDate("59"),
      validDate(importDate("60")),
      importDate("61"),
      importDate("0", true),
    ]),
  ).toEqual(["1900-01-01", "1900-02-28", false, "1900-03-01", "1904-01-01"]);
  await route(page, "calendar");
  await page.getByLabel("Choose month").fill("2028-02");
  await expect(page.locator(".calendar-day")).toHaveCount(29);
  await page.getByRole("button", { name: "→", exact: true }).click();
  await expect(page.getByLabel("Choose month")).toHaveValue("2028-03");
});
test("invalid main-process saves remain rejected and failed edits can be discarded without leaking to later saves", async ({
  page,
  request,
}) => {
  await route(page, "profile");
  await page.getByLabel("Display name").fill("Unsaved synthetic name");
  await api(request, "failure", true);
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.locator("#save-status")).toContainText("Not saved");
  await api(request, "failure", false);
  await route(page, "settings");
  await page.getByRole("button", { name: "Save all settings" }).click();
  expect((await api(request, "load")).demo.profile.name).toBeUndefined();
  await page.evaluate(() => {
    timerActive = true;
    timerSeconds = 60;
    timerDuration = 60;
    timerEnd = Date.now() + 60000;
    timerLastWall = Date.now() + 10000;
    timerTick();
  });
  expect(await page.evaluate(() => timerActive)).toBe(false);
  await expect(page.locator("#toast")).toContainText("Clock changed");
});

test('retrying a failed new block saves once and missing correct counts stay unknown', async ({page,request}) => {
  await route(page,'uworld');
  await page.getByLabel('Question selection',{exact:true}).selectOption('Mixed');
  await page.getByLabel('Attempted',{exact:true}).fill('10');
  await api(request,'failure',true);
  await page.getByRole('button',{name:'Save block',exact:true}).click();
  await expect(page.locator('#save-status')).toContainText('Not saved');
  await api(request,'failure',false);
  await page.getByRole('button',{name:'Save block',exact:true}).click();
  expect((await api(request,'load')).demo.logs).toHaveLength(1);
  await expect(page.locator('.stat').nth(1).locator('.value')).toHaveText('—');
  await route(page,'settings');
  await page.getByLabel('Default focus session (minutes)').fill('45');
  await page.getByRole('button',{name:'Save all settings'}).click();
  await page.reload();
  await route(page,'focus');
  await expect(page.locator('#clock')).toHaveText('45:00');
});
