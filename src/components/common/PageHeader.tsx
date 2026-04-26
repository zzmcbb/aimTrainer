import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  actionLabel: string;
  badge?: ReactNode;
  brand?: string;
  description?: string;
  icon?: LucideIcon;
  title: string;
}

export function PageHeader({ actionLabel, badge, brand, description, icon: Icon, title }: PageHeaderProps) {
  return (
    <div className="mb-8 flex items-center justify-between gap-4">
      <div className="min-w-0">
        {badge}
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
              <div className="absolute inset-0 -z-10 rounded-xl bg-primary/20 blur-xl" />
            </div>
          )}
          <div>
            {brand && <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground/60">{brand}</div>}
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{title}</h1>
          </div>
        </div>
        {description && <p className="mt-4 max-w-2xl text-muted-foreground">{description}</p>}
      </div>

      <Button asChild variant="outline" className="shrink-0 bg-black/20">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          {actionLabel}
        </Link>
      </Button>
    </div>
  );
}
