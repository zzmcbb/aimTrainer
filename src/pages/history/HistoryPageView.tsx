import { BarChart3, Clock, Crosshair, History } from "lucide-react";
import { GlassCard } from "@/components/home/GlassCard";
import { ParallaxBackground } from "@/components/home/ParallaxBackground";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";
import { TrainingAnalyticsChart } from "@/components/history/TrainingAnalyticsChart";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { PageStatCard } from "@/components/common/PageStatCard";
import { historyPageStyles as styles } from "./historyPage.styles";
import type { HistoryPageViewModel } from "./useHistoryPage";

interface HistoryPageViewProps {
  viewModel: HistoryPageViewModel;
}

export function HistoryPageView({ viewModel }: HistoryPageViewProps) {
  const { t, records, labels, accuracy, scores, bestScore, totalShots, avgReaction } = viewModel;

  return (
    <main className={styles.page}>
      <ParallaxBackground />
      <LanguageSwitcher />

      <div className={styles.content}>
        <PageHeader
          actionLabel={t("actions.backHome", { defaultValue: "返回首页" })}
          badge={(
            <Badge variant="outline" className="mb-4 border-white/10 bg-white/[0.03] px-4 py-1.5 text-muted-foreground backdrop-blur-sm">
              <History className="h-3.5 w-3.5" />
              {t("title", { defaultValue: "训练历史" })}
            </Badge>
          )}
          title={t("analytics.title", { defaultValue: "ECharts 数据分析" })}
          description={t("analytics.subtitle", { defaultValue: "用可视化数据跟踪稳定性、准确率和训练强度。" })}
        />

        <div className={styles.statsGrid}>
          <PageStatCard icon={History} label={t("analytics.sessions", { defaultValue: "训练次数" })} value={records.length} />
          <PageStatCard icon={BarChart3} label={t("analytics.bestScore", { defaultValue: "最高分" })} value={bestScore} />
          <PageStatCard icon={Clock} label={t("analytics.avgReaction", { defaultValue: "平均反应" })} value={`${avgReaction}ms`} />
          <PageStatCard icon={Crosshair} label={t("analytics.totalShots", { defaultValue: "总射击数" })} value={totalShots} />
        </div>

        <div className={styles.mainGrid}>
          <GlassCard intensity="high" className="p-5">
            <TrainingAnalyticsChart
              labels={labels}
              accuracy={accuracy}
              scores={scores}
              accuracyLabel={t("analytics.accuracy", { defaultValue: "命中率趋势" })}
              scoreLabel={t("records.score", { defaultValue: "分数" })}
            />
          </GlassCard>

          <GlassCard intensity="high" className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("records.title", { defaultValue: "训练记录" })}</h2>
              <Badge variant="secondary" className="border border-accent/20 bg-accent/10 text-accent">MVP</Badge>
            </div>

            <div className={styles.tableWrapper}>
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("records.date", { defaultValue: "日期" })}</th>
                    <th className="px-4 py-3">{t("records.mode", { defaultValue: "模式" })}</th>
                    <th className="px-4 py-3 text-right">{t("records.score", { defaultValue: "分数" })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {records.map((record) => (
                    <tr key={record.id} className="transition-colors hover:bg-white/[0.03]">
                      <td className="px-4 py-3 text-muted-foreground">{record.date}</td>
                      <td className="px-4 py-3">{record.mode}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">{record.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.emptyNotice}>
              <p className="text-sm font-medium">{t("empty.title", { defaultValue: "暂无真实训练数据" })}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t("empty.description", { defaultValue: "训练功能接入后，这里会自动读取本地训练记录并生成图表。" })}
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </main>
  );
}
