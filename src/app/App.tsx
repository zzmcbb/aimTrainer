import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";

const HistoryPage = lazy(() =>
  import("@/pages/HistoryPage").then((module) => ({ default: module.HistoryPage })),
);
const TrainingPage = lazy(() =>
  import("@/pages/TrainingPage").then((module) => ({ default: module.TrainingPage })),
);

export function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/training/grid-3x3" element={<TrainingPage />} />
      </Routes>
    </Suspense>
  );
}
