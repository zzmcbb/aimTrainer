import type { LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/home/GlassCard";

interface PageStatCardProps {
  compact?: boolean;
  icon: LucideIcon;
  label: string;
  value: string | number;
}

export function PageStatCard({ compact = false, icon: Icon, label, value }: PageStatCardProps) {
  return (
    <GlassCard hover className={compact ? "p-3" : "p-5"}>
      <div className={compact ? "mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary" : "mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"}>
        <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </div>
      <div className={compact ? "text-xl font-bold tracking-tight" : "text-2xl font-bold tracking-tight"}>{value}</div>
      <div className={compact ? "mt-0.5 text-[0.68rem] uppercase leading-tight tracking-wide text-muted-foreground" : "mt-1 text-xs uppercase tracking-wide text-muted-foreground"}>{label}</div>
    </GlassCard>
  );
}
