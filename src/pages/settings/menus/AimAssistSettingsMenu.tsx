import { Magnet } from "lucide-react";
import { RangeField, ToggleField } from "@/components/settings/SettingsFields";
import type { AimAssistSettings } from "@/stores/settingsStore";
import type { SettingsTranslator } from "./menuTypes";

interface AimAssistSettingsMenuProps {
  aimAssist: AimAssistSettings;
  onChange: (settings: Partial<AimAssistSettings>) => void;
  t: SettingsTranslator;
}

export function AimAssistSettingsMenu({ aimAssist, onChange, t }: AimAssistSettingsMenuProps) {
  return (
    <div className="grid gap-5">
      <ToggleField
        label={t("fields.aimAssistEnabled", { defaultValue: "辅助瞄准" })}
        description={t("fields.aimAssistEnabledDescription", {
          defaultValue: "自动将准星拉向离鼠标最近的小球中心，默认关闭。",
        })}
        checked={aimAssist.enabled}
        onChange={(enabled) => onChange({ enabled })}
      />
      <RangeField
        icon={Magnet}
        label={t("fields.aimAssistStrength", { defaultValue: "辅助瞄准强度" })}
        value={aimAssist.strength}
        min={1}
        max={100}
        step={1}
        unit=""
        disabled={!aimAssist.enabled}
        onChange={(strength) => onChange({ strength })}
      />
      <p className="rounded-2xl border border-primary/15 bg-primary/8 p-4 text-sm text-muted-foreground">
        {t("messages.aimAssistNote", {
          defaultValue:
            "强度同时影响吸附范围和准星移动速度。反向移动鼠标仍可抵消吸附，高强度更适合测试辅助瞄准边界。",
        })}
      </p>
    </div>
  );
}
