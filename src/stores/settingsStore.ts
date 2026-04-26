import { create } from "zustand";

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

export type HitEffectType = "balloon" | "burst" | "explosion";

export interface HitEffectSettings {
  enabled: boolean;
  type: HitEffectType;
}

export interface TrainingSettings {
  durationSeconds: number;
  fpsLimit: number;
  sensitivityX: number;
  sensitivityY: number;
}

interface PersistedSettings {
  crosshair: CrosshairSettings;
  hit: HitEffectSettings;
  language: LanguagePreference;
  target: TargetSettings;
  training: TrainingSettings;
}

interface SettingsState extends PersistedSettings {
  resetAimSettings: () => void;
  setCrosshair: (settings: Partial<CrosshairSettings>) => void;
  setHit: (settings: Partial<HitEffectSettings>) => void;
  setLanguage: (language: LanguagePreference) => void;
  setTarget: (settings: Partial<TargetSettings>) => void;
  setTraining: (settings: Partial<TrainingSettings>) => void;
}

const storageKey = "aim-trainer-settings";

export const defaultSettings: PersistedSettings = {
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
  target: {
    color: "#00FFEE",
  },
  training: {
    durationSeconds: 60,
    fpsLimit: 240,
    sensitivityX: 0.8,
    sensitivityY: 0.8,
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

function readHitEffectType(value: unknown, fallback: HitEffectType): HitEffectType {
  return value === "balloon" || value === "burst" || value === "explosion" ? value : fallback;
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
        sensitivityX: readNumber(settings.training?.sensitivityX, defaultSettings.training.sensitivityX, 0.1, 3),
        sensitivityY: readNumber(settings.training?.sensitivityY, defaultSettings.training.sensitivityY, 0.1, 3),
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
    crosshair: partial.crosshair ?? get().crosshair,
    hit: partial.hit ?? get().hit,
    language: partial.language ?? get().language,
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
      crosshair: defaultSettings.crosshair,
      hit: defaultSettings.hit,
      target: defaultSettings.target,
      training: defaultSettings.training,
    });
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
  setTarget: (settings) => {
    persist(set, get, { target: { ...get().target, ...settings } });
  },
  setTraining: (settings) => {
    persist(set, get, { training: { ...get().training, ...settings } });
  },
}));
