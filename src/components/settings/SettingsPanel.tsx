import { useMemo, useState } from "react";
import {
  Clock3,
  Crosshair,
  Gauge,
  MousePointerClick,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  TimerReset,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ColorField, RangeField, ToggleField } from "@/components/settings/SettingsFields";
import { SettingsPreview } from "@/components/settings/SettingsPreview";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { defaultSettings, useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";

type SettingsSection = "crosshair" | "target" | "duration" | "sensitivity" | "hit" | "fps";

interface SettingsPanelProps {
  className?: string;
  surface?: "page" | "glass";
}

const sections: Array<{
  id: SettingsSection;
  icon: typeof Crosshair;
  translationKey: string;
  disabled?: boolean;
}> = [
  {
    id: "crosshair",
    icon: Crosshair,
    translationKey: "crosshair",
  },
  {
    id: "target",
    icon: Palette,
    translationKey: "target",
  },
  {
    id: "duration",
    icon: Clock3,
    translationKey: "duration",
  },
  {
    id: "sensitivity",
    icon: SlidersHorizontal,
    translationKey: "sensitivity",
  },
  {
    id: "hit",
    icon: MousePointerClick,
    translationKey: "hit",
    disabled: true,
  },
  {
    id: "fps",
    icon: Gauge,
    translationKey: "fps",
  },
];

export function SettingsPanel({ className, surface = "page" }: SettingsPanelProps) {
  const { t } = useTranslation("settings");
  const [activeSection, setActiveSection] = useState<SettingsSection>("crosshair");
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const crosshair = useSettingsStore((state) => state.crosshair);
  const target = useSettingsStore((state) => state.target);
  const training = useSettingsStore((state) => state.training);
  const setCrosshair = useSettingsStore((state) => state.setCrosshair);
  const setTarget = useSettingsStore((state) => state.setTarget);
  const setTraining = useSettingsStore((state) => state.setTraining);
  const resetAimSettings = useSettingsStore((state) => state.resetAimSettings);
  const activeMeta = useMemo(
    () => sections.find((section) => section.id === activeSection) ?? sections[0],
    [activeSection],
  );
  const ActiveIcon = activeMeta.icon;

  return (
    <section
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]",
        surface === "glass"
          ? "bg-white/[0.06] backdrop-blur-2xl"
          : "bg-white/[0.035] backdrop-blur-xl",
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
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection;

              return (
                <button
                  key={section.id}
                  type="button"
                  disabled={section.disabled}
                  onClick={() => setActiveSection(section.id)}
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
              <div className="grid gap-5">
              <ColorField
                label={t("fields.crosshairColor", { defaultValue: "准星颜色" })}
                value={crosshair.color}
                defaultLabel={t("fields.defaultValue", {
                  defaultValue: "默认值 {{value}}",
                  values: { value: defaultSettings.crosshair.color },
                })}
                onChange={(color) => setCrosshair({ color })}
              />
              <ToggleField
                label={t("fields.outerCrosshairEnabled", { defaultValue: "外部准星" })}
                description={t("fields.outerCrosshairEnabledDescription", { defaultValue: "显示准星外部十字线" })}
                checked={crosshair.outerCrosshairEnabled}
                onChange={(outerCrosshairEnabled) => setCrosshair({ outerCrosshairEnabled })}
              />
              <RangeField
                label={t("fields.crosshairSize", { defaultValue: "准星大小" })}
                value={crosshair.size}
                min={16}
                max={56}
                step={1}
                unit="px"
                disabled={!crosshair.outerCrosshairEnabled}
                onChange={(size) => setCrosshair({ size })}
              />
              <RangeField
                label={t("fields.crosshairThickness", { defaultValue: "准星粗细" })}
                value={crosshair.thickness}
                min={1}
                max={4}
                step={0.5}
                unit="px"
                disabled={!crosshair.outerCrosshairEnabled}
                onChange={(thickness) => setCrosshair({ thickness })}
              />
              <RangeField
                label={t("fields.outerCrosshairOffset", { defaultValue: "外部准星偏移" })}
                value={crosshair.outerCrosshairOffset}
                min={0}
                max={28}
                step={1}
                unit="px"
                disabled={!crosshair.outerCrosshairEnabled}
                onChange={(outerCrosshairOffset) => setCrosshair({ outerCrosshairOffset })}
              />
              <ToggleField
                label={t("fields.dynamicSpreadEnabled", { defaultValue: "动态扩散" })}
                description={t("fields.dynamicSpreadEnabledDescription", { defaultValue: "射击时准星短暂扩散后回弹" })}
                checked={crosshair.dynamicSpreadEnabled}
                disabled={!crosshair.outerCrosshairEnabled}
                onChange={(dynamicSpreadEnabled) => setCrosshair({ dynamicSpreadEnabled })}
              />
              <RangeField
                label={t("fields.spreadRecoverySeconds", { defaultValue: "扩散回弹时间" })}
                value={crosshair.spreadRecoverySeconds}
                min={0.1}
                max={2}
                step={0.1}
                unit="s"
                disabled={!crosshair.outerCrosshairEnabled || !crosshair.dynamicSpreadEnabled}
                onChange={(spreadRecoverySeconds) => setCrosshair({ spreadRecoverySeconds })}
              />
              <RangeField
                label={t("fields.crosshairOpacity", { defaultValue: "准星透明度" })}
                value={crosshair.opacity}
                min={0.2}
                max={1}
                step={0.05}
                unit=""
                onChange={(opacity) => setCrosshair({ opacity })}
              />
              <ToggleField
                label={t("fields.centerDotEnabled", { defaultValue: "中心点" })}
                description={t("fields.centerDotEnabledDescription", { defaultValue: "显示准星中心点" })}
                checked={crosshair.centerDotEnabled}
                onChange={(centerDotEnabled) => setCrosshair({ centerDotEnabled })}
              />
              <RangeField
                label={t("fields.centerDotSize", { defaultValue: "中心点大小" })}
                value={crosshair.centerDotSize}
                min={2}
                max={12}
                step={1}
                unit="px"
                disabled={!crosshair.centerDotEnabled}
                onChange={(centerDotSize) => setCrosshair({ centerDotSize })}
              />
              </div>
            )}

            {activeSection === "target" && (
              <div className="grid gap-5">
              <ColorField
                label={t("fields.targetColor", { defaultValue: "小球颜色" })}
                value={target.color}
                defaultLabel={t("fields.defaultValue", {
                  defaultValue: "默认值 {{value}}",
                  values: { value: defaultSettings.target.color },
                })}
                onChange={(color) => setTarget({ color })}
              />
              <p className="rounded-2xl border border-primary/15 bg-primary/8 p-4 text-sm text-muted-foreground">
                {t("messages.targetNote", {
                  defaultValue: "默认小球颜色已改为当前视觉风格主色，方便和首页/按钮风格保持一致。",
                })}
              </p>
              </div>
            )}

            {activeSection === "duration" && (
              <div className="grid gap-5">
              <RangeField
                icon={TimerReset}
                label={t("fields.duration", { defaultValue: "Grid 3x3 倒计时" })}
                value={training.durationSeconds}
                min={15}
                max={180}
                step={5}
                unit={t("units.seconds", { defaultValue: "秒" })}
                onChange={(durationSeconds) => setTraining({ durationSeconds })}
              />
              <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground">
                {t("messages.durationNote", {
                  defaultValue: "默认时长为 60 秒。修改后会在下一次重新开始训练时生效，当前暂停局不会被强制改时长。",
                })}
              </p>
              </div>
            )}

            {activeSection === "sensitivity" && (
              <div className="grid gap-5">
              <RangeField
                icon={Zap}
                label={t("fields.sensitivityX", { defaultValue: "X 轴灵敏度" })}
                value={training.sensitivityX}
                min={0.1}
                max={3}
                step={0.05}
                unit="x"
                onChange={(sensitivityX) => setTraining({ sensitivityX })}
              />
              <RangeField
                icon={Zap}
                label={t("fields.sensitivityY", { defaultValue: "Y 轴灵敏度" })}
                value={training.sensitivityY}
                min={0.1}
                max={3}
                step={0.05}
                unit="x"
                onChange={(sensitivityY) => setTraining({ sensitivityY })}
              />
              </div>
            )}

            {activeSection === "fps" && (
              <div className="grid gap-5">
              <RangeField
                icon={Gauge}
                label={t("fields.fpsLimit", { defaultValue: "FPS 上限" })}
                value={training.fpsLimit}
                min={30}
                max={240}
                step={5}
                unit=" FPS"
                onChange={(fpsLimit) => setTraining({ fpsLimit })}
              />
              <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground">
                {t("messages.fpsLimitNote", {
                  defaultValue: "较低且稳定的 FPS 上限可以减少帧时间波动。修改后会立即应用到训练画面。",
                })}
              </p>
              </div>
            )}

            {activeSection === "hit" && (
              <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-white/15 bg-black/15 p-8 text-center">
              <div>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-muted-foreground">
                  <ActiveIcon className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-semibold">
                  {t(`sections.${activeMeta.translationKey}.title`, { defaultValue: activeMeta.id })}
                </h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("messages.placeholder", {
                    defaultValue: "这个菜单位置已保留，后续接入具体玩法参数时可以直接扩展。",
                  })}
                </p>
              </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
