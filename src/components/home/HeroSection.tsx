import { useRef, useState } from "react";
import { Chrome, ChevronRight, Crosshair, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/home/GlassCard";
import { ParallaxBackground } from "@/components/home/ParallaxBackground";
import { TrainingModeCard } from "@/components/home/TrainingModeCard";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

const trainingModes = [
  {
    mode: "grid" as const,
    titleKey: "modes.grid.title",
    descriptionKey: "modes.grid.description",
  },
  {
    mode: "micro" as const,
    titleKey: "modes.micro.title",
    descriptionKey: "modes.micro.description",
  },
  {
    mode: "tracking" as const,
    titleKey: "modes.tracking.title",
    descriptionKey: "modes.tracking.description",
  },
];

export function HeroSection() {
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const modesRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation("home");
  const navigate = useNavigate();
  const scrollToModes = () => {
    modesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <ParallaxBackground intensityBoost={hoveredCardIndex !== null ? 1 : 0} />
      <LanguageSwitcher />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-5xl">
          <GlassCard intensity="high" className="mb-8 p-10 md:p-14 lg:p-16">
            <div className="flex flex-col items-center text-center">
              <div className="mb-10 flex items-center gap-4">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                  <Crosshair className="h-7 w-7 text-primary" />
                  <div className="absolute inset-0 -z-10 rounded-xl bg-primary/20 blur-xl" />
                </div>

                <div className="flex flex-col items-start">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {t("brand.name", { defaultValue: "Sightline" })}
                  </span>
                  <span className="text-xs uppercase tracking-[0.28em] text-muted-foreground/60">
                    {t("brand.tagline", { defaultValue: "Aim Trainer" })}
                  </span>
                </div>
              </div>

              <h1 className="mb-6 max-w-2xl text-balance text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
                <span className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {t("hero.titlePrimary", { defaultValue: "精准瞄准训练" })}
                </span>
                <br />
                <span className="text-primary">
                  {t("hero.titleAccent", { defaultValue: "就在浏览器中" })}
                </span>
              </h1>

              <p className="mb-10 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground">
                {t("hero.description", {
                  defaultValue:
                    "在 Chrome 桌面版中即时训练甩枪、微调和跟枪。不需要安装，只专注训练。",
                })}
              </p>

              <div className="mb-10 flex flex-col gap-4 sm:flex-row">
                <Button
                  size="lg"
                  onClick={scrollToModes}
                  className={cn(
                    "group relative overflow-hidden px-10 py-6 font-semibold shadow-[0_0_30px_rgba(0,200,200,0.3)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,200,200,0.4)]",
                  )}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {t("hero.chooseMode", { defaultValue: "选择模式" })}
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </Button>

                <Button asChild size="lg" variant="outline" className="px-10 py-6">
                  <Link to="/history">
                    {t("hero.viewHistory", { defaultValue: "查看训练历史" })}
                  </Link>
                </Button>

                <Button size="lg" variant="outline" className="px-10 py-6">
                  <Settings className="h-4 w-4" />
                  {t("hero.settings", { defaultValue: "设置" })}
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/[0.03] px-4 py-1.5 text-muted-foreground backdrop-blur-sm"
                >
                  <Chrome className="h-3.5 w-3.5" />
                  {t("hero.chromeOnly", { defaultValue: "仅支持 Chrome 桌面版" })}
                </Badge>
                <Badge
                  variant="secondary"
                  className="border border-accent/20 bg-accent/10 px-4 py-1.5 text-accent"
                >
                  {t("hero.mvpBadge", { defaultValue: "MVP 浏览器训练器" })}
                </Badge>
              </div>
            </div>
          </GlassCard>

          <div ref={modesRef} id="training-modes" className="scroll-mt-12 grid gap-4 md:grid-cols-3">
            {trainingModes.map((mode, index) => (
              <TrainingModeCard
                key={mode.mode}
                mode={mode.mode}
                title={t(mode.titleKey, { defaultValue: mode.mode })}
                description={t(mode.descriptionKey, { defaultValue: mode.mode })}
                onClick={
                  mode.mode === "grid" ? () => navigate("/training/grid-3x3") : undefined
                }
                onHover={(hovering) => setHoveredCardIndex(hovering ? index : null)}
              />
            ))}
          </div>

          <p className="mt-10 text-center text-xs tracking-wide text-muted-foreground/40">
            {t("hero.footer", { defaultValue: "为竞技玩家打造。为精准表现优化。" })}
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute left-8 top-8 h-20 w-20 border-l border-t border-primary/10" />
      <div className="pointer-events-none absolute right-8 top-8 h-20 w-20 border-r border-t border-primary/10" />
      <div className="pointer-events-none absolute bottom-8 left-8 h-20 w-20 border-b border-l border-primary/10" />
      <div className="pointer-events-none absolute bottom-8 right-8 h-20 w-20 border-b border-r border-primary/10" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-primary/10 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-primary/10 to-transparent" />
    </main>
  );
}
