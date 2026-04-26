import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/i18n";
import {
  knownTrainingModes,
  readTrainingRecords,
  type TrainingHistoryRecord,
  type TrainingModeId,
} from "./historyRecords";

type SelectedModeId = "all" | TrainingModeId;

interface DateRangeFilter {
  endDate: string;
  startDate: string;
}

const defaultStartDate = "1999-01-01";

function getTodayDateValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const defaultDateRange: DateRangeFilter = {
  endDate: getTodayDateValue(),
  startDate: defaultStartDate,
};

const formatDateTime = (dateValue: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));

const emptyStats = {
  bestScore: 0,
  bestHits: 0,
  avgReaction: 0,
  totalHits: 0,
  sessions: 0,
};

function isInDateRange(record: TrainingHistoryRecord, { endDate, startDate }: DateRangeFilter) {
  const completedAt = new Date(record.completedAt).getTime();

  if (startDate && completedAt < new Date(`${startDate}T00:00:00`).getTime()) {
    return false;
  }

  if (endDate && completedAt > new Date(`${endDate}T23:59:59.999`).getTime()) {
    return false;
  }

  return true;
}

export function useHistoryPage() {
  const { t } = useTranslation("history");
  const [records] = useState(() => readTrainingRecords());
  const [selectedModeId, setSelectedModeId] = useState<SelectedModeId>("all");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(records[0]?.id ?? null);
  const [dateRange, setDateRange] = useState<DateRangeFilter>(defaultDateRange);
  const [recordPage, setRecordPage] = useState(1);
  const [recordPageSize, setRecordPageSize] = useState(5);
  const getModeName = (record: Pick<TrainingHistoryRecord, "modeId" | "modeName">) =>
    t(`modeNames.${record.modeId}`, { defaultValue: record.modeName });

  const modeTabs = useMemo(() => {
    const recordModes = records.map((record) => ({ id: record.modeId, name: record.modeName }));
    const modes = [...knownTrainingModes, ...recordModes];
    const uniqueModes = new Map<TrainingModeId, { id: TrainingModeId; name: string }>();

    modes.forEach((mode) => uniqueModes.set(mode.id, mode));

    return [
      {
        id: "all" as const,
        name: t("modes.all", { defaultValue: "全部" }),
        count: records.length,
      },
      ...Array.from(uniqueModes.values()).map((mode) => ({
        id: mode.id,
        name: t(`modeNames.${mode.id}`, { defaultValue: mode.name }),
        count: records.filter((record) => record.modeId === mode.id).length,
      })),
    ];
  }, [records, t]);

  const modeRecords = useMemo(
    () => selectedModeId === "all" ? records : records.filter((record) => record.modeId === selectedModeId),
    [records, selectedModeId],
  );
  const trendRecords = useMemo(
    () => modeRecords.filter((record) => isInDateRange(record, dateRange)),
    [dateRange, modeRecords],
  );
  const filteredRecords = useMemo(
    () => records.filter((record) => isInDateRange(record, dateRange)),
    [dateRange, records],
  );
  const recordPageCount = Math.max(1, Math.ceil(filteredRecords.length / recordPageSize));
  const currentRecordPage = Math.min(recordPage, recordPageCount);
  const paginatedRecords = filteredRecords.slice(
    (currentRecordPage - 1) * recordPageSize,
    currentRecordPage * recordPageSize,
  );
  const selectedRecord = useMemo<TrainingHistoryRecord | null>(
    () =>
      filteredRecords.find((record) => record.id === selectedRecordId) ??
      filteredRecords[0] ??
      null,
    [filteredRecords, selectedRecordId],
  );
  const trendChartData = useMemo(
    () => ({
      labels: trendRecords.map((record) => formatDateTime(record.completedAt)).reverse(),
      scores: trendRecords.map((record) => record.score).reverse(),
      accuracy: trendRecords.map((record) => record.accuracy).reverse(),
    }),
    [trendRecords],
  );
  const stats = modeRecords.length
    ? {
      bestScore: Math.max(...modeRecords.map((record) => record.score)),
      bestHits: Math.max(...modeRecords.map((record) => record.hits)),
      avgReaction: Math.round(
        modeRecords.reduce((total, record) => total + record.averageReactionMs, 0) / modeRecords.length,
      ),
      totalHits: modeRecords.reduce((total, record) => total + record.hits, 0),
      sessions: modeRecords.length,
    }
    : emptyStats;
  const selectedModeName =
    modeTabs.find((mode) => mode.id === selectedModeId)?.name ?? t("modes.unknown", { defaultValue: "未知模式" });
  const selectMode = (modeId: SelectedModeId) => {
    const nextRecord = modeId === "all"
      ? records[0]
      : records.find((record) => record.modeId === modeId);

    setSelectedModeId(modeId);
    setSelectedRecordId(nextRecord?.id ?? null);
  };
  const selectRecord = (record: TrainingHistoryRecord) => {
    setSelectedRecordId(record.id);
  };
  const updateDateRange = (partial: Partial<DateRangeFilter>) => {
    setDateRange((current) => ({ ...current, ...partial }));
    setRecordPage(1);
  };
  const updateRecordPageSize = (pageSize: number) => {
    setRecordPageSize(pageSize);
    setRecordPage(1);
  };

  useEffect(() => {
    setRecordPage((current) => Math.min(current, recordPageCount));
  }, [recordPageCount]);

  useEffect(() => {
    if (!selectedRecordId || !filteredRecords.some((record) => record.id === selectedRecordId)) {
      setSelectedRecordId(filteredRecords[0]?.id ?? null);
    }
  }, [filteredRecords, selectedRecordId]);

  return {
    t,
    records,
    filteredRecords,
    modeTabs,
    modeRecords,
    paginatedRecords,
    recordPage: currentRecordPage,
    recordPageCount,
    recordPageSize,
    selectedModeId,
    selectedModeName,
    selectedRecord,
    labels: trendChartData.labels,
    scores: trendChartData.scores,
    accuracy: trendChartData.accuracy,
    stats,
    trendRecords,
    dateRange,
    formatDateTime,
    getModeName,
    selectMode,
    selectRecord,
    setRecordPage,
    updateDateRange,
    updateRecordPageSize,
  };
}

export type HistoryPageViewModel = ReturnType<typeof useHistoryPage>;
