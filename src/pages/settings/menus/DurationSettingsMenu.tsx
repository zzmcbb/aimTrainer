import { Clock3, TimerReset } from "lucide-react";
import { RangeField } from "@/components/settings/SettingsFields";
import type { TrainingSettings } from "@/stores/settingsStore";
import type { SettingsTranslator } from "./menuTypes";

interface DurationSettingsMenuProps {
  onChange: (settings: Partial<TrainingSettings>) => void;
  t: SettingsTranslator;
  training: TrainingSettings;
}

export function DurationSettingsMenu({ onChange, t, training }: DurationSettingsMenuProps) {
  return (
    <div className="grid gap-5">
      <RangeField
        icon={TimerReset}
        label={t("fields.startCountdown", { defaultValue: "开始倒计时" })}
        value={training.startCountdownSeconds}
        min={1}
        max={10}
        step={1}
        unit={t("units.seconds", { defaultValue: "秒" })}
        onChange={(startCountdownSeconds) => onChange({ startCountdownSeconds })}
      />
      <RangeField
        icon={Clock3}
        label={t("fields.gridDuration", { defaultValue: "九宫格游戏时长" })}
        value={training.durationSeconds}
        min={15}
        max={180}
        step={5}
        unit={t("units.seconds", { defaultValue: "秒" })}
        onChange={(durationSeconds) => onChange({ durationSeconds })}
      />
      <RangeField
        icon={Clock3}
        label={t("fields.microDuration", { defaultValue: "微调训练游戏时长" })}
        value={training.microDurationSeconds}
        min={15}
        max={180}
        step={5}
        unit={t("units.seconds", { defaultValue: "秒" })}
        onChange={(microDurationSeconds) => onChange({ microDurationSeconds })}
      />
      <RangeField
        icon={Clock3}
        label={t("fields.trackingDuration", { defaultValue: "跟枪训练游戏时长" })}
        value={training.trackingDurationSeconds}
        min={15}
        max={180}
        step={5}
        unit={t("units.seconds", { defaultValue: "秒" })}
        onChange={(trackingDurationSeconds) => onChange({ trackingDurationSeconds })}
      />
      <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground">
        {t("messages.durationNote", {
          defaultValue:
            "开始倒计时默认 3 秒，所有模式统一使用。游戏时长修改后会在下一次重新开始训练时生效，当前暂停局不会被强制改时长。",
        })}
      </p>
    </div>
  );
}
