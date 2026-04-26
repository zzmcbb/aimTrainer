const storageKey = "aim-trainer:training-history:v1";
const maxStoredRecords = 200;

export type TrainingModeId = "grid-3x3" | "micro-adjustment" | "tracking";

export interface TrainingTimelinePoint {
  second: string;
  accuracy: number;
  hits: number;
  averageReaction: number;
}

export interface TrainingHistoryRecord {
  id: string;
  modeId: TrainingModeId;
  modeName: string;
  completedAt: string;
  durationSeconds: number;
  score: number;
  hits: number;
  misses: number;
  shots: number;
  accuracy: number;
  averageReactionMs: number;
  timeline: TrainingTimelinePoint[];
}

export interface CreateTrainingHistoryRecordInput {
  modeId: TrainingModeId;
  modeName: string;
  durationSeconds: number;
  hits: number;
  misses: number;
  averageReactionMs: number;
  timeline: TrainingTimelinePoint[];
}

export const knownTrainingModes: Array<{ id: TrainingModeId; name: string }> = [
  { id: "grid-3x3", name: "Grid 3x3" },
  { id: "micro-adjustment", name: "Micro Adjustment" },
  { id: "tracking", name: "Tracking" },
];

export function calculateTrainingScore({
  accuracy,
  averageReactionMs,
  durationSeconds,
  hits,
}: {
  accuracy: number;
  averageReactionMs: number;
  durationSeconds: number;
  hits: number;
}) {
  if (hits <= 0) {
    return 0;
  }

  const durationFactor = Math.max(1, durationSeconds / 60);
  const speedBonus = averageReactionMs > 0 ? Math.max(0, 450 - averageReactionMs) * 1.5 : 0;

  return Math.round((hits * 100 + accuracy * 8 + speedBonus) / durationFactor);
}

export function createTrainingHistoryRecord(input: CreateTrainingHistoryRecordInput): TrainingHistoryRecord {
  const shots = input.hits + input.misses;
  const accuracy = shots > 0 ? Math.round((input.hits / shots) * 100) : 0;

  return {
    id: `session-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    modeId: input.modeId,
    modeName: input.modeName,
    completedAt: new Date().toISOString(),
    durationSeconds: input.durationSeconds,
    score: calculateTrainingScore({
      accuracy,
      averageReactionMs: input.averageReactionMs,
      durationSeconds: input.durationSeconds,
      hits: input.hits,
    }),
    hits: input.hits,
    misses: input.misses,
    shots,
    accuracy,
    averageReactionMs: input.averageReactionMs,
    timeline: input.timeline,
  };
}

export function readTrainingRecords(): TrainingHistoryRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawRecords = window.localStorage.getItem(storageKey);
    if (!rawRecords) {
      return [];
    }

    const parsedRecords = JSON.parse(rawRecords);
    if (!Array.isArray(parsedRecords)) {
      return [];
    }

    return parsedRecords
      .filter(isTrainingHistoryRecord)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  } catch {
    return [];
  }
}

export function saveTrainingRecord(record: TrainingHistoryRecord) {
  if (typeof window === "undefined") {
    return;
  }

  const records = [record, ...readTrainingRecords()].slice(0, maxStoredRecords);
  window.localStorage.setItem(storageKey, JSON.stringify(records));
}

function isTrainingHistoryRecord(value: unknown): value is TrainingHistoryRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<TrainingHistoryRecord>;

  return (
    typeof record.id === "string" &&
    typeof record.modeId === "string" &&
    typeof record.modeName === "string" &&
    typeof record.completedAt === "string" &&
    typeof record.durationSeconds === "number" &&
    typeof record.score === "number" &&
    typeof record.hits === "number" &&
    typeof record.misses === "number" &&
    typeof record.shots === "number" &&
    typeof record.accuracy === "number" &&
    typeof record.averageReactionMs === "number" &&
    Array.isArray(record.timeline)
  );
}
