import { useState } from "react";
import { Grid3X3, Move, Target } from "lucide-react";
import { GlassCard } from "@/components/home/GlassCard";
import { cn } from "@/lib/utils";

type Mode = "grid" | "micro" | "tracking";

interface TrainingModeCardProps {
  mode: Mode;
  title: string;
  description: string;
  onClick?: () => void;
  onHover: (hovering: boolean) => void;
}

const icons = {
  grid: Grid3X3,
  micro: Move,
  tracking: Target,
} as const;

export function TrainingModeCard({
  mode,
  title,
  description,
  onClick,
  onHover,
}: TrainingModeCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = icons[mode];

  return (
    <GlassCard
      hover
      className={cn("group", onClick ? "cursor-pointer" : "cursor-default")}
      onClick={onClick}
      onMouseEnter={() => {
        setIsHovered(true);
        onHover(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onHover(false);
      }}
    >
      <div className="relative p-6">
        <div className="mb-4 flex items-center gap-3">
          <div
            className={cn(
              "relative flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all duration-500",
              "group-hover:bg-primary/20 group-hover:shadow-[0_0_20px_rgba(0,200,200,0.2)]",
            )}
          >
            <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            <div
              className={cn(
                "absolute inset-0 rounded-lg bg-primary/20 blur-md transition-opacity duration-500",
                isHovered ? "opacity-100" : "opacity-0",
              )}
            />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>

        <div className="absolute bottom-0 left-6 right-6 h-px overflow-hidden">
          <div
            className={cn(
              "h-full bg-gradient-to-r from-transparent via-primary/50 to-transparent transition-transform duration-500",
              isHovered ? "translate-x-0" : "-translate-x-full",
            )}
          />
        </div>

        <div
          className={cn(
            "absolute -inset-4 -z-10 rounded-2xl bg-primary/5 blur-2xl transition-opacity duration-700",
            isHovered ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
    </GlassCard>
  );
}
