import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "success" | "warning" | "danger" | "error";
  format?: "currency" | "number" | "percentage";
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = "default",
  format = "number",
}: KPICardProps) {
  const iconColors = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    error: "text-destructive",
  };

  const formatValue = (val: string | number) => {
    if (typeof val === "string") return val;
    if (format === "currency") {
      return `${val.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`;
    }
    if (format === "percentage") {
      return `${val.toFixed(1)}%`;
    }
    return val.toLocaleString("es-ES");
  };

  return (
    <div className="border border-border/40 rounded-lg bg-card/30 transition-colors hover:border-border p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {title}
          </p>
          <div className="text-3xl font-bold text-foreground mb-1">
            {formatValue(value)}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <Icon className={cn("h-5 w-5", iconColors[variant])} strokeWidth={1.5} />
      </div>
      
      {trend && trendValue && (
        <div className="flex items-center gap-2 text-xs pt-2 border-t border-border/40">
          {trend === "up" && (
            <span className="text-success font-semibold flex items-center gap-1">
              ↑ {trendValue}
            </span>
          )}
          {trend === "down" && (
            <span className="text-destructive font-semibold flex items-center gap-1">
              ↓ {trendValue}
            </span>
          )}
          {trend === "neutral" && (
            <span className="text-muted-foreground font-semibold flex items-center gap-1">
              → {trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
