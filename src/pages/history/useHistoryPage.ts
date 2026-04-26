import { useTranslation } from "@/i18n";
import { trainingRecords } from "./historyRecords";

export function useHistoryPage() {
  const { t } = useTranslation("history");
  const labels = trainingRecords.map((record) => record.date);
  const scores = trainingRecords.map((record) => record.score);
  const accuracy = trainingRecords.map((record) => record.accuracy);
  const bestScore = Math.max(...scores);
  const totalShots = trainingRecords.reduce((total, record) => total + record.shots, 0);
  const avgReaction = Math.round(
    trainingRecords.reduce((total, record) => total + record.reaction, 0) / trainingRecords.length,
  );

  return {
    t,
    records: trainingRecords,
    labels,
    scores,
    accuracy,
    bestScore,
    totalShots,
    avgReaction,
  };
}

export type HistoryPageViewModel = ReturnType<typeof useHistoryPage>;
