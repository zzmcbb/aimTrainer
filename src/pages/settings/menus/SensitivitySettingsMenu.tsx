import { Zap } from "lucide-react";
import { RangeField } from "@/components/settings/SettingsFields";
import type { TrainingSettings } from "@/stores/settingsStore";
import type { SettingsTranslator } from "./menuTypes";

interface SensitivitySettingsMenuProps {
  onChange: (settings: Partial<TrainingSettings>) => void;
  t: SettingsTranslator;
  training: TrainingSettings;
}

export function SensitivitySettingsMenu({ onChange, t, training }: SensitivitySettingsMenuProps) {
  return (
    <div className="grid gap-5">
      <RangeField
        icon={Zap}
        label={t("fields.sensitivityX", { defaultValue: "X 轴灵敏度" })}
        value={training.sensitivityX}
        min={0.1}
        max={3}
        step={0.05}
        unit="x"
        onChange={(sensitivityX) => onChange({ sensitivityX })}
      />
      <RangeField
        icon={Zap}
        label={t("fields.sensitivityY", { defaultValue: "Y 轴灵敏度" })}
        value={training.sensitivityY}
        min={0.1}
        max={3}
        step={0.05}
        unit="x"
        onChange={(sensitivityY) => onChange({ sensitivityY })}
      />
    </div>
  );
}
