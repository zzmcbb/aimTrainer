import { settingsSections, type SettingsSection } from "./settingsSections";

export const activeSettingsSectionKey = "aim-trainer-active-settings-section";

export function readActiveSettingsSection(): SettingsSection {
  if (typeof window === "undefined") {
    return "crosshair";
  }

  const stored = window.localStorage.getItem(activeSettingsSectionKey);
  return settingsSections.some((section) => section.id === stored) ? (stored as SettingsSection) : "crosshair";
}

export function saveActiveSettingsSection(section: SettingsSection) {
  try {
    window.localStorage.setItem(activeSettingsSectionKey, section);
  } catch {
    // Menu memory is a convenience and should not block settings.
  }
}
