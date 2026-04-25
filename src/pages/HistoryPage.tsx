import { ArrowLeft, BarChart3, Clock, Crosshair, History } from "lucide-react";
import { Link } from "react-router-dom";
import { GlassCard } from "@/components/home/GlassCard";
import { ParallaxBackground } from "@/components/home/ParallaxBackground";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";
import { TrainingAnalyticsChart } from "@/components/history/TrainingAnalyticsChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

const trainingRecords = [
  {
    id: "session-001",
    date: "04/26",
    mode: "Grid 3x3",
    score: 842,
    accuracy: 72,
    reaction: 284,
    shots: 126,
  },
  {
    id: "session-002",
    date: "04/27",
    mode: "Micro Adjustment",
    score: 910,
    accuracy: 78,
    reaction: 260,
    shots: 118,
  },
  {
    id: "session-003",
    date: "04/28",
    mode: "Tracking",
    score: 965,
    accuracy: 81,
    reaction: 248,
    shots: 142,
  },
  {
    id: "session-004",
    date: "04/29",
    mode: "Grid 3x3",
    score: 1030,
    accuracy: 84,
    reaction: 235,
    shots: 151,
  },
];

export function HistoryPage() {
  const { t } = useTranslation("history");
  const labels = trainingRecords.map((record) => record.date);
  const scores = trainingRecords.map((record) => record.score);
  const accuracy = trainingRecords.map((record) => record.accuracy);
  const bestScore = Math.max(...scores);
  const totalShots = trainingRecords.reduce((total, record) => total + record.shots, 0);
  const avgReaction = Math.round(
    trainingRecords.reduce((total, record) => total + record.reaction, 0) /
      trainingRecords.length,
  );

  return (
    <main className="relative min-h-screen overflow-hidden">
      <ParallaxBackground />
      <LanguageSwitcher />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-20">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Badge
              variant="outline"
              className="mb-4 border-white/10 bg-white/[0.03] px-4 py-1.5 text-muted-foreground backdrop-blur-sm"
            >
              <History className="h-3.5 w-3.5" />
              {t("title", { defaultValue: "训练历史" })}
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              {t("analytics.title", { defaultValue: "ECharts 数据分析" })}
            </h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              {t("analytics.subtitle", {
                defaultValue: "用可视化数据跟踪稳定性、准确率和训练强度。",
              })}
            </p>
          </div>

          <Button asChild variant="outline" className="shrink-0">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              {t("actions.backHome", { defaultValue: "返回首页" })}
            </Link>
          </Button>
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-4">
          <StatCard
            icon={History}
            label={t("analytics.sessions", { defaultValue: "训练次数" })}
            value={trainingRecords.length}
          />
          <StatCard
            icon={BarChart3}
            label={t("analytics.bestScore", { defaultValue: "最高分" })}
            value={bestScore}
          />
          <StatCard
            icon={Clock}
            label={t("analytics.avgReaction", { defaultValue: "平均反应" })}
            value={`${avgReaction}ms`}
          />
          <StatCard
            icon={Crosshair}
            label={t("analytics.totalShots", { defaultValue: "总射击数" })}
            value={totalShots}
          />
        </div>

        <div className="grid flex-1 gap-5 lg:grid-cols-[1.35fr_1fr]">
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
              <h2 className="text-lg font-semibold">
                {t("records.title", { defaultValue: "训练记录" })}
              </h2>
              <Badge variant="secondary" className="border border-accent/20 bg-accent/10 text-accent">
                MVP
              </Badge>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("records.date", { defaultValue: "日期" })}</th>
                    <th className="px-4 py-3">{t("records.mode", { defaultValue: "模式" })}</th>
                    <th className="px-4 py-3 text-right">
                      {t("records.score", { defaultValue: "分数" })}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {trainingRecords.map((record) => (
                    <tr key={record.id} className="transition-colors hover:bg-white/[0.03]">
                      <td className="px-4 py-3 text-muted-foreground">{record.date}</td>
                      <td className="px-4 py-3">{record.mode}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">
                        {record.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4">
              <p className="text-sm font-medium">{t("empty.title", { defaultValue: "暂无真实训练数据" })}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t("empty.description", {
                  defaultValue: "训练功能接入后，这里会自动读取本地训练记录并生成图表。",
                })}
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </main>
  );
}

interface StatCardProps {
  icon: typeof History;
  label: string;
  value: string | number;
}

function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <GlassCard hover className="p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </GlassCard>
  );
}
