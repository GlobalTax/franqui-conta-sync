import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface ProgressTableItem {
  name: string;
  amount: number;
  percentage?: number;
  count?: number;
  color?: string;
}

interface ProgressTableProps {
  title: string;
  subtitle?: string;
  items: ProgressTableItem[];
  onViewDetails?: () => void;
  formatValue?: (value: number) => string;
}

export const ProgressTable = ({ 
  title, 
  subtitle, 
  items, 
  onViewDetails,
  formatValue = (v) => `${v.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€`
}: ProgressTableProps) => {
  const maxAmount = Math.max(...items.map(i => i.amount), 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold uppercase">
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {onViewDetails && (
            <Button 
              variant="link" 
              size="sm" 
              onClick={onViewDetails}
              className="text-primary"
            >
              VER DETALLE <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.name}</span>
                  {item.count !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      ({item.count} facturas)
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold">
                  {formatValue(item.amount)}
                </span>
              </div>
              
              {/* Barra de progreso visual */}
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.color || "bg-gradient-to-r from-primary to-primary/60"
                  }`}
                  style={{ width: `${(item.amount / maxAmount) * 100}%` }}
                />
              </div>
              
              {item.percentage !== undefined && (
                <div className="text-xs text-muted-foreground mt-1">
                  {item.percentage.toFixed(1)}% del total
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
