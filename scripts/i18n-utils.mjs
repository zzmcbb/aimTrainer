import fs from "node:fs";
import path from "node:path";

export const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
export const sourceDir = path.join(rootDir, "src");
export const localeDir = path.join(sourceDir, "i18n", "locales");
export const primaryLanguage = "zh-CN";
export const targetLanguage = "en-US";

export function walkFiles(dir, extensions = [".ts", ".tsx"]) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return walkFiles(fullPath, extensions);
    }

    return extensions.includes(path.extname(entry.name)) ? [fullPath] : [];
  });
}

export function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(sortObject(value), null, 2)}\n`);
}

export function setNestedValue(target, dottedKey, value) {
  const segments = dottedKey.split(".");
  let current = target;

  segments.slice(0, -1).forEach((segment) => {
    if (!current[segment] || typeof current[segment] !== "object") {
      current[segment] = {};
    }

    current = current[segment];
  });

  const lastSegment = segments.at(-1);
  if (lastSegment && !current[lastSegment]) {
    current[lastSegment] = value;
  }
}

export function syncShape(primary, target) {
  const next = { ...target };

  Object.entries(primary).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      next[key] = syncShape(value, target[key] ?? {});
      return;
    }

    if (!next[key]) {
      next[key] = "";
    }
  });

  return next;
}

export function fillMissing(primary, target) {
  const next = { ...target };
  let count = 0;

  Object.entries(primary).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const result = fillMissing(value, target[key] ?? {});
      next[key] = result.value;
      count += result.count;
      return;
    }

    if (!next[key]) {
      next[key] = value;
      count += 1;
    }
  });

  return { value: next, count };
}

function sortObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = sortObject(value[key]);
      return sorted;
    }, {});
}
