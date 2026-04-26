import { ArrowLeft, Crosshair, MousePointer2, RotateCcw, Settings, Timer, Trophy, X } from "lucide-react";
import { Link } from "react-router-dom";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { ResultTrendChart } from "@/components/training/ResultTrendChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trainingPageStyles as styles } from "./trainingPage.styles";
import type { Grid3x3TrainingViewModel } from "./useGrid3x3Training";

interface TrainingPageViewProps {
  viewModel: Grid3x3TrainingViewModel;
}

export function TrainingPageView({ viewModel }: TrainingPageViewProps) {
  const {
    t,
    mountRef,
    phase,
    countdown,
    fps,
    logicFps,
    remainingMs,
    stats,
    accuracy,
    score,
    crosshairSettings,
    displayedCrosshairSize,
    crosshairLineLength,
    crosshairLineGap,
    crosshairSpreadTransition,
    resultTrend,
    isSettingsOpen,
    areOverlayActionsEnabled,
    startTraining,
    resumeTraining,
    restartTraining,
    openTrainingSettings,
    setIsSettingsOpen,
    guardOverlayAction,
  } = viewModel;

  return (
    <main className={styles.page}>
      <div ref={mountRef} className={styles.sceneMount} />

      <div className={styles.vignette} />

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
        style={{
          height: displayedCrosshairSize,
          opacity: crosshairSettings.opacity,
          width: displayedCrosshairSize,
        }}
      >
        {crosshairSettings.outerCrosshairEnabled && (
          <>
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                backgroundColor: crosshairSettings.color,
                height: crosshairLineLength,
                transform: `translate(-50%, calc(-100% - ${crosshairLineGap}px))`,
                transition: crosshairSpreadTransition,
                width: crosshairSettings.thickness,
              }}
            />
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                backgroundColor: crosshairSettings.color,
                height: crosshairLineLength,
                transform: `translate(-50%, ${crosshairLineGap}px)`,
                transition: crosshairSpreadTransition,
                width: crosshairSettings.thickness,
              }}
            />
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                backgroundColor: crosshairSettings.color,
                height: crosshairSettings.thickness,
                transform: `translate(calc(-100% - ${crosshairLineGap}px), -50%)`,
                transition: crosshairSpreadTransition,
                width: crosshairLineLength,
              }}
            />
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                backgroundColor: crosshairSettings.color,
                height: crosshairSettings.thickness,
                transform: `translate(${crosshairLineGap}px, -50%)`,
                transition: crosshairSpreadTransition,
                width: crosshairLineLength,
              }}
            />
          </>
        )}
        {crosshairSettings.centerDotEnabled && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              backgroundColor: crosshairSettings.color,
              height: crosshairSettings.centerDotSize,
              width: crosshairSettings.centerDotSize,
            }}
          />
        )}
      </div>

      <div className="absolute left-6 right-6 top-6 z-20 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-white/10 bg-black/30 px-4 py-1.5 backdrop-blur-xl">
            <Crosshair className="h-3.5 w-3.5 text-primary" />
            {t("grid3x3.mode", { defaultValue: "Grid 3x3" })}
          </Badge>
          <Badge variant="outline" className="border-white/10 bg-black/30 px-4 py-1.5 backdrop-blur-xl">
            FPS {fps.toFixed(2)}
          </Badge>
          <Badge variant="outline" className="border-white/10 bg-black/30 px-4 py-1.5 backdrop-blur-xl">
            Logic {logicFps.toFixed(2)}
          </Badge>
        </div>

        <div className="absolute left-1/2 top-0 flex -translate-x-1/2 items-center gap-3">
          <HudStat icon={Timer} label={t("grid3x3.time", { defaultValue: "剩余时间" })} value={`${Math.ceil(remainingMs / 1000)}s`} />
          <HudStat label={t("grid3x3.hits", { defaultValue: "命中" })} value={stats.hits} />
          <HudStat label={t("grid3x3.accuracy", { defaultValue: "命中率" })} value={`${accuracy}%`} />
        </div>

        <Button asChild variant="outline" className="bg-black/30 backdrop-blur-xl">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            {t("grid3x3.backHome", { defaultValue: "返回首页" })}
          </Link>
        </Button>
      </div>

      {phase === "idle" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 px-6 backdrop-blur-sm">
          <div className="max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_24px_90px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_0_45px_rgba(0,200,200,0.14)]">
              <MousePointer2 className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("grid3x3.title", { defaultValue: "九宫格射击训练" })}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {t("grid3x3.subtitle", {
                defaultValue: "在固定九宫格中快速定位并命中目标。",
              })}
            </p>
            <p className="mt-2 text-sm text-muted-foreground/70">
              {t("grid3x3.clickToStart", {
                defaultValue: "点击开始后会锁定鼠标。移动鼠标瞄准，左键射击。",
              })}
            </p>
            <Button size="lg" onClick={startTraining} className="mt-8 px-10 py-6">
              {t("grid3x3.start", { defaultValue: "开始训练" })}
            </Button>
          </div>
        </div>
      )}

      {phase === "countdown" && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="-translate-y-32 text-[7rem] font-bold leading-none text-white drop-shadow-[0_0_45px_rgba(0,0,0,0.75)]">
            {countdown}
          </div>
        </div>
      )}

      {phase === "complete" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-black/45 px-4 py-6 backdrop-blur-md sm:px-6">
          <div className="grid w-full max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.24em] text-primary">
                    {t("grid3x3.complete", { defaultValue: "训练完成" })}
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {t("grid3x3.title", { defaultValue: "九宫格射击训练" })}
                  </h2>
                </div>
              </div>

              <div className="mb-6 grid gap-3 md:grid-cols-4">
                <ResultStat label={t("grid3x3.score", { defaultValue: "得分" })} value={score} />
                <ResultStat label={t("grid3x3.hits", { defaultValue: "命中" })} value={stats.hits} />
                <ResultStat label={t("grid3x3.accuracy", { defaultValue: "命中率" })} value={`${accuracy}%`} />
                <ResultStat
                  label={t("grid3x3.averageReaction", { defaultValue: "平均反应" })}
                  value={stats.averageReactionMs ? `${stats.averageReactionMs}ms` : "-"}
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <ResultTrendChart
                  seconds={resultTrend.seconds}
                  accuracy={resultTrend.accuracy}
                  hits={resultTrend.hits}
                  averageReaction={resultTrend.averageReaction}
                  accuracyLabel={t("grid3x3.accuracyTrend", { defaultValue: "命中率分布" })}
                  hitsLabel={t("grid3x3.hitTrend", { defaultValue: "命中分布" })}
                  averageReactionLabel={t("grid3x3.reactionTrend", {
                    defaultValue: "平均反应分布",
                  })}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
              <div className="mb-5 text-center">
                <div className="text-sm uppercase tracking-[0.24em] text-primary">
                  {t("grid3x3.complete", { defaultValue: "训练完成" })}
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {t("grid3x3.mode", { defaultValue: "Grid 3x3" })}
                </div>
              </div>
              <div
                className={cn("flex flex-col gap-3 transition-opacity", !areOverlayActionsEnabled && "opacity-60")}
                onClickCapture={guardOverlayAction}
                onPointerDownCapture={guardOverlayAction}
              >
                <Button size="lg" onClick={restartTraining} disabled={!areOverlayActionsEnabled} className="py-6">
                  <RotateCcw className="h-4 w-4" />
                  {t("grid3x3.restart", { defaultValue: "重新开始" })}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={openTrainingSettings}
                  disabled={!areOverlayActionsEnabled}
                  className="py-6"
                >
                  <Settings className="h-4 w-4" />
                  {t("grid3x3.settings", { defaultValue: "设置" })}
                </Button>
                <Button asChild size="lg" variant="outline" className="py-6">
                  <Link to="/" aria-disabled={!areOverlayActionsEnabled} tabIndex={areOverlayActionsEnabled ? undefined : -1}>
                    <ArrowLeft className="h-4 w-4" />
                    {t("grid3x3.backHome", { defaultValue: "返回首页" })}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "paused" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 px-6 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
            <div className="mb-5 text-center">
              <div className="text-sm uppercase tracking-[0.24em] text-primary">
                {t("grid3x3.paused", { defaultValue: "已暂停" })}
              </div>
              <div className="mt-2 text-2xl font-bold">
                {t("grid3x3.title", { defaultValue: "九宫格射击训练" })}
              </div>
            </div>
            <div
              className={cn("flex flex-col gap-3 transition-opacity", !areOverlayActionsEnabled && "opacity-60")}
              onClickCapture={guardOverlayAction}
              onPointerDownCapture={guardOverlayAction}
            >
              <Button size="lg" onClick={resumeTraining} disabled={!areOverlayActionsEnabled} className="py-6">
                {t("grid3x3.continue", { defaultValue: "继续游戏" })}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={restartTraining}
                disabled={!areOverlayActionsEnabled}
                className="py-6"
              >
                <RotateCcw className="h-4 w-4" />
                {t("grid3x3.restart", { defaultValue: "重新开始" })}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={openTrainingSettings}
                disabled={!areOverlayActionsEnabled}
                className="py-6"
              >
                <Settings className="h-4 w-4" />
                {t("grid3x3.settings", { defaultValue: "设置" })}
              </Button>
              <Button asChild size="lg" variant="outline" className="py-6">
                <Link to="/" aria-disabled={!areOverlayActionsEnabled} tabIndex={areOverlayActionsEnabled ? undefined : -1}>
                  <ArrowLeft className="h-4 w-4" />
                  {t("grid3x3.backHome", { defaultValue: "返回首页" })}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-16 backdrop-blur-md sm:px-6 lg:py-10">
          <Button
            variant="outline"
            size="default"
            onClick={() => setIsSettingsOpen(false)}
            className="absolute right-6 top-6 z-20 bg-black/35 backdrop-blur-xl"
            aria-label={t("grid3x3.closeSettings", { defaultValue: "关闭设置" })}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="relative h-full min-h-0 w-full max-w-[1400px]">
            <SettingsPanel surface="glass" />
          </div>
        </div>
      )}
    </main>
  );
}

interface HudStatProps {
  icon?: typeof Timer;
  label: string;
  value: string | number;
}

function HudStat({ icon: Icon, label, value }: HudStatProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-5 py-2.5 text-base shadow-[0_8px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      {Icon && <Icon className="h-4 w-4 text-primary" />}
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-lg font-bold text-foreground">{value}</span>
    </div>
  );
}

interface ResultStatProps {
  label: string;
  value: string | number;
}

function ResultStat({ label, value }: ResultStatProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-bold text-foreground">{value}</div>
    </div>
  );
}
