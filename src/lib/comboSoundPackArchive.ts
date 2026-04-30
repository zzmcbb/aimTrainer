import type { ComboMusicClip, ComboSoundPack, SoundAsset } from "@/lib/soundAssets";

export interface ComboSoundPackArchiveImport {
  audioBlob: Blob;
  audioFileName: string;
  audioMimeType: "audio/mpeg" | "audio/wav";
  clips: Array<Omit<ComboMusicClip, "id">>;
  name: string;
}

export const comboSoundPackArchiveLimits = {
  audioBytes: 50 * 1024 * 1024,
  clips: 256,
  zipBytes: 55 * 1024 * 1024,
};

const archiveSchema = "aim-trainer.combo-pack.v1";
const manifestFileName = "manifest.json";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const audioExtensionsByMimeType: Record<SoundAsset["mimeType"], string> = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

interface ComboSoundPackManifest {
  clips: Array<{
    endMs: number;
    index: number;
    note: string;
    startMs: number;
  }>;
  exportedAt: number;
  name: string;
  schema: typeof archiveSchema;
  sourceFileName: string;
  sourceMimeType: SoundAsset["mimeType"];
}

interface ZipEntry {
  compressedSize: number;
  name: string;
  offset: number;
  size: number;
  method: number;
}

export async function exportComboSoundPackArchive(pack: ComboSoundPack, asset: SoundAsset): Promise<Blob> {
  validatePackForExport(pack, asset);

  const extension = audioExtensionsByMimeType[asset.mimeType];
  const sourceFileName = `source.${extension}`;
  const manifest: ComboSoundPackManifest = {
    clips: pack.clips.map((clip) => ({
      endMs: clip.endMs,
      index: clip.index,
      note: clip.note,
      startMs: clip.startMs,
    })),
    exportedAt: Date.now(),
    name: pack.name,
    schema: archiveSchema,
    sourceFileName,
    sourceMimeType: asset.mimeType,
  };

  return createStoredZip([
    {
      data: textEncoder.encode(JSON.stringify(manifest, null, 2)),
      name: manifestFileName,
    },
    {
      data: new Uint8Array(await asset.blob.arrayBuffer()),
      name: `audio/${sourceFileName}`,
    },
  ]);
}

export async function importComboSoundPackArchive(file: File): Promise<ComboSoundPackArchiveImport> {
  const fileError = getComboSoundPackArchiveFileError(file);
  if (fileError) {
    throw new Error(fileError);
  }

  if (file.size > comboSoundPackArchiveLimits.zipBytes) {
    throw new Error("整合包不能超过 55MB。");
  }

  const entries = readZipEntries(new Uint8Array(await file.arrayBuffer()));
  const safeEntries = entries.filter((entry) => isSafeZipPath(entry.name));
  const manifestEntry = safeEntries.find((entry) => entry.name === manifestFileName);
  if (!manifestEntry) {
    throw new Error("整合包缺少 manifest.json。");
  }

  const manifest = readManifest(textDecoder.decode(await readZipEntryData(file, manifestEntry)));
  const audioEntries = safeEntries.filter((entry) => /\.(mp3|wav)$/i.test(entry.name));
  if (audioEntries.length !== 1) {
    throw new Error("整合包必须且只能包含一个 mp3 或 wav 音频文件。");
  }

  const audioEntry = audioEntries[0];
  const expectedAudioName = normalizeZipPath(`audio/${manifest.sourceFileName}`);
  if (audioEntry.name !== expectedAudioName && getBaseName(audioEntry.name) !== manifest.sourceFileName) {
    throw new Error("manifest.json 中的音频文件名和整合包内容不一致。");
  }

  if (audioEntry.size > comboSoundPackArchiveLimits.audioBytes) {
    throw new Error("音频文件不能超过 50MB。");
  }

  const audioMimeType = readAudioMimeType(manifest.sourceMimeType, manifest.sourceFileName);
  const audioBlob = new Blob([await readZipEntryData(file, audioEntry)], { type: audioMimeType });

  return {
    audioBlob,
    audioFileName: manifest.sourceFileName,
    audioMimeType,
    clips: manifest.clips,
    name: manifest.name,
  };
}

export function getComboSoundPackArchiveFileError(file: Pick<File, "name" | "size">) {
  if (!/\.aimcombo\.zip$/i.test(file.name)) {
    return "请选择由本应用导出的 .aimcombo.zip 连续击中整合包。";
  }

  if (file.size > comboSoundPackArchiveLimits.zipBytes) {
    return "整合包不能超过 55MB。";
  }

  return "";
}

function validatePackForExport(pack: ComboSoundPack, asset: SoundAsset) {
  if (pack.sourceAssetId !== asset.id) {
    throw new Error("整合包和音频文件不匹配。");
  }

  if (asset.size > comboSoundPackArchiveLimits.audioBytes) {
    throw new Error("音频文件不能超过 50MB。");
  }

  validateClips(pack.clips.map(({ endMs, index, note, startMs }) => ({ endMs, index, note, startMs })), asset.durationMs);
}

function readManifest(rawValue: string): ComboSoundPackManifest {
  let value: unknown;
  try {
    value = JSON.parse(rawValue);
  } catch {
    throw new Error("manifest.json 不是有效的 JSON。");
  }

  if (!value || typeof value !== "object") {
    throw new Error("manifest.json 格式不正确。");
  }

  const manifest = value as Partial<ComboSoundPackManifest>;
  if (manifest.schema !== archiveSchema) {
    throw new Error("整合包版本不受支持。");
  }

  const name = typeof manifest.name === "string" && manifest.name.trim() ? manifest.name.trim().slice(0, 80) : "导入整合包";
  if (typeof manifest.sourceFileName !== "string" || !/^[^/\\]+\.(mp3|wav)$/i.test(manifest.sourceFileName)) {
    throw new Error("manifest.json 中的音频文件名无效。");
  }

  const audioMimeType = readAudioMimeType(manifest.sourceMimeType, manifest.sourceFileName);
  const clips = Array.isArray(manifest.clips)
    ? manifest.clips.map((clip, index) => readManifestClip(clip, index + 1))
    : [];
  validateClips(clips);

  return {
    clips,
    exportedAt: typeof manifest.exportedAt === "number" ? manifest.exportedAt : 0,
    name,
    schema: archiveSchema,
    sourceFileName: manifest.sourceFileName,
    sourceMimeType: audioMimeType,
  };
}

function readManifestClip(value: unknown, fallbackIndex: number): ComboSoundPackManifest["clips"][number] {
  if (!value || typeof value !== "object") {
    throw new Error("manifest.json 中存在无效片段。");
  }

  const clip = value as Partial<ComboSoundPackManifest["clips"][number]>;
  const index = typeof clip.index === "number" && Number.isInteger(clip.index) && clip.index > 0 ? clip.index : fallbackIndex;
  const startMs = typeof clip.startMs === "number" && Number.isFinite(clip.startMs) ? Math.round(clip.startMs) : -1;
  const endMs = typeof clip.endMs === "number" && Number.isFinite(clip.endMs) ? Math.round(clip.endMs) : -1;

  return {
    endMs,
    index,
    note: typeof clip.note === "string" ? clip.note.slice(0, 80) : "",
    startMs,
  };
}

function validateClips(clips: Array<Omit<ComboMusicClip, "id">>, durationMs?: number) {
  if (clips.length === 0) {
    throw new Error("整合包至少需要一个连击片段。");
  }

  if (clips.length > comboSoundPackArchiveLimits.clips) {
    throw new Error("整合包最多支持 256 段音效。");
  }

  const sortedClips = [...clips].sort((first, second) => first.index - second.index);
  for (const clip of sortedClips) {
    if (!Number.isInteger(clip.index) || clip.index < 1) {
      throw new Error("片段序号无效。");
    }

    if (!Number.isInteger(clip.startMs) || !Number.isInteger(clip.endMs) || clip.startMs < 0 || clip.endMs <= clip.startMs) {
      throw new Error("片段时间范围无效。");
    }

    if (typeof durationMs === "number" && clip.endMs > durationMs) {
      throw new Error("片段时间超出了音频长度。");
    }
  }
}

function readAudioMimeType(value: unknown, fileName: string): "audio/mpeg" | "audio/wav" {
  const isWav = /\.wav$/i.test(fileName);
  const expectedMimeType = isWav ? "audio/wav" : "audio/mpeg";
  if (value !== expectedMimeType) {
    throw new Error("音频类型和文件扩展名不匹配。");
  }

  return expectedMimeType;
}

function isSafeZipPath(value: string) {
  const normalized = normalizeZipPath(value);
  return Boolean(normalized) && !normalized.startsWith("/") && !normalized.split("/").includes("..");
}

function normalizeZipPath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\/+/g, "/");
}

function getBaseName(value: string) {
  return normalizeZipPath(value).split("/").pop() ?? value;
}

async function readZipEntryData(source: Blob, entry: ZipEntry): Promise<Uint8Array> {
  if (entry.size > comboSoundPackArchiveLimits.zipBytes) {
    throw new Error("整合包内容过大。");
  }

  const localHeader = new Uint8Array(await source.slice(entry.offset, entry.offset + 30).arrayBuffer());
  if (readUint32(localHeader, 0) !== 0x04034b50) {
    throw new Error("整合包结构不正确。");
  }

  const nameLength = readUint16(localHeader, 26);
  const extraLength = readUint16(localHeader, 28);
  const dataOffset = entry.offset + 30 + nameLength + extraLength;

  if (dataOffset + entry.compressedSize > source.size) {
    throw new Error("整合包结构不正确。");
  }

  if (entry.method !== 0) {
    throw new Error("整合包使用了当前版本暂不支持的 ZIP 压缩方式。");
  }

  return new Uint8Array(await source.slice(dataOffset, dataOffset + entry.compressedSize).arrayBuffer());
}

function readZipEntries(bytes: Uint8Array): ZipEntry[] {
  const eocdOffset = findEndOfCentralDirectory(bytes);
  const centralDirectorySize = readUint32(bytes, eocdOffset + 12);
  const centralDirectoryOffset = readUint32(bytes, eocdOffset + 16);
  const entryCount = readUint16(bytes, eocdOffset + 10);

  if (centralDirectoryOffset + centralDirectorySize > bytes.length || entryCount > 64) {
    throw new Error("整合包结构不正确。");
  }

  const entries: ZipEntry[] = [];
  let offset = centralDirectoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32(bytes, offset) !== 0x02014b50) {
      throw new Error("整合包结构不正确。");
    }

    const method = readUint16(bytes, offset + 10);
    const compressedSize = readUint32(bytes, offset + 20);
    const size = readUint32(bytes, offset + 24);
    const nameLength = readUint16(bytes, offset + 28);
    const extraLength = readUint16(bytes, offset + 30);
    const commentLength = readUint16(bytes, offset + 32);
    const localHeaderOffset = readUint32(bytes, offset + 42);
    const name = normalizeZipPath(textDecoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength)));

    entries.push({
      compressedSize,
      method,
      name,
      offset: localHeaderOffset,
      size,
    });

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  if (bytes.length < 22) {
    throw new Error("文件不是有效的 ZIP 整合包。");
  }

  const minOffset = Math.max(0, bytes.length - 0xffff - 22);
  for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
    if (readUint32(bytes, offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("文件不是有效的 ZIP 整合包。");
}

function createStoredZip(entries: Array<{ data: Uint8Array; name: string }>) {
  const chunks: Uint8Array[] = [];
  const centralDirectoryChunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = textEncoder.encode(entry.name);
    const crc = crc32(entry.data);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0x0800);
    writeUint16(localHeader, 8, 0);
    writeDosDateTime(localHeader, 10);
    writeUint32(localHeader, 14, crc);
    writeUint32(localHeader, 18, entry.data.length);
    writeUint32(localHeader, 22, entry.data.length);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);
    chunks.push(localHeader, entry.data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0x0800);
    writeUint16(centralHeader, 10, 0);
    writeDosDateTime(centralHeader, 12);
    writeUint32(centralHeader, 16, crc);
    writeUint32(centralHeader, 20, entry.data.length);
    writeUint32(centralHeader, 24, entry.data.length);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralDirectoryChunks.push(centralHeader);

    offset += localHeader.length + entry.data.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectorySize = centralDirectoryChunks.reduce((total, chunk) => total + chunk.length, 0);
  const eocd = new Uint8Array(22);
  writeUint32(eocd, 0, 0x06054b50);
  writeUint16(eocd, 8, entries.length);
  writeUint16(eocd, 10, entries.length);
  writeUint32(eocd, 12, centralDirectorySize);
  writeUint32(eocd, 16, centralDirectoryOffset);

  return new Blob([...chunks, ...centralDirectoryChunks, eocd], { type: "application/zip" });
}

let crcTable: Uint32Array | null = null;

function crc32(bytes: Uint8Array) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      crcTable[index] = value >>> 0;
    }
  }

  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function readUint16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | ((bytes[offset + 1] ?? 0) << 8);
}

function readUint32(bytes: Uint8Array, offset: number) {
  return (readUint16(bytes, offset) | (readUint16(bytes, offset + 2) << 16)) >>> 0;
}

function writeUint16(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(bytes: Uint8Array, offset: number, value: number) {
  writeUint16(bytes, offset, value & 0xffff);
  writeUint16(bytes, offset + 2, (value >>> 16) & 0xffff);
}

function writeDosDateTime(bytes: Uint8Array, offset: number) {
  const date = new Date();
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = Math.max(1980, date.getFullYear()) - 1980;
  writeUint16(bytes, offset, time);
  writeUint16(bytes, offset + 2, (year << 9) | (month << 5) | day);
}
