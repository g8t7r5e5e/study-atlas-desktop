"use strict";
const externalHosts = new Set([
  "www.usmle.org",
  "www.nbme.org",
  "www.uworld.com",
  "apps.ankiweb.net",
  "www.boardsbeyond.com",
]);
function approvedURL(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === "443") &&
      externalHosts.has(u.hostname)
      ? u.href
      : null;
  } catch {
    return null;
  }
}
function validAppURL(value) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "atlas:" &&
      u.hostname === "app" &&
      u.pathname === "/index.html" &&
      !u.username &&
      !u.password &&
      !u.port
    );
  } catch {
    return false;
  }
}
function trustedFrame(event) {
  return (
    event.senderFrame &&
    event.senderFrame === event.sender.mainFrame &&
    validAppURL(event.senderFrame.url)
  );
}
function windowBounds(saved, displays) {
  const primary = displays[0]?.workArea;
  const fallback = { width: Math.min(1440, primary?.width || 1440), height: Math.min(900, primary?.height || 900) };
  if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y))
    return fallback;
  const d = displays.find(
    ({ workArea: a }) =>
      saved.x < a.x + a.width - 80 &&
      saved.x + saved.width > a.x + 80 &&
      saved.y < a.y + a.height - 80 &&
      saved.y + saved.height > a.y + 80,
  );
  if (!d) return fallback;
  const a = d.workArea;
  const width = Math.min(Math.max(saved.width || 1440, 800), a.width),
    height = Math.min(Math.max(saved.height || 900, 600), a.height);
  return {
    width,
    height,
    x: Math.max(a.x, Math.min(saved.x, a.x + a.width - width)),
    y: Math.max(a.y, Math.min(saved.y, a.y + a.height - height)),
  };
}
module.exports = { approvedURL, trustedFrame, windowBounds };
