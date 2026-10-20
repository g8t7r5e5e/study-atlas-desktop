"use strict";
const path = require("node:path");

// ASAR's directory traversal splits on the host separator. Keep native paths
// for archive lookups and portable paths only for the privacy rules.
function auditArchive(file, inspect, asar = require("@electron/asar"), paths = path) {
  for (const name of asar.listPackage(file)) {
    const portable = name.replace(/\\/g, "/").replace(/^\/+/, "");
    const native = paths.normalize(portable);
    if (!asar.statFile(file, native).files)
      inspect(portable, asar.extractFile(file, native));
  }
}

module.exports = { auditArchive };
