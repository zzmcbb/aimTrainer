import { Gauge } from "lucide-react";
import { RangeField } from "@/components/settings/SettingsFields";
import type { TrainingSettings } from "@/stores/settingsStore";
import type { SettingsTranslator } from "./menuTypes";

interface FpsSettingsMenuProps {
  onChange: (settings: Partial<TrainingSettings>) => void;
  t: SettingsTranslator;
  training: TrainingSettings;
}

export function FpsSettingsMenu({ onChange, t, training }: FpsSettingsMenuProps) {
  return (
    <div className="grid gap-5">
      <RangeField
        icon={Gauge}
        label={t("fields.fpsLimit", { defaultValue: "FPS 上限" })}
        value={training.fpsLimit}
        min={30}
        max={240}
        step={5}
        unit=" FPS"
        onChange={(fpsLimit) => onChange({ fpsLimit })}
      />
      <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground">
        {t("messages.fpsLimitNote", {
          defaultValue: "较低且稳定的 FPS 上限可以减少帧时间波动。修改后会立即应用到训练画面。",
        })}
      </p>
    </div>
  );
}
