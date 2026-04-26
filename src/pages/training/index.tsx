import { TrainingPageView } from "./TrainingPageView";
import { useGrid3x3Training } from "./useGrid3x3Training";

export function TrainingPage() {
  const viewModel = useGrid3x3Training();

  return <TrainingPageView viewModel={viewModel} />;
}
