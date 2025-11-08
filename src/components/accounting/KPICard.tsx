import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "success" | "warning" | "danger";
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = "default",
}: KPICardProps) {
  const iconColors = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {title}
            </p>
            <div className="text-3xl font-bold text-foreground mb-1">
              {value}
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
      </CardContent>
    </Card>
  );
}
