import { create } from "zustand";
import {
  type ComboBreakBehavior,
  type ComboMusicClip,
  type ComboMusicMode,
  type ComboOverflowBehavior,
  type ComboResumeBehavior,
  type ComboSoundPack,
  sortComboSoundPacks,
  createDefaultCustomSoundSettings,
  type CustomSoundSettings,
  type HitFeedbackSource,
  type MissFeedbackMode,
  type SoundClipRef,
} from "@/lib/soundAssets";

export type SupportedLanguage = "zh-CN" | "en-US";
export type LanguagePreference = SupportedLanguage | "system";

export interface CrosshairSettings {
  centerDotEnabled: boolean;
  centerDotSize: number;
  color: string;
  dynamicSpreadEnabled: boolean;
  outerCrosshairEnabled: boolean;
  outerCrosshairOffset: number;
  opacity: number;
  spreadRecoverySeconds: number;
  size: number;
  thickness: number;
}

export interface TargetSettings {
  color: string;
}

export interface AimAssistSettings {
  enabled: boolean;
  strength: number;
}

export type HitEffectType = "balloon" | "burst" | "explosion" | "nuke" | "bloodMist";

export interface HitEffectSettings {
  enabled: boolean;
  type: HitEffectType;
}

export interface SoundSettings {
  custom: CustomSoundSettings;
  customEnabled: boolean;
  enabled: boolean;
  useHitEffectSound: boolean;
}

export interface TrainingSettings {
  durationSeconds: number;
  fpsLimit: number;
  microDurationSeconds: number;
  sensitivityX: number;
  sensitivityY: number;
  startCountdownSeconds: number;
  trackingDurationSeconds: number;
}

interface PersistedSettings {
  aimAssist: AimAssistSettings;
  crosshair: CrosshairSettings;
  hit: HitEffectSettings;
  language: LanguagePreference;
  sound: SoundSettings;
  target: TargetSettings;
  training: TrainingSettings;
}

interface SettingsState extends PersistedSettings {
  resetAimSettings: () => void;
  setAimAssist: (settings: Partial<AimAssistSettings>) => void;
  setCrosshair: (settings: Partial<CrosshairSettings>) => void;
  setHit: (settings: Partial<HitEffectSettings>) => void;
  setLanguage: (language: LanguagePreference) => void;
  setSound: (settings: Partial<SoundSettings>) => void;
  setTarget: (settings: Partial<TargetSettings>) => void;
  setTraining: (settings: Partial<TrainingSettings>) => void;
}

const storageKey = "aim-trainer-settings";

export const defaultSettings: PersistedSettings = {
  aimAssist: {
    enabled: false,
    strength: 35,
  },
  crosshair: {
    centerDotEnabled: true,
    centerDotSize: 6,
    color: "#ffffff",
    dynamicSpreadEnabled: false,
    outerCrosshairEnabled: true,
    outerCrosshairOffset: 6,
    opacity: 0.8,
    spreadRecoverySeconds: 0.8,
    size: 32,
    thickness: 1,
  },
  hit: {
    enabled: false,
    type: "balloon",
  },
  language: "system",
  sound: {
    custom: createDefaultCustomSoundSettings(),
    customEnabled: false,
    enabled: true,
    useHitEffectSound: true,
  },
  target: {
    color: "#00FFEE",
  },
  training: {
    durationSeconds: 60,
    fpsLimit: 240,
    microDurationSeconds: 60,
    sensitivityX: 0.8,
    sensitivityY: 0.8,
    startCountdownSeconds: 3,
    trackingDurationSeconds: 60,
  },
};

function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === "system" || value === "zh-CN" || value === "en-US";
}

function readNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function readColor(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readClipRef(value: unknown): SoundClipRef | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const clip = value as Partial<SoundClipRef>;
  if (typeof clip.id !== "string" || typeof clip.assetId !== "string") {
    return null;
  }

  return {
    assetId: clip.assetId,
    endMs: typeof clip.endMs === "number" && Number.isFinite(clip.endMs) ? Math.max(0, clip.endMs) : undefined,
    id: clip.id,
    note: typeof clip.note === "string" ? clip.note : undefined,
    startMs:
      typeof clip.startMs === "number" && Number.isFinite(clip.startMs) ? Math.max(0, clip.startMs) : undefined,
  };
}

function readHitFeedbackSource(value: unknown, fallback: HitFeedbackSource): HitFeedbackSource {
  return value === "default" || value === "custom" ? value : fallback;
}

function readMissFeedbackMode(value: unknown, fallback: MissFeedbackMode): MissFeedbackMode {
  return value === "none" || value === "custom" ? value : fallback;
}

function readComboMusicMode(value: unknown, fallback: ComboMusicMode): ComboMusicMode {
  return value === "fullTrack" || value === "manualClips" ? value : fallback;
}

function readComboBreakBehavior(value: unknown, fallback: ComboBreakBehavior): ComboBreakBehavior {
  return value === "restart" || value === "pause" || value === "stop" ? value : fallback;
}

function readComboResumeBehavior(value: unknown, fallback: ComboResumeBehavior): ComboResumeBehavior {
  return value === "fromStart" || value === "fromPausedPosition" ? value : fallback;
}

function readComboOverflowBehavior(value: unknown, fallback: ComboOverflowBehavior): ComboOverflowBehavior {
  return value === "restart" || value === "holdLast" || value === "loop" || value === "continueFullTrack" || value === "silent"
    ? value
    : fallback;
}

function readVolume(value: unknown, fallback: number) {
  return readNumber(value, fallback, 0, 1);
}

function readComboMusicClip(value: unknown, fallbackIndex: number): ComboMusicClip | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<ComboMusicClip>;
  const index =
    typeof item.index === "number" && Number.isInteger(item.index) && item.index > 0 ? item.index : fallbackIndex;
  const startMs = typeof item.startMs === "number" && Number.isFinite(item.startMs) ? Math.max(0, item.startMs) : 0;
  const endMs =
    typeof item.endMs === "number" && Number.isFinite(item.endMs) ? Math.max(startMs + 1, item.endMs) : startMs + 300;

  return {
    endMs,
    id: typeof item.id === "string" ? item.id : `combo_clip_${index}`,
    index,
    note: readString(item.note),
    startMs,
  };
}

function readComboSoundPack(value: unknown): ComboSoundPack | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Partial<ComboSoundPack> & Record<string, unknown>;
  if (typeof item.id !== "string" || typeof item.sourceAssetId !== "string") {
    return null;
  }

  const clips = Array.isArray(item.clips)
    ? item.clips
        .map((clip, index) => readComboMusicClip(clip, index + 1))
        .filter((clip): clip is ComboMusicClip => Boolean(clip))
        .sort((first, second) => first.index - second.index)
    : [];

  return {
    builtIn: readBoolean(item.builtIn, false),
    clips,
    id: item.id,
    name: readString(item.name, `连击整合包 ${clips.length || 1}`),
    sourceAssetId: item.sourceAssetId,
    updatedAt: readNumber(item.updatedAt, Date.now(), 0, Number.MAX_SAFE_INTEGER),
  };
}

function readCustomSoundSettings(value: unknown): CustomSoundSettings {
  const fallback = createDefaultCustomSoundSettings();
  const settings =
    value && typeof value === "object" ? (value as Partial<CustomSoundSettings> & Record<string, unknown>) : {};
  const comboMusic =
    settings.comboMusic && typeof settings.comboMusic === "object"
      ? (settings.comboMusic as unknown as Record<string, unknown>)
      : {};
  const hitFeedback =
    settings.hitFeedback && typeof settings.hitFeedback === "object"
      ? (settings.hitFeedback as unknown as Record<string, unknown>)
      : {};
  const missFeedback =
    settings.missFeedback && typeof settings.missFeedback === "object"
      ? (settings.missFeedback as unknown as Record<string, unknown>)
      : {};
  const legacyHit = settings.hit && typeof settings.hit === "object" ? (settings.hit as Record<string, unknown>) : {};
  const legacyMiss =
    settings.miss && typeof settings.miss === "object" ? (settings.miss as Record<string, unknown>) : {};
  const legacyHitSequence = Array.isArray(legacyHit.sequence) ? legacyHit.sequence : [];
  const legacySourceAssetId =
    typeof comboMusic.sourceAssetId === "string"
      ? comboMusic.sourceAssetId
      : readClipRef(
          (legacyHitSequence.find(
            (item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && "clip" in item),
          ) as Record<string, unknown> | undefined)?.clip,
        )?.assetId ?? null;
  const legacyComboClips = legacyHitSequence
    .map((item, index) => {
      const legacyItem = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const clip = readClipRef(legacyItem.clip);
      if (!clip || typeof clip.startMs !== "number" || typeof clip.endMs !== "number") {
        return null;
      }

      return readComboMusicClip(
        {
          endMs: clip.endMs,
          id: legacyItem.id,
          index: legacyItem.index,
          note: legacyItem.note ?? clip.note,
          startMs: clip.startMs,
        },
        index + 1,
      );
    })
    .filter((item: ComboMusicClip | null): item is ComboMusicClip => Boolean(item));
  const comboPacks = Array.isArray(comboMusic.packs)
    ? sortComboSoundPacks(comboMusic.packs.map(readComboSoundPack).filter((item): item is ComboSoundPack => Boolean(item)))
    : [];
  const activePackId =
    typeof comboMusic.activePackId === "string" && comboPacks.some((pack) => pack.id === comboMusic.activePackId)
      ? comboMusic.activePackId
      : comboPacks.find((pack) => pack.sourceAssetId === legacySourceAssetId)?.id ?? null;
  const activePack = activePackId ? (comboPacks.find((pack) => pack.id === activePackId) ?? null) : null;
  const comboEnabled = readBoolean(comboMusic.enabled, legacyComboClips.length > 0 ? true : fallback.comboMusic.enabled);
  const storedComboClips = Array.isArray(comboMusic.clips)
    ? comboMusic.clips
        .map((item, index) => readComboMusicClip(item, index + 1))
        .filter((item): item is ComboMusicClip => Boolean(item))
        .sort((first, second) => first.index - second.index)
    : legacyComboClips;

  return {
    comboMusic: {
      activePackId,
      breakBehavior: readComboBreakBehavior(comboMusic.breakBehavior, fallback.comboMusic.breakBehavior),
      clips: activePack?.clips ?? storedComboClips,
      enabled: comboEnabled,
      mode: "manualClips",
      overflowBehavior: readComboOverflowBehavior(comboMusic.overflowBehavior, fallback.comboMusic.overflowBehavior),
      packs: comboPacks,
      resumeBehavior: readComboResumeBehavior(comboMusic.resumeBehavior, fallback.comboMusic.resumeBehavior),
      sourceAssetId: activePack?.sourceAssetId ?? legacySourceAssetId,
      volume: readVolume(comboMusic.volume, fallback.comboMusic.volume),
    },
    hitFeedback: {
      customClip: readClipRef(hitFeedback.customClip) ?? readClipRef(legacyHit.singleClip) ?? fallback.hitFeedback.customClip,
      enabled: comboEnabled ? false : readBoolean(hitFeedback.enabled, fallback.hitFeedback.enabled),
      playWithComboMusic: false,
      source: readHitFeedbackSource(hitFeedback.source, fallback.hitFeedback.source),
    },
    missFeedback: {
      customClip:
        readClipRef(missFeedback.customClip) ?? readClipRef(legacyMiss.singleClip) ?? fallback.missFeedback.customClip,
      mode: readMissFeedbackMode(missFeedback.mode, fallback.missFeedback.mode),
      volume: readVolume(missFeedback.volume, fallback.missFeedback.volume),
    },
  };
}

function readHitEffectType(value: unknown, fallback: HitEffectType): HitEffectType {
  return value === "balloon" || value === "burst" || value === "explosion" || value === "nuke" || value === "bloodMist"
    ? value
    : fallback;
}

function loadSettings(): PersistedSettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const value = window.localStorage.getItem(storageKey);
    if (!value) {
      return defaultSettings;
    }

    const settings = JSON.parse(value) as Partial<PersistedSettings>;

    return {
      aimAssist: {
        enabled: readBoolean(settings.aimAssist?.enabled, defaultSettings.aimAssist.enabled),
        strength: readNumber(settings.aimAssist?.strength, defaultSettings.aimAssist.strength, 1, 100),
      },
      crosshair: {
        centerDotEnabled: readBoolean(
          settings.crosshair?.centerDotEnabled,
          defaultSettings.crosshair.centerDotEnabled,
        ),
        centerDotSize: readNumber(settings.crosshair?.centerDotSize, defaultSettings.crosshair.centerDotSize, 2, 12),
        color: readColor(settings.crosshair?.color, defaultSettings.crosshair.color),
        dynamicSpreadEnabled: readBoolean(
          settings.crosshair?.dynamicSpreadEnabled,
          defaultSettings.crosshair.dynamicSpreadEnabled,
        ),
        outerCrosshairEnabled: readBoolean(
          settings.crosshair?.outerCrosshairEnabled,
          defaultSettings.crosshair.outerCrosshairEnabled,
        ),
        outerCrosshairOffset: readNumber(
          settings.crosshair?.outerCrosshairOffset,
          defaultSettings.crosshair.outerCrosshairOffset,
          0,
          28,
        ),
        opacity: readNumber(settings.crosshair?.opacity, defaultSettings.crosshair.opacity, 0.2, 1),
        spreadRecoverySeconds: readNumber(
          settings.crosshair?.spreadRecoverySeconds,
          defaultSettings.crosshair.spreadRecoverySeconds,
          0.1,
          2,
        ),
        size: readNumber(settings.crosshair?.size, defaultSettings.crosshair.size, 16, 56),
        thickness: readNumber(settings.crosshair?.thickness, defaultSettings.crosshair.thickness, 1, 4),
      },
      hit: {
        enabled: readBoolean(settings.hit?.enabled, defaultSettings.hit.enabled),
        type: readHitEffectType(settings.hit?.type, defaultSettings.hit.type),
      },
      language: isLanguagePreference(settings.language) ? settings.language : defaultSettings.language,
      sound: {
        custom: readCustomSoundSettings(settings.sound?.custom),
        customEnabled: readBoolean(settings.sound?.customEnabled, defaultSettings.sound.customEnabled),
        enabled: readBoolean(settings.sound?.enabled, defaultSettings.sound.enabled),
        useHitEffectSound: readBoolean(settings.sound?.useHitEffectSound, defaultSettings.sound.useHitEffectSound),
      },
      target: {
        color:
          settings.target?.color?.toLowerCase() === "#00c8c8"
            ? defaultSettings.target.color
            : readColor(settings.target?.color, defaultSettings.target.color),
      },
      training: {
        durationSeconds: readNumber(
          settings.training?.durationSeconds,
          defaultSettings.training.durationSeconds,
          15,
          180,
        ),
        fpsLimit: readNumber(settings.training?.fpsLimit, defaultSettings.training.fpsLimit, 30, 240),
        microDurationSeconds: readNumber(
          settings.training?.microDurationSeconds,
          defaultSettings.training.microDurationSeconds,
          15,
          180,
        ),
        sensitivityX: readNumber(settings.training?.sensitivityX, defaultSettings.training.sensitivityX, 0.1, 3),
        sensitivityY: readNumber(settings.training?.sensitivityY, defaultSettings.training.sensitivityY, 0.1, 3),
        startCountdownSeconds: readNumber(
          settings.training?.startCountdownSeconds,
          defaultSettings.training.startCountdownSeconds,
          1,
          10,
        ),
        trackingDurationSeconds: readNumber(
          settings.training?.trackingDurationSeconds,
          defaultSettings.training.trackingDurationSeconds,
          15,
          180,
        ),
      },
    };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings: PersistedSettings) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch {
    // Ignore persistence failures so settings never block the UI.
  }
}

function persist(
  set: (partial: Partial<SettingsState>) => void,
  get: () => SettingsState,
  partial: Partial<PersistedSettings>,
) {
  const nextSettings = {
    aimAssist: partial.aimAssist ?? get().aimAssist,
    crosshair: partial.crosshair ?? get().crosshair,
    hit: partial.hit ?? get().hit,
    language: partial.language ?? get().language,
    sound: partial.sound ?? get().sound,
    target: partial.target ?? get().target,
    training: partial.training ?? get().training,
  };

  saveSettings(nextSettings);
  set(partial);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...loadSettings(),
  resetAimSettings: () => {
    persist(set, get, {
      aimAssist: defaultSettings.aimAssist,
      crosshair: defaultSettings.crosshair,
      hit: defaultSettings.hit,
      sound: defaultSettings.sound,
      target: defaultSettings.target,
      training: defaultSettings.training,
    });
  },
  setAimAssist: (settings) => {
    persist(set, get, { aimAssist: { ...get().aimAssist, ...settings } });
  },
  setCrosshair: (settings) => {
    persist(set, get, { crosshair: { ...get().crosshair, ...settings } });
  },
  setHit: (settings) => {
    persist(set, get, { hit: { ...get().hit, ...settings } });
  },
  setLanguage: (language) => {
    persist(set, get, { language });
  },
  setSound: (settings) => {
    persist(set, get, { sound: { ...get().sound, ...settings } });
  },
  setTarget: (settings) => {
    persist(set, get, { target: { ...get().target, ...settings } });
  },
  setTraining: (settings) => {
    persist(set, get, { training: { ...get().training, ...settings } });
  },
}));
