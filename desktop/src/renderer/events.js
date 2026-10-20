"use strict";
const actionRegistry = new Map();
let actionSequence = 0;
function registerAction(fn) {
  if (typeof fn !== "function")
    throw Error("An action must be a compiled function.");
  const id = "a" + ++actionSequence;
  actionRegistry.set(id, fn);
  return id;
}
function collectActions() {
  const live = new Set(
    [
      ...document.querySelectorAll(
        "[data-onclick],[data-onsubmit],[data-oninput],[data-onchange]",
      ),
    ].flatMap((el) =>
      ["click", "submit", "input", "change"].map((k) =>
        el.getAttribute("data-on" + k),
      ),
    ),
  );
  for (const id of actionRegistry.keys())
    if (!live.has(id)) actionRegistry.delete(id);
}
for (const kind of ["click", "submit", "input", "change"])
  document.addEventListener(kind, async (event) => {
    const el = event.target.closest("[data-on" + kind + "]");
    if (!el) return;
    const fn = actionRegistry.get(el.getAttribute("data-on" + kind));
    if (!fn) return;
    if (kind === "submit") event.preventDefault();
    try {
      await fn.call(el, event);
    } catch (error) {
      showDesktopError(error);
    } finally {
      queueMicrotask(collectActions);
    }
  });
function showDesktopError(error) {
  const status = document.getElementById("save-status");
  if (status) {
    status.textContent = "Not saved: " + error.message;
    status.dataset.error = "true";
  }
  if (typeof toast === "function") toast(error.message);
  else document.getElementById("main").textContent = error.message;
}
window.addEventListener("error", (e) =>
  showDesktopError(e.error || Error(e.message)),
);
window.addEventListener("unhandledrejection", (e) => {
  e.preventDefault();
  showDesktopError(
    e.reason instanceof Error ? e.reason : Error(String(e.reason)),
  );
});

new MutationObserver(() => queueMicrotask(collectActions)).observe(
  document.body,
  { childList: true, subtree: true },
);
