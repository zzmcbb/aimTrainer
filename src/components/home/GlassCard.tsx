import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  intensity?: "normal" | "high";
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function GlassCard({
  children,
  className,
  hover = false,
  intensity = "normal",
  onClick,
  onMouseEnter,
  onMouseLeave,
}: GlassCardProps) {
  const isHigh = intensity === "high";

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/[0.08]",
        isHigh ? "bg-white/[0.03] backdrop-blur-2xl" : "bg-white/[0.02] backdrop-blur-xl",
        isHigh
          ? "shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_80px_rgba(0,200,200,0.03),inset_0_1px_0_rgba(255,255,255,0.05)]"
          : "shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]",
        hover && [
          "transition-all duration-500 ease-out",
          "hover:-translate-y-1",
          "hover:border-white/[0.12]",
          "hover:bg-white/[0.04]",
          "hover:shadow-[0_12px_50px_rgba(0,0,0,0.6),0_0_100px_rgba(0,200,200,0.06),inset_0_1px_0_rgba(255,255,255,0.08)]",
        ],
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent" />
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.04] via-transparent to-transparent pointer-events-none" />
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 60%)",
        }}
      />
      <div className="absolute left-0 top-0 h-6 w-6 rounded-tl-2xl border-l border-t border-primary/20" />
      <div className="absolute right-0 top-0 h-6 w-6 rounded-tr-2xl border-r border-t border-primary/20" />
      <div className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-2xl border-b border-l border-primary/10" />
      <div className="absolute bottom-0 right-0 h-6 w-6 rounded-br-2xl border-b border-r border-primary/10" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
