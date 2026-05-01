import { ToggleField } from "@/components/settings/SettingsFields";
import { cn } from "@/lib/utils";
import type { HitEffectSettings, HitEffectType } from "@/stores/settingsStore";
import type { SettingsTranslator } from "./menuTypes";

interface HitEffectSettingsMenuProps {
  hit: HitEffectSettings;
  onChange: (settings: Partial<HitEffectSettings>) => void;
  t: SettingsTranslator;
}

const hitEffectTypes = ["balloon", "burst", "explosion", "nuke", "bloodMist"] satisfies HitEffectType[];

export function HitEffectSettingsMenu({ hit, onChange, t }: HitEffectSettingsMenuProps) {
  return (
    <div className="grid gap-5">
      <ToggleField
        label={t("fields.hitEffectEnabled", { defaultValue: "击中特效" })}
        description={t("fields.hitEffectEnabledDescription", {
          defaultValue: "命中小球时播放短暂的视觉反馈，默认关闭。",
        })}
        checked={hit.enabled}
        onChange={(enabled) => onChange({ enabled })}
      />
      <div className={cn("rounded-2xl border border-white/10 bg-black/20 p-5", !hit.enabled && "opacity-55")}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-medium">
              {t("fields.hitEffectType", { defaultValue: "特效样式" })}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("fields.hitEffectTypeDescription", {
                defaultValue: "可选择气球破裂、能量碎裂或爆炸冲击。",
              })}
            </div>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-foreground">
            {t(`hitEffects.${hit.type}.title`, { defaultValue: hit.type })}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-5">
          {hitEffectTypes.map((effectType) => {
            const isSelected = hit.type === effectType;

            return (
              <button
                key={effectType}
                type="button"
                disabled={!hit.enabled}
                onClick={() => onChange({ type: effectType })}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-all",
                  isSelected
                    ? "border-primary/35 bg-primary/12 shadow-[0_0_30px_rgba(0,200,200,0.08)]"
                    : "border-white/10 bg-white/[0.025] hover:border-white/18 hover:bg-white/[0.045]",
                  !hit.enabled && "cursor-not-allowed",
                )}
              >
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl">
                  {t(`hitEffects.${effectType}.icon`, { defaultValue: "*" })}
                </span>
                <span className="block font-medium">
                  {t(`hitEffects.${effectType}.title`, { defaultValue: effectType })}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {t(`hitEffects.${effectType}.description`, { defaultValue: "" })}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="rounded-2xl border border-primary/15 bg-primary/8 p-4 text-sm text-muted-foreground">
        {t("messages.hitEffectNote", {
          defaultValue: "击中特效默认关闭；开启后会在命中位置播放，不影响命中判定和成绩记录。",
        })}
      </p>
    </div>
  );
}
