"use strict";
(async () => {
  try {
    window.atlasInitial = window.atlas.load();
    window.D = structuredClone(window.atlasInitial.seed);
    for (const name of ["import.js", "app.js", "dashboard.js", "desktop.js"])
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = name;
        s.onload = resolve;
        s.onerror = () => reject(Error("Could not load " + name));
        document.body.append(s);
      });
    document.body.dataset.ready = "true";
  } catch (e) {
    showDesktopError(e);
  }
})();
