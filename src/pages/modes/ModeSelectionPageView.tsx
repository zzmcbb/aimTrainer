import { Crosshair } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ParallaxBackground } from "@/components/home/ParallaxBackground";
import { TrainingModeCard } from "@/components/home/TrainingModeCard";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";
import { modeSelectionPageStyles as styles } from "./modeSelectionPage.styles";
import type { ModeSelectionPageViewModel } from "./useModeSelectionPage";

interface ModeSelectionPageViewProps {
  viewModel: ModeSelectionPageViewModel;
}

export function ModeSelectionPageView({ viewModel }: ModeSelectionPageViewProps) {
  const { t, hoveredCardIndex, trainingModes, navigate, setHoveredCardIndex } = viewModel;

  return (
    <main className={styles.page}>
      <ParallaxBackground intensityBoost={hoveredCardIndex !== null ? 1 : 0} />
      <LanguageSwitcher />

      <div className={styles.content}>
        <PageHeader
          actionLabel={t("actions.backHome", { defaultValue: "返回首页" })}
          brand={t("brand.name", { defaultValue: "Sightline" })}
          description={t("modeSelection.description", {
            defaultValue: "选择一种训练模式，针对不同瞄准能力进行专项练习。",
          })}
          icon={Crosshair}
          title={t("modeSelection.title", { defaultValue: "选择训练模式" })}
        />

        <div className={styles.modesGrid}>
          {trainingModes.map((mode, index) => (
            <TrainingModeCard
              key={mode.mode}
              mode={mode.mode}
              title={t(mode.titleKey, { defaultValue: mode.mode })}
              description={t(mode.descriptionKey, { defaultValue: mode.mode })}
              onClick={mode.path ? () => navigate(mode.path) : undefined}
              onHover={(hovering) => setHoveredCardIndex(hovering ? index : null)}
            />
          ))}
        </div>

        <p className={styles.footer}>
          {t("hero.footer", { defaultValue: "为竞技玩家打造。为精准表现优化。" })}
        </p>
      </div>
    </main>
  );
}
