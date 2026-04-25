import fs from "node:fs";
import path from "node:path";
import {
  fillMissing,
  localeDir,
  primaryLanguage,
  readJson,
  targetLanguage,
  writeJson,
} from "./i18n-utils.mjs";

const primaryDir = path.join(localeDir, primaryLanguage);
let total = 0;

for (const fileName of fs.readdirSync(primaryDir)) {
  if (!fileName.endsWith(".json")) {
    continue;
  }

  const primaryPath = path.join(primaryDir, fileName);
  const targetPath = path.join(localeDir, targetLanguage, fileName);
  const result = fillMissing(readJson(primaryPath), readJson(targetPath));

  total += result.count;
  writeJson(targetPath, result.value);
}

console.log(
  total === 0
    ? "i18n:fill found no missing translation values."
    : `i18n:fill filled ${total} missing value(s) from ${primaryLanguage}. Please review ${targetLanguage}.`,
);
