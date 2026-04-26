import type { LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/home/GlassCard";

interface PageStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
}

export function PageStatCard({ icon: Icon, label, value }: PageStatCardProps) {
  return (
    <GlassCard hover className="p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </GlassCard>
  );
}
