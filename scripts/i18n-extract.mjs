import path from "node:path";
import fs from "node:fs";
import {
  localeDir,
  primaryLanguage,
  readJson,
  setNestedValue,
  sourceDir,
  walkFiles,
  writeJson,
} from "./i18n-utils.mjs";

const namespacePattern = /useTranslation\(\s*["'`]([\w-]+)["'`]\s*\)/g;
const translationPattern =
  /\bt\(\s*["'`]([^"'`$]+)["'`]\s*,\s*\{[\s\S]*?defaultValue:\s*["'`]([^"'`]+)["'`][\s\S]*?\}\s*\)/g;

const extracted = new Map();

for (const filePath of walkFiles(sourceDir)) {
  const source = fs.readFileSync(filePath, "utf8");
  const namespaces = [...source.matchAll(namespacePattern)].map((match) => match[1]);
  const namespace = namespaces[0] ?? "common";

  for (const match of source.matchAll(translationPattern)) {
    const [, key, defaultValue] = match;
    const values = extracted.get(namespace) ?? {};
    setNestedValue(values, key, defaultValue);
    extracted.set(namespace, values);
  }
}

let count = 0;

for (const [namespace, values] of extracted.entries()) {
  const filePath = path.join(localeDir, primaryLanguage, `${namespace}.json`);
  const existing = readJson(filePath);
  const merged = structuredClone(existing);

  function merge(source, target) {
    Object.entries(source).forEach(([key, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        target[key] = merge(value, target[key] ?? {});
        return;
      }

      if (!target[key]) {
        target[key] = value;
        count += 1;
      }
    });

    return target;
  }

  writeJson(filePath, merge(values, merged));
}

console.log(`i18n:extract added ${count} primary translation key(s).`);
