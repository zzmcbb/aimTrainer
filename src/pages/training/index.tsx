import { useLocation } from "react-router-dom";
import type { TrainingModeId } from "@/pages/history/historyRecords";
import { TrainingPageView } from "./TrainingPageView";
import { useGrid3x3Training } from "./useGrid3x3Training";

const routeModeMap: Record<string, TrainingModeId> = {
  "/training/grid-3x3": "grid-3x3",
  "/training/micro-adjustment": "micro-adjustment",
  "/training/tracking": "tracking",
};

export function TrainingPage() {
  const location = useLocation();
  const viewModel = useGrid3x3Training(routeModeMap[location.pathname] ?? "grid-3x3");

  return <TrainingPageView viewModel={viewModel} />;
}
