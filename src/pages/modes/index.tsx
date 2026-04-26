import { ModeSelectionPageView } from "./ModeSelectionPageView";
import { useModeSelectionPage } from "./useModeSelectionPage";

export function ModeSelectionPage() {
  const viewModel = useModeSelectionPage();

  return <ModeSelectionPageView viewModel={viewModel} />;
}
