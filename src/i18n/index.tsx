import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import type { LanguagePreference, SupportedLanguage } from "@/stores/settingsStore";
import zhCNCommon from "@/i18n/locales/zh-CN/common.json";
import zhCNHistory from "@/i18n/locales/zh-CN/history.json";
import zhCNHome from "@/i18n/locales/zh-CN/home.json";
import enUSCommon from "@/i18n/locales/en-US/common.json";
import enUSHistory from "@/i18n/locales/en-US/history.json";
import enUSHome from "@/i18n/locales/en-US/home.json";

type Namespace = "common" | "history" | "home";
type TranslationTree = Record<string, unknown>;
type TranslationResources = Record<SupportedLanguage, Record<Namespace, TranslationTree>>;

interface TranslationOptions {
  defaultValue?: string;
  values?: Record<string, string | number>;
}

interface I18nContextValue {
  language: SupportedLanguage;
  preference: LanguagePreference;
  setLanguage: (language: LanguagePreference) => void;
  t: (namespace: Namespace, key: string, options?: TranslationOptions) => string;
}

const resources: TranslationResources = {
  "zh-CN": {
    common: zhCNCommon,
    history: zhCNHistory,
    home: zhCNHome,
  },
  "en-US": {
    common: enUSCommon,
    history: enUSHistory,
    home: enUSHome,
  },
};

const fallbackLanguage: SupportedLanguage = "zh-CN";
const I18nContext = createContext<I18nContextValue | null>(null);

function resolveSystemLanguage(): SupportedLanguage {
  if (typeof navigator === "undefined") {
    return fallbackLanguage;
  }

  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

function resolveLanguage(preference: LanguagePreference): SupportedLanguage {
  return preference === "system" ? resolveSystemLanguage() : preference;
}

function readNestedValue(tree: TranslationTree, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, tree);

  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, values?: Record<string, string | number>) {
  if (!values) {
    return template;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(values[key] ?? `{{${key}}}`),
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const preference = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const [systemLanguage, setSystemLanguage] = useState(resolveSystemLanguage);
  const language = preference === "system" ? systemLanguage : preference;

  useEffect(() => {
    const handleLanguageChange = () => setSystemLanguage(resolveSystemLanguage());

    window.addEventListener("languagechange", handleLanguageChange);
    return () => window.removeEventListener("languagechange", handleLanguageChange);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      preference,
      setLanguage,
      t: (namespace, key, options) => {
        const translated =
          readNestedValue(resources[language][namespace], key) ??
          readNestedValue(resources[fallbackLanguage][namespace], key) ??
          options?.defaultValue ??
          key;

        return interpolate(translated, options?.values);
      },
    }),
    [language, preference, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(namespace: Namespace = "common") {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useTranslation must be used inside I18nProvider");
  }

  return {
    language: context.language,
    preference: context.preference,
    setLanguage: context.setLanguage,
    t: (key: string, options?: TranslationOptions) => context.t(namespace, key, options),
  };
}

export function getResolvedLanguage(preference: LanguagePreference) {
  return resolveLanguage(preference);
}
