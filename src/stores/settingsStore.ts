import { create } from "zustand";

export type SupportedLanguage = "zh-CN" | "en-US";
export type LanguagePreference = SupportedLanguage | "system";

interface SettingsState {
  language: LanguagePreference;
  setLanguage: (language: LanguagePreference) => void;
}

const storageKey = "aim-trainer-settings";

function loadLanguage(): LanguagePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const value = window.localStorage.getItem(storageKey);
    if (!value) {
      return "system";
    }

    const settings = JSON.parse(value) as Partial<SettingsState>;
    if (
      settings.language === "system" ||
      settings.language === "zh-CN" ||
      settings.language === "en-US"
    ) {
      return settings.language;
    }
  } catch {
    return "system";
  }

  return "system";
}

function saveLanguage(language: LanguagePreference) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ language }));
  } catch {
    // Ignore persistence failures so language switching never blocks the UI.
  }
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: loadLanguage(),
  setLanguage: (language) => {
    saveLanguage(language);
    set({ language });
  },
}));
