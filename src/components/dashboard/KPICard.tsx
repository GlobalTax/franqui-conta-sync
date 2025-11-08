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
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {subtitle && (
              <p className="text-xs text-accent font-medium uppercase tracking-wide mb-2">{subtitle}</p>
            )}
            
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {title}
            </p>
            
            <h3 className="text-3xl font-bold mb-3 tracking-tight">
              {formatValue(value)}
            </h3>
            
            {trend !== null && (
              <div className="flex items-center gap-2 text-xs pt-2 border-t border-border/40">
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
          
          <div className="flex flex-col items-end gap-2">
            {Icon && (
              <Icon className="h-5 w-5 text-muted-foreground/50" strokeWidth={1.5} />
            )}
            {actionLabel && onAction && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary-700 font-semibold h-auto p-0"
                onClick={onAction}
              >
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
