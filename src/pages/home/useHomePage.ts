import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n";

const trainingModes = [
  {
    mode: "grid" as const,
    titleKey: "modes.grid.title",
    descriptionKey: "modes.grid.description",
  },
  {
    mode: "micro" as const,
    titleKey: "modes.micro.title",
    descriptionKey: "modes.micro.description",
  },
  {
    mode: "tracking" as const,
    titleKey: "modes.tracking.title",
    descriptionKey: "modes.tracking.description",
  },
];

export function useHomePage() {
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const modesRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation("home");
  const navigate = useNavigate();
  const scrollToModes = () => {
    modesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };


  return {
    t,
    hoveredCardIndex,
    modesRef,
    trainingModes,
    navigate,
    scrollToModes,
    setHoveredCardIndex,
  };
}

export type HomePageViewModel = ReturnType<typeof useHomePage>;
