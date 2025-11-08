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
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {title}
              </p>
            </div>
            
            {subtitle && (
              <p className="text-xs text-primary mb-2">{subtitle}</p>
            )}
            
            <h3 className="text-3xl font-bold mb-2">
              {formatValue(value)}
            </h3>
            
            {trend !== null && (
              <div className="flex items-center gap-2 text-sm">
                {isPositive ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-success font-medium">
                      +{trend.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    <span className="text-destructive font-medium">
                      {trend.toFixed(1)}%
                    </span>
                  </>
                )}
                <span className="text-muted-foreground">vs año anterior</span>
              </div>
            )}
          </div>
          
          {actionLabel && onAction && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary-700 font-medium"
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
