import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsPreview } from "@/components/settings/SettingsPreview";
import { AimAssistSettingsMenu } from "@/pages/settings/menus/AimAssistSettingsMenu";
import { CrosshairSettingsMenu } from "@/pages/settings/menus/CrosshairSettingsMenu";
import { DurationSettingsMenu } from "@/pages/settings/menus/DurationSettingsMenu";
import { FpsSettingsMenu } from "@/pages/settings/menus/FpsSettingsMenu";
import { HitEffectSettingsMenu } from "@/pages/settings/menus/HitEffectSettingsMenu";
import {
  readActiveSettingsSection,
  saveActiveSettingsSection,
} from "@/pages/settings/menus/settingsMenuStorage";
import { settingsSections, type SettingsSection } from "@/pages/settings/menus/settingsSections";
import { SensitivitySettingsMenu } from "@/pages/settings/menus/SensitivitySettingsMenu";
import { SoundSettingsMenu } from "@/pages/settings/menus/SoundSettingsMenu";
import { TargetSettingsMenu } from "@/pages/settings/menus/TargetSettingsMenu";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settingsStore";

interface SettingsPanelProps {
  className?: string;
  surface?: "page" | "glass";
}

export function SettingsPanel({ className, surface = "page" }: SettingsPanelProps) {
  const { t } = useTranslation("settings");
  const [activeSection, setActiveSection] = useState<SettingsSection>(() => readActiveSettingsSection());
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const aimAssist = useSettingsStore((state) => state.aimAssist);
  const crosshair = useSettingsStore((state) => state.crosshair);
  const hit = useSettingsStore((state) => state.hit);
  const sound = useSettingsStore((state) => state.sound);
  const target = useSettingsStore((state) => state.target);
  const training = useSettingsStore((state) => state.training);
  const setAimAssist = useSettingsStore((state) => state.setAimAssist);
  const setCrosshair = useSettingsStore((state) => state.setCrosshair);
  const setHit = useSettingsStore((state) => state.setHit);
  const setSound = useSettingsStore((state) => state.setSound);
  const setTarget = useSettingsStore((state) => state.setTarget);
  const setTraining = useSettingsStore((state) => state.setTraining);
  const resetAimSettings = useSettingsStore((state) => state.resetAimSettings);
  const activeMeta = useMemo(
    () => settingsSections.find((section) => section.id === activeSection) ?? settingsSections[0],
    [activeSection],
  );

  const selectSection = (section: SettingsSection) => {
    setActiveSection(section);
    saveActiveSettingsSection(section);
  };

  return (
    <section
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]",
        surface === "glass" ? "bg-white/[0.06] backdrop-blur-2xl" : "bg-white/[0.035] backdrop-blur-xl",
        className,
      )}
    >
      <div className="grid min-h-0 min-w-0 flex-1 lg:grid-cols-[minmax(285px,clamp(285px,28vw,380px))_minmax(0,1fr)]">
        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-white/10 bg-black/15 p-4 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between gap-3 px-2">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-primary">
                {t("badges.settings", { defaultValue: "Settings" })}
              </div>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">
                {t("title", { defaultValue: "训练设置" })}
              </h2>
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={() => {
                if (!isConfirmingReset) {
                  setIsConfirmingReset(true);
                  return;
                }

                resetAimSettings();
                setIsConfirmingReset(false);
              }}
              onBlur={() => setIsConfirmingReset(false)}
              title={t("actions.reset", { defaultValue: "恢复默认设置" })}
            >
              <RotateCcw className="h-4 w-4" />
              {isConfirmingReset && (
                <span className="hidden sm:inline">
                  {t("actions.confirmReset", { defaultValue: "确认重置" })}
                </span>
              )}
            </Button>
          </div>

          <div className="grid min-h-0 gap-2 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-color:rgba(255,255,255,0.24)_transparent] [scrollbar-width:thin]">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection;

              return (
                <button
                  key={section.id}
                  type="button"
                  disabled={section.disabled}
                  onClick={() => selectSection(section.id)}
                  className={cn(
                    "group flex min-w-0 w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                    isActive
                      ? "border-primary/35 bg-primary/12 text-foreground shadow-[0_0_30px_rgba(0,200,200,0.08)]"
                      : "border-white/8 bg-white/[0.025] text-muted-foreground hover:border-white/14 hover:bg-white/[0.045] hover:text-foreground",
                    section.disabled && "cursor-not-allowed opacity-45 hover:border-white/8 hover:bg-white/[0.025]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                      isActive
                        ? "border-primary/25 bg-primary/15 text-primary"
                        : "border-white/10 bg-black/20 text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {t(`sections.${section.translationKey}.title`, { defaultValue: section.id })}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground/70">
                      {t(`sections.${section.translationKey}.description`, { defaultValue: "" })}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="flex min-h-0 flex-col">
          <div className="shrink-0 border-b border-white/10 p-6 pb-5 md:p-8 md:pb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                    {t(`sections.${activeMeta.translationKey}.title`, { defaultValue: activeMeta.id })}
                  </Badge>
                  {activeMeta.disabled && (
                    <Badge variant="outline">
                      {t("badges.comingSoon", { defaultValue: "即将推出" })}
                    </Badge>
                  )}
                </div>
                <h3 className="text-3xl font-bold tracking-tight">
                  {t(`sections.${activeMeta.translationKey}.title`, { defaultValue: activeMeta.id })}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t(`sections.${activeMeta.translationKey}.description`, { defaultValue: "" })}
                </p>
              </div>
              <SettingsPreview
                centerDotEnabled={crosshair.centerDotEnabled}
                centerDotSize={crosshair.centerDotSize}
                crosshairColor={crosshair.color}
                crosshairOpacity={crosshair.opacity}
                crosshairOffset={crosshair.outerCrosshairOffset}
                crosshairSize={crosshair.size}
                crosshairThickness={crosshair.thickness}
                outerCrosshairEnabled={crosshair.outerCrosshairEnabled}
                targetColor={target.color}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-6 pt-5 [scrollbar-color:rgba(255,255,255,0.24)_transparent] [scrollbar-width:thin] md:p-8 md:pt-6">
            {activeSection === "crosshair" && (
              <CrosshairSettingsMenu crosshair={crosshair} onChange={setCrosshair} t={t} />
            )}
            {activeSection === "target" && <TargetSettingsMenu target={target} onChange={setTarget} t={t} />}
            {activeSection === "aimAssist" && (
              <AimAssistSettingsMenu aimAssist={aimAssist} onChange={setAimAssist} t={t} />
            )}
            {activeSection === "duration" && (
              <DurationSettingsMenu training={training} onChange={setTraining} t={t} />
            )}
            {activeSection === "sensitivity" && (
              <SensitivitySettingsMenu training={training} onChange={setTraining} t={t} />
            )}
            {activeSection === "hit" && <HitEffectSettingsMenu hit={hit} onChange={setHit} t={t} />}
            {activeSection === "sound" && <SoundSettingsMenu sound={sound} onChange={setSound} />}
            {activeSection === "fps" && <FpsSettingsMenu training={training} onChange={setTraining} t={t} />}
          </div>
        </div>
      </div>
    </section>
  );
}
