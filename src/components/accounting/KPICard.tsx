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
  const variantStyles = {
    default: "from-slate-50 to-slate-100 border-slate-200",
    success: "from-emerald-50 to-emerald-100 border-emerald-200",
    warning: "from-amber-50 to-amber-100 border-amber-200",
    danger: "from-red-50 to-red-100 border-red-200",
  };

  const iconColors = {
    default: "text-primary bg-primary/10",
    success: "text-emerald-600 bg-emerald-500/10",
    warning: "text-amber-600 bg-amber-500/10",
    danger: "text-red-600 bg-red-500/10",
  };

  return (
    <Card className={cn(
      "bg-gradient-to-br border-2",
      variantStyles[variant],
      "hover:shadow-soft-xl transition-all duration-300"
    )}>
      <CardContent className="p-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              {title}
            </p>
            <div className="text-4xl font-display font-bold tracking-tight mb-2">
              {value}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className={cn(
                "inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold",
                trend === "up" && "bg-emerald-100 text-emerald-700",
                trend === "down" && "bg-red-100 text-red-700",
                trend === "neutral" && "bg-slate-100 text-slate-700"
              )}>
                {trend === "up" && "↑"}
                {trend === "down" && "↓"}
                {trend === "neutral" && "→"}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className={cn(
            "p-4 rounded-2xl",
            iconColors[variant]
          )}>
            <Icon className="h-7 w-7" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
