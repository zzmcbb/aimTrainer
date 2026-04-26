import { SettingsPageView } from "./SettingsPageView";
import { useSettingsPage } from "./useSettingsPage";

export function SettingsPage() {
  const viewModel = useSettingsPage();

  return <SettingsPageView viewModel={viewModel} />;
}
