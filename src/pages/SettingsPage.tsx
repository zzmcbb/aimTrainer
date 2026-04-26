import { useEffect } from "react";
import { ArrowLeft, Crosshair } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/home/GlassCard";
import { ParallaxBackground } from "@/components/home/ParallaxBackground";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

export function SettingsPage() {
  const { t } = useTranslation("settings");
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) {
        return;
      }

      event.preventDefault();
      navigate("/");
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <ParallaxBackground intensityBoost={0.45} />

      <div className="relative z-10 mx-auto flex h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <div className="mb-4 flex shrink-0 items-center justify-between gap-4 sm:mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Crosshair className="h-6 w-6" />
              <div className="absolute inset-0 -z-10 rounded-xl bg-primary/20 blur-xl" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground/60">
                {t("page.brand", { defaultValue: "Sightline" })}
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                {t("page.title", { defaultValue: "设置" })}
              </h1>
            </div>
          </div>

          <Button asChild variant="outline" className="bg-black/20">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              {t("actions.backHome", { defaultValue: "返回首页" })}
            </Link>
          </Button>
        </div>

        <GlassCard intensity="high" className="min-h-0 flex-1 p-2 sm:p-3">
          <SettingsPanel />
        </GlassCard>
      </div>
    </main>
  );
}
