"use strict";
const $ = (s) => document.querySelector(s),
  E = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let TODAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Karachi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
let saved = window.atlasInitial;
let state = {
  page: "home",
  date: TODAY,
  month: Number(TODAY.slice(5, 7)) - 1,
  year: Number(TODAY.slice(0, 4)),
  system: "All systems",
  status: "All statuses",
  query: "",
  ...saved.ui,
};
const demo = saved.demo || {
  logs: [],
  weakness: [],
  catchup: [],
  settings: {},
  checks: {},
  topic: {},
  weekly: {},
};
function persist() {
  return desktopSave();
}
demo.taskStates = demo.taskStates || {};
const nav = [
  [
    "YOUR DESK",
    [
      ["home", "⌂", "Overview"],
      ["today", "☀", "Today’s mission"],
      ["focus", "◷", "Focus room"],
    ],
  ],
  [
    "STUDY & PRACTICE",
    [
      ["planner", "▤", "Daily plan"],
      ["calendar", "▦", "Calendar"],
      ["resources", "◇", "Resource map"],
      ["uworld", "◎", "UWorld"],
      ["anki", "▣", "Anki"],
      ["weakness", "⌁", "Weakness log"],
      ["catchup", "↻", "Catch-up queue"],
    ],
  ],
  [
    "THE BIG PICTURE",
    [
      ["systems", "◉", "System progress"],
      ["assessments", "△", "Assessments"],
      ["weekly", "▥", "Weekly review"],
      ["analytics", "⌇", "Study analytics"],
      ["phases", "≋", "Study phases"],
      ["milestones", "⚑", "Milestones"],
    ],
  ],
  [
    "YOUR SYSTEM",
    [
      ["settings", "⚙", "Exam & settings"],
      ["guide", "☷", "Study guide"],
      ["howto", "↗", "Daily ritual"],
      ["sources", "◈", "Prototype & sources"],
    ],
  ],
];
const names = Object.fromEntries(
  nav.flatMap((g) => g[1]).map((x) => [x[0], x[2]]),
);
const dateFmt = (
  d,
  opts = { day: "numeric", month: "short", year: "numeric" },
) =>
  d ? new Date(d + "T12:00:00").toLocaleDateString("en-GB", opts) : "Not set";
const dt = (r) =>
  r["date:Date:start"] ||
  r["date:Start Date:start"] ||
  r["date:Start:start"] ||
  "";
const sorted = (a) => [...a].sort((a, b) => dt(a).localeCompare(dt(b)));
function questionAccuracy(rows) {
  const attempts = rows.filter((r) => +r.questions > 0);
  if (
    !attempts.length ||
    attempts.some((r) => r.correct == null || r.correct === "")
  )
    return "—";
  return (
    Math.round(
      (attempts.reduce((n, r) => n + +r.correct, 0) /
        attempts.reduce((n, r) => n + +r.questions, 0)) *
        100,
    ) + "%"
  );
}
const day = () => D.daily.find((r) => dt(r) === state.date);
const set = () => ({ ...D.settings, ...demo.settings });
const badge = (s, c = "") => `<span class="badge ${c}">${E(s)}</span>`;
const stat = (label, value, hint, icon = "↗") =>
  `<div class="stat"><div class="label">${label}<span class="gold">${icon}</span></div><div class="value">${value}</div><div class="hint">${hint}</div></div>`;
const stats = (items) =>
  `<div class="grid stats">${items.map((x) => stat(...x)).join("")}</div>`;
const btn = (text, action, cls = "") =>
  `<button class="${cls}" onclick="${action}">${text}</button>`;
const link = (page, text) => `<a href="#${page}">${text} ↗</a>`;
function head(title, desc, actions = "") {
  return `<div class="page-head"><div><div class="eyebrow" style="margin-bottom:11px">STEP 1 · STUDY ATLAS</div><h1>${title}</h1><p>${desc}</p></div><div class="flex">${actions}</div></div>`;
}
function card(title, body, action = "", cls = "") {
  return `<section class="card ${cls}"><div class="card-head"><h2>${title}</h2>${action}</div>${body}</section>`;
}
function empty(title, text, action = "") {
  return `<div class="empty"><div class="empty-icon">◇</div><h3>${title}</h3><p>${text}</p>${action}</div>`;
}
function table(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("") || `<tr><td colspan="${headers.length}"><div class="empty">No matching records.</div></td></tr>`}</tbody></table></div>`;
}
function field(name, label, type = "text", value = "", options) {
  return `<div class="field ${type === "textarea" ? "full" : ""}"><label for="f-${name}">${label}</label>${type === "select" ? `<select name="${name}" id="f-${name}">${options.map((v) => `<option ${String(v) === String(value) ? "selected" : ""}>${E(v)}</option>`).join("")}</select>` : type === "textarea" ? `<textarea name="${name}" id="f-${name}">${E(value)}</textarea>` : `<input id="f-${name}" name="${name}" type="${type}" ${type === "number" ? 'min="0" step="any"' : ""} value="${E(value)}">`}</div>`;
}
function mountain() {
  return `<svg class="mountains" viewBox="0 0 1400 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#8d957e"/><stop offset=".65" stop-color="#556658"/><stop offset="1" stop-color="#364638"/></linearGradient><linearGradient id="rock" x2=".5" y2="1"><stop stop-color="#697964"/><stop offset="1" stop-color="#253c2f"/></linearGradient><filter id="mist"><feGaussianBlur stdDeviation="15"/></filter></defs><rect width="1400" height="360" fill="url(#sky)"/><circle cx="1110" cy="74" r="33" fill="#d1ca9b" opacity=".18"/><path d="M0 255 140 105 220 155 380 38 520 170 635 97 730 170 850 35 1010 192 1110 95 1400 230V360H0Z" fill="#657463"/><path d="M190 300 380 38 440 165 396 123 375 141 355 111 329 172Z M730 235 850 35 916 120 868 96 850 120 831 91 792 167Z" fill="#c5c8b3" opacity=".54"/><path d="M0 300 160 210 280 255 490 116 650 276 820 169 945 258 1118 124 1400 300V360H0Z" fill="url(#rock)"/><path d="M310 300 490 116 558 210 514 183 491 213 469 174 433 232Z M1000 270 1118 124 1205 228 1140 197 1115 219 1098 176Z" fill="#a0ae96" opacity=".4"/><path d="M-100 335Q200 240 550 316T1450 278" fill="none" stroke="#a4b6a0" stroke-width="42" opacity=".17" filter="url(#mist)"/><path d="M0 320 200 275 390 340 665 257 800 310 990 282 1190 329 1400 258V360H0Z" fill="#203c2d"/><path d="M0 355 240 330 500 355 690 315 900 355 1220 319 1400 338V360H0Z" fill="#172d23"/></svg>`;
}
function hero() {
  return `<section class="hero">${mountain()}<div class="hero-copy"><span class="eyebrow">A LITTLE PROGRESS. EVERY STUDY DAY.</span><h1>A clear mind.<br>A steady climb.</h1><p>Your Step 1 journey, thoughtfully organized.<br>One meaningful session at a time.</p><div class="flex">${btn("Begin today’s mission →", "go('today')", "primary")}${badge("Phase 1 · Systems", "dim")}</div></div><div class="hero-label">USMLE · YOUR PERSONAL STUDY SANCTUARY</div></section>`;
}
function taskList(r = day()) {
  if (!r)
    return empty(
      "No plan loaded for this date",
      "Choose a date from the calendar.",
    );
  if (r["Planned Hours"] === 0)
    return empty(
      "Nothing is owed today",
      "Your regular plan is protected. Any catch-up below was deliberately assigned to this date.",
    );
  const items =
    r["Day Type"] === "Assessment Day"
      ? [
          ["Assessment first", r["Main Task"], "Planned assessment"],
          ["Assessment review", r["Secondary Task"], "Follow-up"],
        ]
      : [
          ["Anki · retention", r["Anki Target"], "45 min"],
          ["Concept learning", r["Main Task"], "60 min"],
          ["First Aid · integrate", r["First Aid Target"], "30 min"],
          [
            "UWorld · apply & review",
            `${r["UWorld Target"] || 0} questions · answering and explanation review`,
            "120 min",
          ],
          ["Closeout · reflect", r["Secondary Task"], "15 min"],
        ];
  return items
    .map((x, i) => {
      const date = dt(r),
        key = date + "-" + i,
        t = demo.taskStates[key] || {},
        status = t.status || (demo.checks[key] ? "Completed" : "Not started");
      return `<div class="task mission-task"><div class="task-copy"><div class="flex between"><b>${x[0]}</b><span class="duration">${x[2]}</span></div><p>${E(x[1])}</p>${state.page === "today" ? `<div class="task-controls"><label>Status<select aria-label="${E(x[0])} status" onchange="setTask('${key}','status',this.value)">${["Not started", "In progress", "Completed", "Needs review", "Deferred", "Skipped"].map((v) => `<option ${status === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><label>Priority<select aria-label="${E(x[0])} priority" onchange="setTask('${key}','priority',this.value)">${["Normal", "High", "Low"].map((v) => `<option ${(t.priority || "Normal") === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>${btn("Schedule catch-up", `scheduleTask('${date}',${i})`, "small ghost")}</div>` : badge(status, "dim")}</div></div>`;
    })
    .join("");
}

function dateControl() {
  return `<input aria-label="Plan date" type="date" value="${state.date}" onchange="state.date=this.value;persist();render()">`;
}
function today() {
  const r = day(),
    last = dailyLog();
  return (
    head(
      "Today’s mission",
      "Your calendar plan and daily record, together in one calm workspace.",
      dateControl(),
    ) +
    `<section class="mission-brief"><div><div class="pill-row">${badge(r?.["Primary System/Subject"] || "Your study day", "gold")}${badge(r?.["Day Type"] || "Unscheduled", "dim")}${badge(last.outcome || r?.Status || "Not logged", "dim")}</div><h2>${E(r?.["Main Task"] || "No regular calendar assignment")}</h2><p>${E(r?.["Why this today?"] || "You can still record a study session and see any scheduled catch-up.")}</p></div><div class="mission-links">${btn("Enter focus room", "go('focus')", "primary")}${link("calendar", "Calendar")}${link("weakness", "Weakness collection")}</div></section>${r?.["Planned Hours"] === 0 ? '<div class="mini-note section-gap">Protected day · No regular study is owed. Any catch-up below was intentionally assigned to this date.</div>' : ""}${missionForm()}${scheduledPanel(state.date)}<details class="mission-guide"><summary>Resource guidance & why this plan works</summary><p>${E(r?.["B&B Target"] || "Use B&B only where understanding needs repair.")}</p><p>${E(r?.["Secondary Task"] || "")}</p><p>${E(r?.Notes || "")}</p></details>`
  );
}
function dailyLog() {
  return demo.logs.find((x) => x.date === state.date && !x._block) || {};
}

function plannedTopics(r = day()) {
  if (!r) return [];
  let urls = r.Curriculum || [];
  if (typeof urls === "string") {
    try {
      urls = JSON.parse(urls);
    } catch {
      urls = [];
    }
  }
  return D.curriculum.filter(
    (t) => urls.includes(t.url) || t["date:Start Date:start"] === state.date,
  );
}
function missionChoice(key, index) {
  const t = demo.taskStates[state.date + "-" + index] || {};
  return `<div class="mission-choices"><label>Status<select name="taskStatus${index}" aria-label="${key} status">${["Not started", "In progress", "Completed", "Needs review", "Deferred", "Skipped"].map((v) => `<option ${v === (t.status || "Not started") ? "selected" : ""}>${v}</option>`).join("")}</select></label><label>Priority<select name="taskPriority${index}" aria-label="${key} priority">${["Normal", "High", "Low"].map((v) => `<option ${v === (t.priority || "Normal") ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>`;
}
function missionForm() {
  const r = day(),
    last = dailyLog(),
    topics = plannedTopics(r);
  const num = (name, label, value, placeholder = "") =>
    `<label class="input-label">${label}<input type="number" name="${name}" min="0" step="1" aria-label="${label}" value="${E(value ?? "")}" placeholder="${placeholder}"></label>`;
  return `<form id="daily-form" onsubmit="saveEntry(event)"><div class="mission-hours"><label class="hour-box"><span>◷ FOCUSED STUDY HOURS</span><div><input type="number" name="hours" aria-label="Actual study hours" min="0" max="24" step="0.25" value="${E(last.hours ?? "")}" placeholder="0.0"><small>hours studied</small></div><p>Actual focused time, including question review.</p></label><label class="hour-box"><span>◎ TODAY’S GOAL HOURS</span><div><input type="number" name="target" aria-label="Today's goal hours" min="0" max="24" step="0.25" value="${E(last.target ?? r?.["Planned Hours"] ?? 0)}"><small>hours planned</small></div><p>From the calendar · Adjust to fit your day.</p></label></div><section class="card mission-entry"><div class="card-head"><div><span class="eyebrow">PLAN → STUDY → RECORD</span><h2 style="margin-top:9px">Your daily study record</h2></div><span class="badge dim">${last.date ? "Saved on this device" : "Ready when you are"}</span></div><div class="table-wrap"><table class="quick-table mission-table"><thead><tr><th>Study area & calendar details</th><th>Your input</th><th>Progress & detail</th><th>Connected collection</th></tr></thead><tbody><tr><td><strong>▱ First Aid / concepts</strong><div class="planned-topic-list">${topics.length ? topics.map((t) => `<button type="button" class="topic-link" onclick="topicDetail('${t.url}')">${E(t.Topic)} ↗</button>`).join("") : `<small>${E(r?.["First Aid Target"] || "No First Aid topic assigned on this date.")}</small>`}</div><small>${E(r?.["First Aid Target"] || "Calendar-linked topics")}</small></td><td colspan="2"><div class="topic-progress-list">${topics.map((t) => `<div class="topic-progress-row"><div><strong>${E(t.Topic)}</strong><small>${E(t["FA Reference"])}</small></div><label class="input-label">Topic progress<select name="topic:${E(t.url)}" aria-label="${E(t.Topic)} progress">${["Not Started", "In Progress", "Reviewed", "Mastered"].map((v) => `<option ${topicStatus(t) === v ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>`).join("") || '<span class="muted">No topic status to update.</span>'}${missionChoice("Concept study", 1)}</div></td><td>${link("curriculum", "Curriculum")}</td></tr><tr><td><strong>◎ UWorld</strong><small>Calendar target: ${E(r?.["UWorld Target"] ?? 0)} questions<br>Answering and explanation review</small></td><td>${num("questions", "Attempted", last.questions)}</td><td><div class="input-pair">${num("correct", "Correct", last.correct)}${num("reviewed", "Reviewed", last.reviewed)}</div>${missionChoice("UWorld", 3)}</td><td>${link("uworld", "UWorld tracker")}</td></tr><tr><td><strong>▣ Anki</strong><small>${E(r?.["Anki Target"] || "No routine Anki assignment.")}<br>New-card ceiling: ${E(r?.["New Card Budget"] ?? 0)}</small></td><td>${num("anki", "Reviews completed", last.anki)}</td><td><div class="input-pair">${num("due", "Reviews due", last.due)}${num("newcards", "New cards", last.newcards)}</div>${missionChoice("Anki", 0)}</td><td>${link("anki", "Anki tracker")}</td></tr><tr><td><strong>⌁ Weak concepts</strong><small>Keep the precise ideas that need another look. One concept per line.</small></td><td colspan="2"><label class="input-label">Add to your weakness collection<textarea name="weakness" aria-label="Weak concepts" placeholder="For example: the concept you could not explain clearly">${E(last.weakness || "")}</textarea></label><small>Saving adds new concepts to the Weakness Log and reuses matching concepts.</small></td><td><a href="#weakness">Open collection ↗</a><small>${demo.weakness.length} saved concepts</small></td></tr><tr><td><strong>✓ Daily outcome</strong><small>Record the outcome and give unfinished priorities a date.</small></td><td><label class="input-label">Outcome<select name="outcome" aria-label="Day outcome">${["In Progress", "Done", "Deferred"].map((v) => `<option ${v === (last.outcome || "In Progress") ? "selected" : ""}>${v}</option>`).join("")}</select></label></td><td><label class="input-label">Priority unfinished work<input name="unfinished" aria-label="Priority unfinished work" value="${E(last.unfinished || "")}" placeholder="Only what still matters"></label><label class="input-label">Catch-up date<input type="date" name="catchupDate" aria-label="Designated catch-up date" value="${E(last.catchupDate || "")}"></label></td><td>${link("catchup", "Catch-up queue")}</td></tr></tbody></table></div><div class="field section-gap"><label for="daily-notes">Your note for the day</label><textarea id="daily-notes" name="notes" placeholder="What clicked? What would you like to remember?">${E(last.notes || "")}</textarea></div><div class="card-foot mission-save"><span class="muted">Saved on this device · Stored locally · back up regularly</span><button class="primary" type="submit">Save today’s record →</button></div></section></form>`;
}

function topicStatus(r) {
  return demo.topic[r.url] || r["Overall Status"];
}

let timerSeconds = 25 * 60,
  timerDuration = 25 * 60,
  timerActive = false,
  timerInterval,
  timerEnd = 0;
function focus() {
  return `<div class="focus-heading"><span class="eyebrow">YOUR FOCUS ROOM</span><h1>Just this moment.</h1><p class="muted">One task. Your pace. Full attention.</p></div><div class="focus"><section class="card"><span class="eyebrow">${E(day()?.["Primary System/Subject"] || "YOUR STUDY SESSION")}</span><h2>${E(day()?.["Main Task"] || "One meaningful study session")}</h2><div class="clock" id="clock" role="timer" aria-label="Time remaining">${clockText()}</div><div class="flex timer-actions">${btn(timerActive ? "Pause" : "Start session", "toggleTimer()", "primary")}${btn("Reset", "resetTimer()", "ghost")}</div><div class="tabs timer-presets">${[25, 45, 60].map((n) => btn(n + " min", `setTimerMinutes(${n})`, timerDuration === n * 60 ? "active" : "")).join("")}${btn("Custom time", "customTimer()", ![1500, 2700, 3600].includes(timerDuration) ? "active" : "")}</div><div class="focus-close"><span class="muted">A steady session is enough.</span>${link("today", "Record your session")}</div></section></div>`;
}
function markdown(raw) {
  return raw
    .split("\n")
    .map((l) => {
      l = l
        .replace(/ \{color="[^"]+"\}/g, "")
        .replace(
          /<mention-date start="([^"]+)"(?: end="([^"]+)")?\/>/g,
          (_, a, b) => dateFmt(a) + (b ? " – " + dateFmt(b) : ""),
        );
      if (l.startsWith("## ")) return `<h2>${E(l.slice(3))}</h2>`;
      if (l.startsWith("- ")) return `<p>• ${E(l.slice(2))}</p>`;
      return l.trim()
        ? `<p>${E(l).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`
        : "";
    })
    .join("");
}
function render() {
  const page = state.page;
  document.body.classList.toggle("focus-page", page === "focus");
  $("#sidebar").innerHTML =
    `<a href="#home" class="brand"><div class="mark">△</div><div><strong>USMLE</strong><small>STEP 1 · STUDY ATLAS</small></div></a><div class="nav-scroll"><nav>${nav.map((g) => `<div class="nav-label">${g[0]}</div>${g[1].map(([id, ic, name]) => `<a href="#${id}" class="${id === page ? "active" : ""}"><span class="ico">${ic}</span>${name}</a>`).join("")}`).join("")}</nav></div><div class="profile"><span class="avatar">US</span><div>Your study workspace<small style="display:block;color:var(--muted);margin-top:5px">A steady climb to Step 1</small></div></div>`;
  $("#topbar").innerHTML =
    `<div class="flex">${btn("☰", "document.body.classList.toggle('nav-open')", "menu-toggle ghost")}<span class="crumb">Your study sanctuary <span style="padding:0 10px">/</span><b>${names[page]}</b></span></div><div class="top-actions"><span class="badge"><span class="dot"></span>REAL NOTION SNAPSHOT</span><a href="#sources" class="badge gold">DESIGN PREVIEW</a>${btn("Today’s mission", "go('today')", "small ghost")}</div>`;
  const pages = {
    home,
    today,
    planner,
    calendar,
    curriculum,
    resources: () => curriculum(true),
    systems,
    uworld,
    anki,
    assessments,
    weakness,
    catchup,
    weekly,
    analytics,
    phases,
    milestones,
    settings,
    guide,
    howto,
    sources,
    focus,
  };
  $("#main").innerHTML = pages[page]();
  document.title = `${names[page]} · USMLE`;
}
function go(p, keep = false) {
  if (p === "entry") p = "today";
  if (p === "home") state.date = TODAY;
  if (!keep) {
    state.query = "";
    state.system = "All systems";
    state.status = "All statuses";
  }
  if (location.hash === "#" + p) {
    state.page = p;
    render();
  } else location.hash = p;
  document.body.classList.remove("nav-open");
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", () => {
  state.page =
    location.hash === "#entry"
      ? "today"
      : names[location.hash.slice(1)]
        ? location.hash.slice(1)
        : "home";
  state.query = "";
  state.status = "All statuses";
  render();
  document.body.classList.remove("nav-open");
  window.scrollTo(0, 0);
});
function filterQuery(v) {
  state.query = v;
  const s = document.activeElement.selectionStart;
  render();
  const el = $(".search");
  el.focus();
  el.setSelectionRange(s, s);
}
function changeMonth(n) {
  const d = new Date(state.year, state.month + n, 1);
  state.year = d.getFullYear();
  state.month = d.getMonth();
  persist();
  render();
}
function openDay(d) {
  state.date = d;
  persist();
  go("today");
}

function toast(t) {
  $("#toast").textContent = t;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 3200);
}
function modal(title, body, sub = "") {
  const o = $("#overlay");
  o.hidden = false;
  o.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-label="${E(title)}"><div class="modal-head"><div><span class="eyebrow">${sub || "STUDY ATLAS · RECORD DETAIL"}</span><h2 style="margin:12px 0 0">${E(title)}</h2></div>${btn("×", "closeModal()", "close ghost")}</div>${body}</section>`;
  o.querySelector("button,input,select,textarea")?.focus();
  document.body.style.overflow = "hidden";
}
function closeModal() {
  $("#overlay").hidden = true;
  document.body.style.overflow = "";
}
$("#overlay").addEventListener("click", (e) => {
  if (e.target.id === "overlay") closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
  if (e.key === "Tab" && !$("#overlay").hidden) {
    const nodes = [
      ...$("#overlay").querySelectorAll("button,input,select,textarea,a[href]"),
    ];
    if (e.shiftKey && document.activeElement === nodes[0]) {
      e.preventDefault();
      nodes.at(-1).focus();
    } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
      e.preventDefault();
      nodes[0].focus();
    }
  }
});
function topicDetail(url) {
  const t = D.curriculum.find((x) => x.url === url);
  modal(
    t.Topic,
    `<div class="pill-row">${badge(t.System, "gold")}${badge(t.Discipline, "dim")}${badge(t.Priority + " priority", "dim")}</div><div class="detail-grid">${["FA Reference", "B&B topic reference", "FA Status", "B&B Status", "Anki Status", "UWorld Status"].map((k) => `<div class="detail-item"><small>${E(k)}</small><div>${E(t[k])}</div></div>`).join("")}</div><div class="guide">${markdown(t._body || "")}</div><div class="form-section">TOPIC PROGRESS</div><select aria-label="Topic status" onchange="demo.topic['${t.url}']=this.value;persist();toast('Topic status saved.')">${["Not Started", "In Progress", "Reviewed", "Mastered"].map((s) => `<option ${topicStatus(t) === s ? "selected" : ""}>${s}</option>`).join("")}</select><div class="modal-actions"><a href="#resources">Resource map ↗</a>${btn("Done", "closeModal();render()", "primary")}</div>`,
  );
}
function displayVal(v) {
  if (v == null || v === "") return "Not entered";
  if (v === "__YES__") return "Yes";
  if (v === "__NO__") return "No";
  if (Array.isArray(v)) return `${v.length} linked records`;
  if (typeof v === "string" && v.startsWith('["https://')) {
    try {
      return JSON.parse(v).length + " linked records";
    } catch {}
  }
  return String(v).replaceAll("\\", "");
}
function recordDetail(group, url) {
  const r = D[group].find((x) => x.url === url);
  modal(
    r.Assessment || r.Phase || r.Milestone || r.Day || r._title || "Record",
    `<div class="detail-grid">${Object.entries(r)
      .filter(
        ([k, v]) =>
          !k.startsWith("_") &&
          k !== "url" &&
          !k.endsWith(":is_datetime") &&
          !String(v).match(/^(formulaResult|rollupResult):/),
      )
      .map(
        ([k, v]) =>
          `<div class="detail-item"><small>${E(k.replace(/^date:/, "").replace(/:start$/, ""))}</small><div>${E(displayVal(v))}</div></div>`,
      )
      .join(
        "",
      )}</div><p class="screen-note">Unresolved formula and rollup values are omitted.</p><div class="modal-actions"><a href="#sources">Workspace information ↗</a>${group === "assessments" ? btn("Edit assessment", `assessmentEditor(demo.assessmentRecords.findIndex(x=>x.id==='${url}'))`, "primary") : ""}</div>`,
  );
}

function weeklyDetail(url) {
  const w = D.weekly.find((x) => x.url === url),
    local = demo.weekly[url] || {};
  modal(
    w.Week.replaceAll("\\", ""),
    `<span class="badge gold">${E(w.Focus)}</span><form onsubmit="saveWeekly(event,'${url}')"><div class="form-grid section-gap">${["Biggest Wins", "Major Weaknesses", "Missed/Deferred Work", "Systems Completed", "Next Week Priority"].map((k, i) => field("q" + i, k, "textarea", local[k] ?? w[k] ?? "")).join("")}</div><div class="modal-actions"><button class="primary">Save reflection</button></div></form>`,
    "SATURDAY · WEEKLY REFLECTION",
  );
}
function saveWeekly(e, url) {
  e.preventDefault();
  const f = new FormData(e.target);
  demo.weekly[url] = {};
  [
    "Biggest Wins",
    "Major Weaknesses",
    "Missed/Deferred Work",
    "Systems Completed",
    "Next Week Priority",
  ].forEach((k, i) => (demo.weekly[url][k] = f.get("q" + i)));
  persist();
  closeModal();
  toast("Reflection saved on this device preview.");
}
function saveEntry(e) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  if (
    Number(f.correct) > Number(f.questions) ||
    Number(f.reviewed) > Number(f.questions)
  ) {
    toast("Correct and reviewed counts cannot exceed attempted questions.");
    return;
  }
  if (f.unfinished?.trim() && !validDate(f.catchupDate)) {
    toast("Choose a date for the unfinished work.");
    return;
  }
  const log = {
    ...dailyLog(),
    ...f,
    date: state.date,
    system: day()?.["Primary System/Subject"] || dailyLog().system || "",
    selection: dailyLog().selection || "Daily mission",
  };
  const ix = demo.logs.findIndex((x) => x.date === state.date && !x._block);
  if (ix >= 0) demo.logs[ix] = log;
  else demo.logs.push(log);
  Object.entries(f).forEach(([key, value]) => {
    if (key.startsWith("topic:")) {
      const url = key.slice(6);
      demo.topic[url] = value;
      const t = D.curriculum.find((x) => x.url === url);
      if (t) {
        t["Overall Status"] = value;
        t["FA Status"] = value;
        demo.edits[url] = {
          ...demo.edits[url],
          "Overall Status": value,
          "FA Status": value,
        };
      }
    }
  });
  for (const i of [0, 1, 3]) {
    demo.taskStates[state.date + "-" + i] = {
      status: f["taskStatus" + i] || "Not started",
      priority: f["taskPriority" + i] || "Normal",
    };
  }
  const weakTopics = (f.weakness || "")
    .split(/\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  for (const text of [...new Set(weakTopics)]) {
    let w = demo.weakness.find(
      (x) =>
        (x["Weak Topic"] || "").trim().toLowerCase() === text.toLowerCase(),
    );
    if (!w) {
      w = {
        "Weak Topic": text,
        Status: "Open",
        Severity: "Medium",
        System: day()?.["Primary System/Subject"] || "",
        Source: "Daily mission",
        "Date Identified": state.date,
      };
      demo.weakness.push(w);
    }
    w._missionDates = [...new Set([...(w._missionDates || []), state.date])];
  }
  if (f.unfinished?.trim()) {
    const existing = demo.catchup.find((x) => x._entryDate === state.date);
    const update = {
      Item: f.unfinished,
      "Rescheduled For": f.catchupDate,
      Status: "Scheduled",
      _entryDate: state.date,
    };
    if (existing) Object.assign(existing, update);
    else demo.catchup.push(update);
  }
  persist();
  toast(
    "Daily record saved. Your study trackers and weakness collection are updated.",
  );
  render();
}
function newRecord(type) {
  const forms = {
    weakness:
      field("Weak Topic", "Weak concept") +
      field("System", "System", "select", "Cardio", [
        ...new Set(D.curriculum.map((x) => x.System)),
      ]) +
      field("Severity", "Severity", "select", "Medium", [
        "High",
        "Medium",
        "Low",
      ]) +
      field("Source", "Source", "select", "UWorld", [
        "UWorld",
        "Anki",
        "Assessment",
        "First Aid",
        "Other",
      ]) +
      field(
        "Correct Concept",
        "Correct concept, in your own words",
        "textarea",
      ) +
      field("Review Date", "Review date", "date", TODAY),
    catchup:
      field("Item", "Priority unfinished work") +
      field("Estimated Hours", "Estimated hours", "number") +
      field("Category", "Category", "select", "Current content", [
        "Current content",
        "UWorld",
        "Anki reviews",
        "B&B",
        "Optional",
      ]) +
      field("Rescheduled For", "Designated date", "date", state.date).replace(
        'type="date"',
        'type="date" required',
      ) +
      field("Notes", "Notes for the scheduled day", "textarea"),
    uworld:
      field("date", "Date", "date", state.date) +
      field("questions", "Questions attempted", "number") +
      field("correct", "Correct answers", "number") +
      field("reviewed", "Reviewed questions", "number") +
      field("mode", "Mode", "select", "Tutor", ["Tutor", "Timed"]) +
      field("selection", "Selection", "select", "System-based", [
        "System-based",
        "Mixed",
      ]),
  };
  modal(
    {
      weakness: "Capture a weak concept",
      catchup: "Make room for a priority",
      uworld: "Log a UWorld block",
    }[type],
    `<form onsubmit="saveRecord(event,'${type}')"><div class="form-grid">${forms[type]}</div><p class="screen-note">Records stay on this device.</p><div class="modal-actions"><button class="primary">Save entry</button></div></form>`,
    "LOCAL RECORD",
  );
}
function saveRecord(e, type) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  if (type === "uworld") {
    if (
      !Number(f.questions) ||
      Number(f.correct) > Number(f.questions) ||
      Number(f.reviewed) > Number(f.questions)
    ) {
      toast(
        "Enter a valid attempted count; correct and reviewed cannot exceed it.",
      );
      return;
    }
    demo.logs.push({ ...f, _block: true });
  } else {
    if (!(f["Weak Topic"] || f.Item)?.trim()) {
      toast("Give this entry a name first.");
      return;
    }
    if (type === "catchup" && !validDate(f["Rescheduled For"])) {
      toast("Choose the designated date.");
      return;
    }
    demo[type].push({
      ...f,
      Status: type === "weakness" ? "Open" : "Scheduled",
    });
  }
  persist();
  closeModal();
  render();
  toast("Preview entry saved on this device.");
}

function clockText() {
  return (
    String(Math.floor(timerSeconds / 60)).padStart(2, "0") +
    ":" +
    String(timerSeconds % 60).padStart(2, "0")
  );
}
function toggleTimer() {
  if (timerActive) {
    timerSeconds = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
    timerActive = false;
    clearInterval(timerInterval);
  } else {
    if (timerSeconds <= 0) timerSeconds = timerDuration;
    timerEnd = Date.now() + timerSeconds * 1000;
    timerActive = true;
    timerInterval = setInterval(() => {
      timerSeconds = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      if ($("#clock")) $("#clock").textContent = clockText();
      if (timerSeconds === 0) {
        timerActive = false;
        clearInterval(timerInterval);
        if (state.page === "focus") render();
        toast("Session complete. Take a breath.");
      }
    }, 250);
  }
  render();
}
function resetTimer() {
  clearInterval(timerInterval);
  timerActive = false;
  timerSeconds = timerDuration;
  render();
}

function validDate(d) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(d || "") &&
    !Number.isNaN(new Date(d + "T12:00:00Z").getTime()) &&
    new Date(d + "T12:00:00Z").toISOString().slice(0, 10) === d
  );
}
function scheduledFor(date) {
  return demo.catchup.filter(
    (x) =>
      x["Rescheduled For"] === date && !["Done", "Dropped"].includes(x.Status),
  );
}
function scheduledPanel(date) {
  const a = scheduledFor(date);
  return a.length
    ? `<section class="scheduled-panel"><div class="card-head"><h3>↻ Catch-up scheduled for this day</h3>${badge(a.length + " added", "gold")}</div>${a.map((x) => `<div class="task"><div class="task-copy"><b>${E(x.Item)}</b><p>${E(x.Notes || "Alongside your regular study plan")}${x["Estimated Hours"] ? " · " + E(x["Estimated Hours"]) + " h" : ""}</p><div class="task-controls"><label>Status<select aria-label="Scheduled task status" onchange="setCatchupStatus(${demo.catchup.indexOf(x)},this.value)">${["Scheduled", "In Progress", "Done", "Dropped"].map((v) => `<option ${x.Status === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><label>Move to date<input aria-label="Move catch-up date" type="date" value="${date}" onchange="rescheduleCatchup(${demo.catchup.indexOf(x)},this.value)"></label></div></div></div>`).join("")}</section>`
    : "";
}
function setTask(key, property, value) {
  demo.taskStates[key] = { ...(demo.taskStates[key] || {}), [property]: value };
  persist();
  toast("Task preference saved.");
}
function scheduleTask(date, index) {
  const r = D.daily.find((x) => dt(x) === date),
    titles =
      r["Day Type"] === "Assessment Day"
        ? [
            "Assessment: " + r["Main Task"],
            "Assessment review: " + r["Secondary Task"],
          ]
        : [
            "Anki: " + r["Anki Target"],
            "Concept learning: " + r["Main Task"],
            "First Aid: " + r["First Aid Target"],
            "UWorld: " + r["UWorld Target"] + " questions with review",
            "Closeout: " + r["Secondary Task"],
          ];
  newRecord("catchup");
  $("#f-Item").value = titles[index];
}
function rescheduleCatchup(i, date) {
  if (!validDate(date)) {
    toast("Choose a valid date.");
    render();
    return;
  }
  const x = demo.catchup[i];
  x["Rescheduled For"] = date;
  if (!["Done", "Dropped"].includes(x.Status)) x.Status = "Scheduled";
  persist();
  render();
  toast("Item moved to " + dateFmt(date) + ".");
}
function setCatchupStatus(i, status) {
  const x = demo.catchup[i];
  if (status === "Scheduled" && !validDate(x["Rescheduled For"])) {
    toast("Choose a date first.");
    render();
    return;
  }
  x.Status = status;
  persist();
  render();
}
function setTimerMinutes(n) {
  if (!Number.isInteger(n) || n < 1 || n > 720) {
    toast("Choose a whole number from 1 to 720 minutes.");
    return false;
  }
  clearInterval(timerInterval);
  timerActive = false;
  timerDuration = n * 60;
  timerSeconds = timerDuration;
  render();
  return true;
}
function customTimer() {
  modal(
    "Your time, your pace",
    `<form onsubmit="event.preventDefault();if(setTimerMinutes(Number(this.elements.minutes.value)))closeModal()"><div class="field"><label for="custom-minutes">Session length in minutes</label><input id="custom-minutes" name="minutes" type="number" required min="1" max="720" step="1" value="${timerDuration / 60}"></div><p class="screen-note">Choose between 1 and 720 minutes. Reset returns to this duration.</p><div class="modal-actions"><button class="primary">Set custom time</button></div></form>`,
    "FOCUS TIMER",
  );
}

// Browser-persisted edits are applied to the shared snapshot for all views.
demo.edits ||= {};
for (const group of ["daily", "curriculum"])
  for (const r of D[group]) Object.assign(r, demo.edits[r.url] || {});
const statuses = [
  "Not Started",
  "In Progress",
  "Reviewed",
  "Mastered",
  "Skipped",
];
const systemsList = () =>
  [...new Set(D.curriculum.map((r) => r.System))].sort();
const originalDaily = JSON.parse(
  JSON.stringify(window.atlasInitial.seed.daily),
);
demo.pause ||= { start: "", end: "", label: "No protected break set" };
function isPause(date) {
  return (
    Boolean(demo.pause.start) &&
    date >= demo.pause.start &&
    date <= demo.pause.end
  );
}
function applyPause() {
  for (const r of D.daily) {
    const base = originalDaily.find((x) => x.url === r.url) || r;
    for (const k of Object.keys(r)) delete r[k];
    Object.assign(r, base, demo.edits[base.url] || {});
    if (base.Status === "PAUSED" && !isPause(dt(r)) && !demo.edits[r.url])
      Object.assign(r, {
        Status: "Not Started",
        "Primary System/Subject": "Unscheduled",
        "Main Task": "Add your study plan for this date",
        "Day Type": "Unscheduled",
      });
    if (isPause(dt(r)))
      Object.assign(r, {
        "Planned Hours": 0,
        "UWorld Target": 0,
        "New Card Budget": 0,
        Status: "PAUSED",
        "Primary System/Subject": demo.pause.label,
        "Main Task": "Protected break — nothing owed",
      });
  }
}
applyPause();
function editInput(group, i, key, type = "text", options) {
  const r = (
      group === "daily" || group === "curriculum" ? D[group] : demo[group]
    )[i],
    v = key === "Overall Status" ? topicStatus(r) : r[key];
  const handler = function () {
    editCell(group, i, key, this.value);
  };
  return options
    ? `<select aria-label="${E(key)}" onchange="${handler}">${[...new Set([v || "", ...options])].map((x) => `<option ${x === v ? "selected" : ""}>${E(x)}</option>`).join("")}</select>`
    : `<input aria-label="${E(key)}" type="${type}" ${type === "number" ? 'min="0" step="any"' : ""} value="${E(v)}" onchange="${handler}">`;
}
function editCell(group, i, key, value) {
  const r = (
    D[group] && ["daily", "curriculum"].includes(group) ? D[group] : demo[group]
  )[i];
  if (
    ["Planned Hours", "Estimated Hours"].includes(key) &&
    (Number(value) < 0 || Number(value) > 24)
  ) {
    toast("Hours must be between 0 and 24.");
    render();
    return;
  }
  if (
    group === "daily" &&
    key === "date:Date:start" &&
    (!validDate(value) || D.daily.some((x) => x !== r && dt(x) === value))
  ) {
    toast("Choose a valid, unused date.");
    render();
    return;
  }
  r[key] = [
    "Planned Hours",
    "UWorld Target",
    "New Card Budget",
    "Estimated Hours",
    "FA order",
  ].includes(key)
    ? Number(value)
    : value;
  if (["daily", "curriculum"].includes(group)) {
    demo.edits[r.url] = { ...(demo.edits[r.url] || {}), [key]: r[key] };
    if (key === "Overall Status") demo.topic[r.url] = value;
  }
  persist();
  toast("Saved on this device.");
  if (group === "catchup") render();
}
function savePause(e) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  if (
    (f.start || f.end) &&
    (!validDate(f.start) || !validDate(f.end) || f.end < f.start)
  ) {
    toast("Choose a valid start and end date.");
    return;
  }
  demo.pause = f;
  applyPause();
  persist();
  render();
}

const faChapters = [
  "Biochemistry",
  "Immunology",
  "Microbiology",
  "Pathology",
  "Pharmacology",
  "Public Health Sciences",
  "Cardiovascular",
  "Endocrine",
  "Gastrointestinal",
  "Hematology and Oncology",
  "Musculoskeletal, Skin, and Connective Tissue",
  "Neurology and Special Senses",
  "Psychiatry",
  "Renal",
  "Reproductive",
  "Respiratory",
  "Rapid Review",
  "Supplemental / integrated topics",
];
const faMap = {
  Biochem: 0,
  Immunology: 1,
  Microbiology: 2,
  "General Pathology": 3,
  Pharmacology: 4,
  Biostatistics: 5,
  Ethics: 5,
  Cardio: 6,
  Endocrine: 7,
  GI: 8,
  Heme: 9,
  Oncology: 9,
  MSK: 10,
  Derm: 10,
  Neuro: 11,
  Behavioral: 12,
  Renal: 13,
  Reproductive: 14,
  Respiratory: 15,
  "Mixed / Integration": 16,
};
function faChapter(r) {
  return r["FA chapter"] || faChapters[faMap[r.System] ?? 17];
}

let blockEdit = -1;
function blockForm() {
  const r = demo.logs[blockEdit] || {
    date: state.date,
    selection: "System-wise",
    mode: "Tutor",
  };
  return `<form class="card" onsubmit="saveBlock(event)"><h2>${blockEdit < 0 ? "Log a UWorld block" : "Edit UWorld record"}</h2><div class="form-grid">${field("date", "Date", "date", r.date)}${field("selection", "Question selection", "select", r.selection || "System-wise", ["System-wise", "Mixed"]).replace("<select ", '<select onchange="toggleBlockSystem(this.value)" ')}<div id="block-system" ${r.selection === "Mixed" ? "hidden" : ""}>${field("system", "Which system?", "select", r.system || "", ["", ...systemsList()])}</div>${field("mode", "Mode", "select", r.mode || "Tutor", ["Tutor", "Timed"])}${field("questions", "Attempted", "number", r.questions)}${field("correct", "Correct", "number", r.correct)}${field("reviewed", "Reviewed", "number", r.reviewed)}${field("notes", "Notes", "textarea", r.notes || "")}${field("weak", "Weak concepts — one per line", "textarea")}</div><div class="modal-actions"><button type="button" onclick="blockEdit=-1;render()">Clear / cancel</button><button class="primary">Save block</button></div></form>`;
}
function toggleBlockSystem(v) {
  $("#block-system").hidden = v === "Mixed";
  if (v !== "Mixed") $("#f-system").focus();
}
function captureConcept(text, system, source, date = state.date) {
  if (
    !text.trim() ||
    demo.weakness.some(
      (x) => x["Weak Topic"].toLowerCase() === text.trim().toLowerCase(),
    )
  )
    return;
  demo.weakness.push({
    "Weak Topic": text.trim(),
    System: system,
    Source: source,
    "Date Identified": date,
    Status: "Open",
    Severity: "Medium",
    "Review Date": date,
  });
}
function saveBlock(e) {
  e.preventDefault();
  let f = Object.fromEntries(new FormData(e.target));
  if (
    !validDate(f.date) ||
    !Number.isInteger(+f.questions) ||
    +f.questions < 1 ||
    ["correct", "reviewed"].some(
      (k) => !Number.isInteger(+f[k]) || +f[k] < 0 || +f[k] > +f.questions,
    )
  ) {
    toast(
      "Use valid whole counts; correct and reviewed cannot exceed attempts.",
    );
    return;
  }
  if (f.selection === "System-wise" && !f.system) {
    toast("Choose which system you studied.");
    $("#f-system").focus();
    return;
  }
  if (f.selection === "Mixed") f.system = "Mixed";
  const weak = f.weak;
  delete f.weak;
  if (blockEdit < 0) demo.logs.push({ ...f, _block: true });
  else Object.assign(demo.logs[blockEdit], f);
  weak.split("\n").forEach((x) => captureConcept(x, f.system, "UWorld", f.date));
  persist();
  blockEdit = -1;
  render();
  toast("Block saved.");
}
function uworld() {
  const logs = demo.logs.filter((x) => +x.questions > 0),
    q = logs.reduce((n, x) => n + +x.questions, 0),
    c = logs.reduce((n, x) => n + (+x.correct || 0), 0),
    rev = logs.reduce((n, x) => n + (+x.reviewed || 0), 0);
  return (
    head(
      "Learn from every question.",
      "Choose a system, record a block, and turn missed concepts into targeted review.",
    ) +
    stats([
      ["QUESTIONS", q, "All logged attempts"],
      ["ACCURACY", questionAccuracy(logs), "Weighted across attempts"],
      ["REVIEWED", rev, "Explanations reviewed"],
      ["AWAITING REVIEW", q - rev, "Attempts minus reviewed"],
    ]) +
    blockForm() +
    card(
      "Block history",
      table(
        [
          "Date",
          "Selection / system",
          "Mode",
          "Attempted",
          "Accuracy",
          "Reviewed",
          "",
        ],
        logs.map(
          (x) =>
            `<tr><td>${dateFmt(x.date)}</td><td>${E(x.system || x.selection || "Daily mission")}</td><td>${E(x.mode || "—")}</td><td>${E(x.questions)}</td><td>${questionAccuracy([x])}</td><td>${E(x.reviewed || 0)}</td><td>${btn("Edit", `blockEdit=${demo.logs.indexOf(x)};render();window.scrollTo(0,0)`, "small")}</td></tr>`,
        ),
      ),
    ) +
    `<p class="screen-note">Manual log · Repeat attempts count toward volume, not unique first-pass completion. No UWorld account connection.</p>`
  );
}
function anki() {
  const imported = D.anki.find((r) => dt(r) === state.date) || {},
    r = dailyLog(),
    v = (key, source) => r[key] ?? imported[source] ?? "";
  return (
    head(
      "Keep what you learn.",
      "Enter and edit your reviews here. The same daily record appears in Today’s Mission.",
      dateControl(),
    ) +
    `<form class="card" onsubmit="saveAnki(event)"><div class="form-grid">${field("deck", "Deck", "text", r.deck || set()["Active Anki Deck"] || imported["Active Deck"] || "")}${field("due", "Reviews due", "number", v("due", "Reviews Due"))}${field("anki", "Reviews completed", "number", v("anki", "Reviews Completed"))}${field("newcards", "New cards", "number", v("newcards", "New Cards"))}${field("budget", "New-card ceiling", "number", r.budget ?? day()?.["New Card Budget"] ?? set()["New Card Budget"] ?? 20)}${field("ankiMinutes", "Minutes studied", "number", r.ankiMinutes || "")}${field("ankiNotes", "Anki notes", "textarea", r.ankiNotes || "")}</div><div class="modal-actions"><button class="primary">Save Anki record</button></div></form>` +
    card(
      "Review journal",
      table(
        ["Date", "Deck", "Due", "Completed", "New", ""],
        [
          ...new Set([
            ...D.anki.map(dt),
            ...demo.logs
              .filter((x) => !x._block && x.anki !== undefined)
              .map((x) => x.date),
          ]),
        ]
          .sort()
          .map((date) => {
            const a = D.anki.find((x) => dt(x) === date) || {},
              l = demo.logs.find((x) => !x._block && x.date === date) || {};
            return `<tr><td>${dateFmt(date)}</td><td>${E(l.deck || set()["Active Anki Deck"] || a["Active Deck"] || "—")}</td><td>${E(l.due ?? a["Reviews Due"] ?? "—")}</td><td>${E(l.anki ?? a["Reviews Completed"] ?? "—")}</td><td>${E(l.newcards ?? a["New Cards"] ?? "—")}</td><td>${btn("Edit", `state.date='${date}';persist();render();window.scrollTo(0,0)`, "small")}</td></tr>`;
          }),
      ),
    ) +
    `<p class="screen-note">Manual counts from Anki. Reviews completed can exceed the initial due count. New cards are a ceiling, not a quota.</p>`
  );
}
function saveAnki(e) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  if (
    ["due", "anki", "newcards", "budget", "ankiMinutes"].some(
      (k) => f[k] !== "" && (!Number.isInteger(+f[k]) || +f[k] < 0),
    )
  ) {
    toast("Enter non-negative whole counts.");
    return;
  }
  let r = demo.logs.find((x) => x.date === state.date && !x._block);
  if (!r) {
    r = { date: state.date };
    demo.logs.push(r);
  }
  Object.assign(r, f);
  persist();
  render();
  toast("Anki record saved.");
}

function repairWeakness(i) {
  newRecord("catchup");
  $("#f-Item").value = "Review: " + demo.weakness[i]["Weak Topic"];
  $("#f-Notes").value = demo.weakness[i]["Correct Concept"] || "";
}

// Preserve existing deep links while keeping one resource workspace in navigation.
names.curriculum = "Resource map";

const planFields = [
  ["date:Date:start", "Date", "date"],
  ["Primary System/Subject", "System"],
  ["Main Task", "Plan & targets", "textarea"],
  ["Secondary Task", "Secondary task", "textarea"],
  ["First Aid Target", "First Aid target", "textarea"],
  ["B&B Target", "B&B target", "textarea"],
  ["Anki Target", "Anki target", "textarea"],
  ["Planned Hours", "Hours", "number"],
  ["UWorld Target", "UWorld questions", "number"],
  ["New Card Budget", "New-card ceiling", "number"],
  [
    "Status",
    "Status",
    "select",
    ["Not Started", "In Progress", "Done", "Deferred", "REST DAY"],
  ],
  ["Day Type", "Day type"],
  ["Notes", "Notes", "textarea"],
];
demo.addedDays ||= [];
for (const r of demo.addedDays)
  if (!D.daily.some((x) => x.url === r.url)) {
    D.daily.push({ ...r, ...demo.edits[r.url] });
    originalDaily.push({ ...r });
  }
applyPause();
function planActions() {
  return `<section class="plan-actions"><div><span class="eyebrow">SHAPE YOUR NEXT STEP</span><h2>A little structure. More room to study.</h2><p>Add a lesson, adjust a day, or bring in your schedule.</p></div><div class="flex">${btn("＋ Add a lesson", "lessonEditor('add')", "primary")}${btn("Make an edit", "lessonEditor('edit')")}${btn("↑ Import schedule", "importDialog()", "ghost")}</div><div class="break-caption">Ⅱ ${E(demo.pause.label)} · ${dateFmt(demo.pause.start)} — ${dateFmt(demo.pause.end)} ${btn("Edit break", "pauseDialog()", "small ghost")}</div></section>`;
}
function pauseDialog() {
  modal(
    "Protect a study break",
    `<form onsubmit="savePause(event);closeModal()"><div class="form-grid">${field("label", "Break name", "text", demo.pause.label)}${field("start", "Start", "date", demo.pause.start)}${field("end", "End", "date", demo.pause.end)}</div><div class="modal-actions"><button class="primary">Save break</button></div></form>`,
  );
}
function lessonEditor(mode = "edit", date = state.date) {
  const current = D.daily.find((x) => dt(x) === date) || {};
  const r = isPause(date)
    ? {
        ...(originalDaily.find((x) => x.url === current.url) || current),
        ...demo.edits[current.url],
      }
    : current;
  modal(
    mode === "add" ? "Add a lesson" : "Make an edit",
    `<div class="field"><label>Choose the day</label><input type="date" aria-label="Choose lesson date" value="${E(date)}" onchange="lessonEditor('${mode}',this.value)"></div><p class="screen-note">${r.url ? "This date already has a plan. Saving updates this day." : "A new daily plan will be created."} ${isPause(date) ? "This date is inside your protected break. Move the break to activate study targets." : ""}</p><form onsubmit="saveLesson(event)"><div class="form-grid">${planFields.map(([k, l, t, o]) => field(k, l, t || "text", k === "date:Date:start" ? date : (r[k] ?? ""), o)).join("")}</div><div class="modal-actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Save lesson</button></div></form>`,
    "DAILY PLAN · SELECT A DATE",
  );
}
function validPlan(f) {
  if (!validDate(f["date:Date:start"])) return "Choose a valid date.";
  for (const k of ["Planned Hours", "UWorld Target", "New Card Budget"])
    if (
      f[k] !== undefined &&
      f[k] !== "" &&
      (!Number.isFinite(+f[k]) ||
        +f[k] < 0 ||
        (k === "Planned Hours" ? +f[k] > 24 : !Number.isInteger(+f[k])))
    )
      return "Use 0–24 hours and non-negative whole question/card counts.";
  return "";
}
function upsertPlan(f) {
  let r = D.daily.find((x) => dt(x) === f["date:Date:start"]);
  const patch = { ...f };
  for (const k of ["Planned Hours", "UWorld Target", "New Card Budget"])
    if (k in patch) patch[k] = Number(patch[k] || 0);
  if (!r) {
    r = {
      url: "local-day-" + f["date:Date:start"],
      Status: "Not Started",
      "Planned Hours": 0,
      "UWorld Target": 0,
      ...patch,
    };
    D.daily.push(r);
    originalDaily.push({ ...r });
    demo.addedDays.push({ ...r });
  } else Object.assign(r, patch);
  demo.edits[r.url] = { ...demo.edits[r.url], ...patch };
  return r;
}
function saveLesson(e) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target)),
    err = validPlan(f);
  if (err) {
    toast(err);
    return;
  }
  upsertPlan(f);
  applyPause();
  persist();
  closeModal();
  render();
  toast("Daily plan and calendar updated.");
}
function planner() {
  const entries = sorted(D.daily)
    .filter(
      (r) =>
        !isPause(dt(r)) &&
        JSON.stringify(r).toLowerCase().includes(state.query.toLowerCase()),
    )
    .map((r) => ({
      date: dt(r),
      html: `<tr><td>${dateFmt(dt(r))}</td><td>${E(r["Primary System/Subject"])}</td><td class="cell-main"><strong>${E(r["Main Task"])}</strong><small>${E(r["First Aid Target"] || r["Secondary Task"] || "")}</small></td><td>${E(r["Planned Hours"])} h</td><td>${E(r["UWorld Target"])} Q</td><td>${badge(demo.logs.find((x) => !x._block && x.date === dt(r))?.outcome || r.Status, "dim")}</td><td>${btn("Edit", `lessonEditor('edit','${dt(r)}')`, "small ghost")}</td></tr>`,
    }));
  entries.push({
    date: demo.pause.start,
    html: `<tr class="pause-band"><td colspan="7"><strong>Ⅱ ${E(demo.pause.label)}</strong> · ${dateFmt(demo.pause.start)} — ${dateFmt(demo.pause.end)}<small>Protected break · No study debt</small></td></tr>`,
  });
  return (
    head(
      "Your daily plan",
      "A clear view of what’s next. Edit any day when life changes.",
    ) +
    planActions() +
    `<div class="toolbar section-gap"><input class="search" aria-label="Search plan" placeholder="Search your plan…" value="${E(state.query)}" oninput="filterQuery(this.value)">${link("calendar", "Calendar view")}</div>` +
    table(
      ["Date", "System", "Plan & targets", "Hours", "UWorld", "Status", ""],
      entries.sort((a, b) => a.date.localeCompare(b.date)).map((x) => x.html),
    )
  );
}
function calendar() {
  const first = new Date(state.year, state.month, 1),
    offset = (first.getDay() + 6) % 7,
    total = new Date(state.year, state.month + 1, 0).getDate();
  let cells = Array(offset).fill('<div class="cal-cell out"></div>');
  for (let n = 1; n <= total; n++) {
    const d = `${state.year}-${String(state.month + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`,
      r = D.daily.find((x) => dt(x) === d);
    cells.push(
      `<button class="cal-cell calendar-day ${isPause(d) ? "paused" : ""} ${d === TODAY ? "today" : ""}" data-date="${d}" onclick="calendarDay('${d}')" aria-label="${dateFmt(d)} — view or edit"><b>${n}</b>${isPause(d) ? `<div class="cal-event rest">Ⅱ ${E(demo.pause.label)}</div>` : r ? `<div class="cal-event ${r["Planned Hours"] === 0 ? "rest" : ""}"><strong>${E(r["Primary System/Subject"])}</strong><span>${E(r["Main Task"])}</span><small>${E(r["Planned Hours"])} h · ${E(r["UWorld Target"])} Q</small></div>` : '<span class="cal-add">＋ Add lesson</span>'}${scheduledFor(
        d,
      )
        .map((x) => `<div class="cal-event assess">↻ ${E(x.Item)}</div>`)
        .join("")}</button>`,
    );
  }
  return (
    head(
      "Room for study. Room for life.",
      "Choose any date to view, add, or edit its plan.",
    ) +
    planActions() +
    `<div class="toolbar section-gap"><h2>${first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2><div class="flex">${btn("←", "changeMonth(-1)")}<input type="month" aria-label="Choose month" value="${state.year}-${String(state.month + 1).padStart(2, "0")}" onchange="if(this.value){[state.year,state.month]=this.value.split('-').map(Number);state.month--;persist();render()}">${btn("→", "changeMonth(1)")}</div></div><div class="cal-scroll"><div class="calendar-grid">${["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((x) => `<div class="cal-head">${x}</div>`).join("")}${cells.join("")}</div></div>`
  );
}
function calendarDay(date) {
  const r = D.daily.find((x) => dt(x) === date);
  modal(
    dateFmt(date),
    r
      ? `<div class="pill-row">${badge(r["Primary System/Subject"], "gold")}${badge(r.Status, "dim")}</div><h3>${E(r["Main Task"])}</h3><p>${E(r["First Aid Target"] || "")}</p><p>${E(r["Planned Hours"])} hours · ${E(r["UWorld Target"])} UWorld questions</p><div class="modal-actions">${btn("Open mission", `closeModal();openDay('${date}')`)}${btn("Edit lesson", `lessonEditor('edit','${date}')`, "primary")}</div>`
      : `<p>No lesson planned yet.</p>${btn("＋ Add a lesson", `lessonEditor('add','${date}')`, "primary")}`,
  );
}
function resourceRows() {
  const order = demo.resourceOrder || "study";
  return D.curriculum
    .filter(
      (r) =>
        (state.system === "All systems" || r.System === state.system) &&
        JSON.stringify(r).toLowerCase().includes(state.query.toLowerCase()),
    )
    .sort((a, b) =>
      order === "study"
        ? dt(a).localeCompare(dt(b)) || a.Topic.localeCompare(b.Topic)
        : faChapters.indexOf(faChapter(a)) - faChapters.indexOf(faChapter(b)) ||
          (Number(a["FA order"]) || 0) - (Number(b["FA order"]) || 0) ||
          dt(a).localeCompare(dt(b)),
    );
}
function curriculum() {
  return (
    head(
      "Your resource map",
      "Your learning, in one clear view. Topic progress stays connected to Today’s Mission.",
    ) +
    `<div class="toolbar"><div class="tabs">${btn("My study schedule", "demo.resourceOrder='study';persist();render()", demo.resourceOrder !== "fa" ? "active" : "")}${btn("First Aid sequence", "demo.resourceOrder='fa';persist();render()", demo.resourceOrder === "fa" ? "active" : "")}</div><input class="search" aria-label="Search resources" placeholder="Find a concept…" value="${E(state.query)}" oninput="filterQuery(this.value)"><select aria-label="Filter system" onchange="state.system=this.value;render()">${["All systems", ...systemsList()].map((x) => `<option ${state.system === x ? "selected" : ""}>${E(x)}</option>`).join("")}</select></div>` +
    table(
      ["Concept", "First Aid", "B&B", "Anki", "UWorld", "Progress", ""],
      resourceRows().map(
        (r) =>
          `<tr><td class="cell-main"><strong>${E(r.Topic)}</strong><small>${E(r.System)} · ${dateFmt(dt(r))}</small></td><td>${E(r["FA Reference"])}<small>${E(r["FA Status"])}</small></td><td>${badge(r["B&B Status"], "dim")}</td><td>${badge(r["Anki Status"], "dim")}</td><td>${badge(r["UWorld Status"], "dim")}</td><td>${badge(topicStatus(r), "gold")}</td><td>${btn("View / edit", `resourceEditor(${D.curriculum.indexOf(r)})`, "small ghost")}</td></tr>`,
      ),
    )
  );
}
const resourceKeys = [
  "Topic",
  "System",
  "Discipline",
  "Priority",
  "FA Reference",
  "FA Status",
  "B&B topic reference",
  "B&B Status",
  "Anki Status",
  "UWorld Status",
  "Overall Status",
  "date:Start Date:start",
  "date:End Date:start",
  "FA chapter",
  "FA order",
  "Annotated?",
  "FA reviewed?",
  "Final review completed?",
  "Needs revisit?",
  "Notes",
  "_body",
];
function resourceEditor(i) {
  const r = D.curriculum[i];
  modal(
    r.Topic,
    `<form onsubmit="saveResource(event,${i})"><div class="form-grid">${resourceKeys.map((k) => field(k, k === "_body" ? "Learning brief" : k, k.includes("Status") || k === "Priority" || k === "FA chapter" ? "select" : k.includes("Date") ? "date" : k === "FA order" ? "number" : ["Notes", "_body", "B&B topic reference"].includes(k) ? "textarea" : "text", k === "Overall Status" ? topicStatus(r) : k === "FA chapter" ? faChapter(r) : r[k] || "", k === "FA chapter" ? faChapters : k === "Priority" ? ["High", "Medium", "Low"] : statuses)).join("")}</div><div class="modal-actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Save resource</button></div></form>`,
  );
}
function saveResource(e, i) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  if (!f.Topic.trim()) {
    toast("Enter a topic name.");
    return;
  }
  if (
    f["date:Start Date:start"] &&
    f["date:End Date:start"] &&
    f["date:Start Date:start"] > f["date:End Date:start"]
  ) {
    toast("End date must follow start date.");
    return;
  }
  const r = D.curriculum[i];
  Object.assign(r, f);
  demo.edits[r.url] = { ...demo.edits[r.url], ...f };
  demo.topic[r.url] = f["Overall Status"];
  persist();
  closeModal();
  render();
  toast("Resource updated.");
}

function weaknessChooser() {
  modal(
    "Capture a weakness",
    `<div class="choice-grid">${btn("＋ New weakness", "weaknessEditor(-1)", "primary")}${btn("Edit existing weakness", "weaknessPicker()")}</div><p>Keep one record per concept and build on what you already know.</p>`,
  );
}
function weaknessPicker() {
  modal(
    "Choose a weakness",
    demo.weakness.length
      ? `<div class="pick-list">${demo.weakness.map((x, i) => `<button onclick="weaknessEditor(${i})"><strong>${E(x["Weak Topic"])}</strong><small>${E(x.System)} · ${E(x.Status)}</small></button>`).join("")}</div>`
      : empty(
          "No weaknesses yet",
          "Capture your first concept.",
          btn("New weakness", "weaknessEditor(-1)", "primary"),
        ),
  );
}
function weaknessEditor(i) {
  const x = demo.weakness[i] || {};
  modal(
    i < 0 ? "New weakness" : "Edit weakness",
    `<form onsubmit="saveWeakness(event,${i})"><div class="form-grid">${field("Weak Topic", "Concept", "text", x["Weak Topic"])}${field("System", "System", "select", x.System || "Cardio", systemsList())}${field("Severity", "Priority", "select", x.Severity || "Medium", ["High", "Medium", "Low"])}${field("Status", "Status", "select", x.Status || "Open", ["Open", "In Progress", "Resolved"])}${field("Source", "Source", "text", x.Source || "Daily mission")}${field("Review Date", "Review date", "date", x["Review Date"])}${field("Correct Concept", "Correct concept in your own words", "textarea", x["Correct Concept"])}</div><div class="modal-actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Save weakness</button></div></form>`,
  );
}
function saveWeakness(e, i) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  if (!f["Weak Topic"].trim()) {
    toast("Enter a concept.");
    return;
  }
  if (
    demo.weakness.some(
      (x, j) =>
        j !== i &&
        x["Weak Topic"].trim().toLowerCase() ===
          f["Weak Topic"].trim().toLowerCase(),
    )
  ) {
    toast("This concept exists. Choose Edit existing weakness.");
    return;
  }
  if (i < 0) demo.weakness.push({ ...f, "Date Identified": TODAY });
  else Object.assign(demo.weakness[i], f);
  persist();
  closeModal();
  render();
}
function catchup() {
  return (
    head(
      "Give unfinished work a place.",
      "One priority at a time. Choose a date and make room for what matters.",
      btn("＋ Add catch-up item", "catchupEditor(-1)", "primary"),
    ) +
    card(
      "Catch-up schedule",
      demo.catchup.length
        ? table(
            ["Priority work", "Scheduled for", "Hours", "Status", ""],
            demo.catchup.map(
              (x, i) =>
                `<tr><td class="cell-main"><strong>${E(x.Item)}</strong><small>${E(x.Notes || x.Category || "Included in the designated daily mission")}</small></td><td>${dateFmt(x["Rescheduled For"])}${x["Rescheduled For"] < TODAY && !["Done", "Dropped"].includes(x.Status) ? '<small class="gold">Ready to reschedule</small>' : ""}</td><td>${E(x["Estimated Hours"] || "—")}</td><td>${badge(x.Status || "Queued", "dim")}</td><td><div class="flex">${btn("Edit", `catchupEditor(${i})`, "small ghost")}${x["Rescheduled For"] ? btn("Open day", `openDay('${x["Rescheduled For"]}')`, "small ghost") : ""}</div></td></tr>`,
            ),
          )
        : empty(
            "Ready when you need it",
            "Only carry forward what still matters.",
            btn("Schedule an item", "catchupEditor(-1)", "primary"),
          ),
    ) +
    `<div class="mini-note section-gap">Moving an item keeps the same record. Completed and dropped items stay in history, without adding to your daily workload.</div>`
  );
}
function catchupEditor(i) {
  const x = demo.catchup[i] || {};
  modal(
    i < 0 ? "Make room for a priority" : "Edit catch-up item",
    `<form onsubmit="saveCatchup(event,${i})"><div class="form-grid">${field("Item", "Priority unfinished work", "text", x.Item)}${field("Rescheduled For", "Designated date", "date", x["Rescheduled For"] || state.date)}${field("Estimated Hours", "Estimated hours", "number", x["Estimated Hours"])}${field("Status", "Status", "select", x.Status || "Scheduled", ["Queued", "Scheduled", "In Progress", "Done", "Dropped"])}${field("Priority", "Priority", "select", x.Priority || "Normal", ["High", "Normal", "Low"])}${field("Category", "Category", "select", x.Category || "Current content", ["Current content", "UWorld", "Anki reviews", "B&B", "Optional"])}${field("Notes", "Notes", "textarea", x.Notes)}</div><div class="modal-actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Save item</button></div></form>`,
  );
}
function saveCatchup(e, i) {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  if (
    !f.Item.trim() ||
    !validDate(f["Rescheduled For"]) ||
    +f["Estimated Hours"] < 0 ||
    +f["Estimated Hours"] > 24
  ) {
    toast("Add a title, valid date, and an estimate from 0–24 hours.");
    return;
  }
  if (i < 0) demo.catchup.push(f);
  else Object.assign(demo.catchup[i], f);
  persist();
  closeModal();
  render();
}

state.page =
  location.hash === "#entry"
    ? "today"
    : names[location.hash.slice(1)]
      ? location.hash.slice(1)
      : "home";
