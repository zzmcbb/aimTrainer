import { HistoryPageView } from "./HistoryPageView";
import { useHistoryPage } from "./useHistoryPage";

export function HistoryPage() {
  const viewModel = useHistoryPage();

  return <HistoryPageView viewModel={viewModel} />;
}
