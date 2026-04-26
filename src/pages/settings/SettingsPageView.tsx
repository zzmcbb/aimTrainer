import { Crosshair } from "lucide-react";
import { GlassCard } from "@/components/home/GlassCard";
import { ParallaxBackground } from "@/components/home/ParallaxBackground";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { PageHeader } from "@/components/common/PageHeader";
import { settingsPageStyles as styles } from "./settingsPage.styles";
import type { SettingsPageViewModel } from "./useSettingsPage";

interface SettingsPageViewProps {
  viewModel: SettingsPageViewModel;
}

export function SettingsPageView({ viewModel }: SettingsPageViewProps) {
  const { t } = viewModel;

  return (
    <main className={styles.page}>
      <ParallaxBackground intensityBoost={0.45} />

      <div className={styles.content}>
        <div className={styles.headerWrapper}>
          <PageHeader
            actionLabel={t("actions.backHome", { defaultValue: "返回首页" })}
            brand={t("page.brand", { defaultValue: "Sightline" })}
            icon={Crosshair}
            title={t("page.title", { defaultValue: "设置" })}
          />
        </div>

        <GlassCard intensity="high" className={styles.panelCard}>
          <SettingsPanel />
        </GlassCard>
      </div>
    </main>
  );
}
