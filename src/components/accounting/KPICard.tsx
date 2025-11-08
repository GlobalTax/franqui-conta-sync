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
    <Card className="hover:shadow-minimal-md transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <Icon className={cn("h-6 w-6", iconColors[variant])} strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <div className="text-3xl font-semibold tracking-tight">
            {value}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className="flex items-center gap-1.5 text-sm">
              {trend === "up" && (
                <span className="text-success font-medium">↑ {trendValue}</span>
              )}
              {trend === "down" && (
                <span className="text-destructive font-medium">↓ {trendValue}</span>
              )}
              {trend === "neutral" && (
                <span className="text-muted-foreground font-medium">→ {trendValue}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
