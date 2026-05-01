import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n";

const trainingModes = [
  {
    mode: "grid" as const,
    path: "/training/grid-3x3",
    titleKey: "modes.grid.title",
    descriptionKey: "modes.grid.description",
  },
  {
    mode: "micro" as const,
    path: "/training/micro-adjustment",
    titleKey: "modes.micro.title",
    descriptionKey: "modes.micro.description",
  },
  {
    mode: "tracking" as const,
    path: "/training/tracking",
    titleKey: "modes.tracking.title",
    descriptionKey: "modes.tracking.description",
  },
];

export function useModeSelectionPage() {
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const { t } = useTranslation("home");
  const navigate = useNavigate();

  return {
    t,
    hoveredCardIndex,
    trainingModes,
    navigate,
    setHoveredCardIndex,
  };
}

export type ModeSelectionPageViewModel = ReturnType<typeof useModeSelectionPage>;
