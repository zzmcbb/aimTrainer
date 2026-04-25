import fs from "node:fs";
import path from "node:path";
import {
  localeDir,
  primaryLanguage,
  readJson,
  syncShape,
  targetLanguage,
  writeJson,
} from "./i18n-utils.mjs";

const primaryDir = path.join(localeDir, primaryLanguage);
let count = 0;

for (const fileName of fs.readdirSync(primaryDir)) {
  if (!fileName.endsWith(".json")) {
    continue;
  }

  const primaryPath = path.join(primaryDir, fileName);
  const targetPath = path.join(localeDir, targetLanguage, fileName);
  const before = JSON.stringify(readJson(targetPath));
  const synced = syncShape(readJson(primaryPath), readJson(targetPath));
  const after = JSON.stringify(synced);

  if (before !== after) {
    count += 1;
  }

  writeJson(targetPath, synced);
}

console.log(`i18n:sync updated ${count} locale file(s).`);
