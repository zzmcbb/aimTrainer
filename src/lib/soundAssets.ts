import Dexie, { type Table } from "dexie";

export interface SoundClipRef {
  id: string;
  assetId: string;
  endMs?: number;
  note?: string;
  startMs?: number;
}

export type HitFeedbackSource = "default" | "custom";
export type MissFeedbackMode = "none" | "default" | "custom";
export type ComboMusicMode = "fullTrack" | "manualClips";
export type ComboBreakBehavior = "restart" | "pause" | "stop";
export type ComboResumeBehavior = "fromStart" | "fromPausedPosition";
export type ComboOverflowBehavior = "holdLast" | "loop" | "continueFullTrack" | "silent";

export interface HitFeedbackSettings {
  customClip: SoundClipRef | null;
  enabled: boolean;
  playWithComboMusic: boolean;
  source: HitFeedbackSource;
}

export interface ComboMusicClip {
  endMs: number;
  id: string;
  index: number;
  note: string;
  startMs: number;
}

export interface ComboMusicSettings {
  breakBehavior: ComboBreakBehavior;
  clips: ComboMusicClip[];
  enabled: boolean;
  mode: ComboMusicMode;
  overflowBehavior: ComboOverflowBehavior;
  resumeBehavior: ComboResumeBehavior;
  sourceAssetId: string | null;
  volume: number;
}

export interface MissFeedbackSettings {
  customClip: SoundClipRef | null;
  mode: MissFeedbackMode;
  volume: number;
}

export interface CustomSoundSettings {
  comboMusic: ComboMusicSettings;
  hitFeedback: HitFeedbackSettings;
  missFeedback: MissFeedbackSettings;
}

export interface SoundAsset {
  blob: Blob;
  createdAt: number;
  durationMs: number;
  id: string;
  mimeType: "audio/mpeg" | "audio/wav";
  name: string;
  size: number;
  waveformPeaks: number[];
}

export interface UploadSoundAssetOptions {
  file: File;
  onProgress?: (progress: number) => void;
}

class AimTrainerSoundDb extends Dexie {
  soundAssets!: Table<SoundAsset, string>;

  constructor() {
    super("aim-trainer-sounds");

    this.version(1).stores({
      soundAssets: "id, createdAt, name",
    });
  }
}

const db = new AimTrainerSoundDb();
const validExtensions = /\.(mp3|wav)$/i;
const validMimeTypes = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave"]);

export function createDefaultCustomSoundSettings(): CustomSoundSettings {
  return {
    comboMusic: {
      breakBehavior: "restart",
      clips: [],
      enabled: false,
      mode: "manualClips",
      overflowBehavior: "holdLast",
      resumeBehavior: "fromStart",
      sourceAssetId: null,
      volume: 0.72,
    },
    hitFeedback: {
      customClip: null,
      enabled: false,
      playWithComboMusic: false,
      source: "default",
    },
    missFeedback: {
      customClip: null,
      mode: "default",
      volume: 0.72,
    },
  };
}

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export function isSupportedSoundFile(file: File) {
  return validExtensions.test(file.name) && validMimeTypes.has(file.type);
}

export function getSoundFileError(file: File) {
  if (!validExtensions.test(file.name)) {
    return "只支持 .mp3 和 .wav 音频文件。";
  }

  if (!validMimeTypes.has(file.type)) {
    return "文件类型不正确，请选择 mp3 或 wav 音频。";
  }

  return "";
}

export async function getSoundAsset(id: string) {
  return db.soundAssets.get(id);
}

export async function getSoundAssets(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return [];
  }

  return db.soundAssets.bulkGet(uniqueIds).then((assets) => assets.filter(Boolean) as SoundAsset[]);
}

export async function saveSoundAsset(asset: SoundAsset) {
  await db.soundAssets.put(asset);
}

export async function deleteSoundAsset(id: string) {
  await db.soundAssets.delete(id);
}

export async function uploadSoundAsset({ file, onProgress }: UploadSoundAssetOptions): Promise<SoundAsset> {
  const error = getSoundFileError(file);
  if (error) {
    throw new Error(error);
  }

  const chunkSize = 256 * 1024;
  let loaded = 0;

  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const chunk = file.slice(offset, Math.min(file.size, offset + chunkSize));
    await chunk.arrayBuffer();
    loaded += chunk.size;
    onProgress?.(Math.min(80, Math.round((loaded / file.size) * 80)));
  }

  const arrayBuffer = await file.arrayBuffer();
  const { durationMs, waveformPeaks } = await analyzeAudio(arrayBuffer.slice(0));
  const mimeType = file.type.includes("wav") ? "audio/wav" : "audio/mpeg";
  const asset: SoundAsset = {
    blob: file,
    createdAt: Date.now(),
    durationMs,
    id: createId("asset"),
    mimeType,
    name: file.name,
    size: file.size,
    waveformPeaks,
  };

  onProgress?.(92);
  await saveSoundAsset(asset);
  onProgress?.(100);

  return asset;
}

async function analyzeAudio(arrayBuffer: ArrayBuffer) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextClass();

  try {
    const audioBuffer = await context.decodeAudioData(arrayBuffer);
    const channel = audioBuffer.getChannelData(0);
    const bucketCount = 160;
    const bucketSize = Math.max(1, Math.floor(channel.length / bucketCount));
    const waveformPeaks = Array.from({ length: bucketCount }, (_, bucketIndex) => {
      let peak = 0;
      const start = bucketIndex * bucketSize;
      const end = Math.min(channel.length, start + bucketSize);

      for (let index = start; index < end; index += 1) {
        peak = Math.max(peak, Math.abs(channel[index] ?? 0));
      }

      return Number(Math.min(1, peak).toFixed(3));
    });

    return {
      durationMs: Math.round(audioBuffer.duration * 1000),
      waveformPeaks,
    };
  } finally {
    await context.close();
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
