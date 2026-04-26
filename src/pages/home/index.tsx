import { HomePageView } from "./HomePageView";
import { useHomePage } from "./useHomePage";

export function HomePage() {
  const viewModel = useHomePage();

  return <HomePageView viewModel={viewModel} />;
}
