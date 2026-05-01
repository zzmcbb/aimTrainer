import { ColorField, RangeField, ToggleField } from "@/components/settings/SettingsFields";
import { defaultSettings, type CrosshairSettings } from "@/stores/settingsStore";
import type { SettingsTranslator } from "./menuTypes";

interface CrosshairSettingsMenuProps {
  crosshair: CrosshairSettings;
  onChange: (settings: Partial<CrosshairSettings>) => void;
  t: SettingsTranslator;
}

export function CrosshairSettingsMenu({ crosshair, onChange, t }: CrosshairSettingsMenuProps) {
  return (
    <div className="grid gap-5">
      <ColorField
        label={t("fields.crosshairColor", { defaultValue: "准星颜色" })}
        value={crosshair.color}
        defaultLabel={t("fields.defaultValue", {
          defaultValue: "默认值 {{value}}",
          values: { value: defaultSettings.crosshair.color },
        })}
        onChange={(color) => onChange({ color })}
      />
      <ToggleField
        label={t("fields.outerCrosshairEnabled", { defaultValue: "外部准星" })}
        description={t("fields.outerCrosshairEnabledDescription", { defaultValue: "显示准星外部十字线" })}
        checked={crosshair.outerCrosshairEnabled}
        onChange={(outerCrosshairEnabled) => onChange({ outerCrosshairEnabled })}
      />
      <RangeField
        label={t("fields.crosshairSize", { defaultValue: "准星大小" })}
        value={crosshair.size}
        min={16}
        max={56}
        step={1}
        unit="px"
        disabled={!crosshair.outerCrosshairEnabled}
        onChange={(size) => onChange({ size })}
      />
      <RangeField
        label={t("fields.crosshairThickness", { defaultValue: "准星粗细" })}
        value={crosshair.thickness}
        min={1}
        max={4}
        step={0.5}
        unit="px"
        disabled={!crosshair.outerCrosshairEnabled}
        onChange={(thickness) => onChange({ thickness })}
      />
      <RangeField
        label={t("fields.outerCrosshairOffset", { defaultValue: "外部准星偏移" })}
        value={crosshair.outerCrosshairOffset}
        min={0}
        max={28}
        step={1}
        unit="px"
        disabled={!crosshair.outerCrosshairEnabled}
        onChange={(outerCrosshairOffset) => onChange({ outerCrosshairOffset })}
      />
      <ToggleField
        label={t("fields.dynamicSpreadEnabled", { defaultValue: "动态扩散" })}
        description={t("fields.dynamicSpreadEnabledDescription", { defaultValue: "射击时准星短暂扩散后回弹" })}
        checked={crosshair.dynamicSpreadEnabled}
        disabled={!crosshair.outerCrosshairEnabled}
        onChange={(dynamicSpreadEnabled) => onChange({ dynamicSpreadEnabled })}
      />
      <RangeField
        label={t("fields.spreadRecoverySeconds", { defaultValue: "扩散回弹时间" })}
        value={crosshair.spreadRecoverySeconds}
        min={0.1}
        max={2}
        step={0.1}
        unit="s"
        disabled={!crosshair.outerCrosshairEnabled || !crosshair.dynamicSpreadEnabled}
        onChange={(spreadRecoverySeconds) => onChange({ spreadRecoverySeconds })}
      />
      <RangeField
        label={t("fields.crosshairOpacity", { defaultValue: "准星透明度" })}
        value={crosshair.opacity}
        min={0.2}
        max={1}
        step={0.05}
        unit=""
        onChange={(opacity) => onChange({ opacity })}
      />
      <ToggleField
        label={t("fields.centerDotEnabled", { defaultValue: "中心点" })}
        description={t("fields.centerDotEnabledDescription", { defaultValue: "显示准星中心点" })}
        checked={crosshair.centerDotEnabled}
        onChange={(centerDotEnabled) => onChange({ centerDotEnabled })}
      />
      <RangeField
        label={t("fields.centerDotSize", { defaultValue: "中心点大小" })}
        value={crosshair.centerDotSize}
        min={2}
        max={12}
        step={1}
        unit="px"
        disabled={!crosshair.centerDotEnabled}
        onChange={(centerDotSize) => onChange({ centerDotSize })}
      />
    </div>
  );
}
