import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  subtitle?: string;
  value: number;
  previousValue?: number;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  format?: "currency" | "number" | "percentage";
}

export const KPICard = ({
  title,
  subtitle,
  value,
  previousValue,
  icon: Icon,
  actionLabel,
  onAction,
  format = "currency",
}: KPICardProps) => {
  const formatValue = (val: number) => {
    if (format === "currency") {
      return `${val.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`;
    }
    if (format === "percentage") {
      return `${val.toFixed(1)}%`;
    }
    return val.toLocaleString("es-ES");
  };

  const calculateTrend = () => {
    if (previousValue === undefined || previousValue === 0) return null;
    return ((value - previousValue) / previousValue) * 100;
  };

  const trend = calculateTrend();
  const isPositive = trend !== null && trend >= 0;

  return (
    <Card>
      <CardContent className="p-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-6">
              {Icon && (
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" strokeWidth={2} />
                </div>
              )}
            </div>
            
            {subtitle && (
              <p className="text-xs text-accent font-semibold uppercase tracking-wider mb-3">{subtitle}</p>
            )}
            
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {title}
            </p>
            
            <h3 className="text-4xl font-bold mb-4 tracking-tight">
              {formatValue(value)}
            </h3>
            
            {trend !== null && (
              <div className="flex items-center gap-2 text-sm pt-2">
                {isPositive ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-success font-semibold">
                      +{trend.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    <span className="text-destructive font-semibold">
                      {trend.toFixed(1)}%
                    </span>
                  </>
                )}
                <span className="text-muted-foreground font-medium">vs año anterior</span>
              </div>
            )}
          </div>
          
          {actionLabel && onAction && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary-700 font-semibold"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
