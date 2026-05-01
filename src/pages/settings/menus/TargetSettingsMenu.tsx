import { ColorField } from "@/components/settings/SettingsFields";
import { defaultSettings, type TargetSettings } from "@/stores/settingsStore";
import type { SettingsTranslator } from "./menuTypes";

interface TargetSettingsMenuProps {
  onChange: (settings: Partial<TargetSettings>) => void;
  t: SettingsTranslator;
  target: TargetSettings;
}

export function TargetSettingsMenu({ onChange, t, target }: TargetSettingsMenuProps) {
  return (
    <div className="grid gap-5">
      <ColorField
        label={t("fields.targetColor", { defaultValue: "小球颜色" })}
        value={target.color}
        defaultLabel={t("fields.defaultValue", {
          defaultValue: "默认值 {{value}}",
          values: { value: defaultSettings.target.color },
        })}
        onChange={(color) => onChange({ color })}
      />
      <p className="rounded-2xl border border-primary/15 bg-primary/8 p-4 text-sm text-muted-foreground">
        {t("messages.targetNote", {
          defaultValue: "默认小球颜色已改为当前视觉风格主色，方便和首页/按钮风格保持一致。",
        })}
      </p>
    </div>
  );
}
