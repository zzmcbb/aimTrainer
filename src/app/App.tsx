import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";

const HistoryPage = lazy(() =>
  import("@/pages/HistoryPage").then((module) => ({ default: module.HistoryPage })),
);

export function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </Suspense>
  );
}
