import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { HomePage } from "@/pages/home";

const HistoryPage = lazy(() =>
  import("@/pages/history").then((module) => ({ default: module.HistoryPage })),
);
const TrainingPage = lazy(() =>
  import("@/pages/training").then((module) => ({ default: module.TrainingPage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/settings").then((module) => ({ default: module.SettingsPage })),
);

export function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/training/grid-3x3" element={<TrainingPage />} />
      </Routes>
    </Suspense>
  );
}
