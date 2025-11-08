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
      <CardContent className="p-8">
        <div className="flex items-start justify-between mb-6">
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl",
            variant === "success" && "bg-success/10",
            variant === "warning" && "bg-warning/10",
            variant === "danger" && "bg-destructive/10",
            variant === "default" && "bg-primary/10"
          )}>
            <Icon className={cn("h-6 w-6", iconColors[variant])} strokeWidth={2} />
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <div className="text-4xl font-bold tracking-tight text-foreground">
            {value}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground font-medium">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className="flex items-center gap-2 text-sm pt-2">
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
      </CardContent>
    </Card>
  );
}
