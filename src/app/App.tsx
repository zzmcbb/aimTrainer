import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { HomePage } from "@/pages/home";

const ModeSelectionPage = lazy(() =>
  import("@/pages/modes").then((module) => ({ default: module.ModeSelectionPage })),
);
const HistoryPage = lazy(() =>
  import("@/pages/history").then((module) => ({ default: module.HistoryPage })),
);
const TrainingPage = lazy(() =>
  import("@/pages/training").then((module) => ({ default: module.TrainingPage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/settings").then((module) => ({ default: module.SettingsPage })),
);
const SoundEditorPage = lazy(() =>
  import("@/pages/settings/SoundEditorPage").then((module) => ({ default: module.SoundEditorPage })),
);

export function App() {
  const location = useLocation();

  return (
    <Suspense fallback={null}>
      <div key={location.pathname} className="route-transition">
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/modes" element={<ModeSelectionPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/sounds/editor/:assetId" element={<SoundEditorPage />} />
          <Route path="/training/grid-3x3" element={<TrainingPage />} />
        </Routes>
      </div>
    </Suspense>
  );
}
