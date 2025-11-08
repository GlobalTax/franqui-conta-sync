import { Card, CardContent } from "@/components/ui/card";
import { useBankBalance } from "@/hooks/useBankBalance";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface BalanceCardProps {
  accountId: string;
}

export const BalanceCard = ({ accountId }: BalanceCardProps) => {
  const { balance, weeklyData, stats, isLoading } = useBankBalance(accountId);

  if (isLoading) {
    return (
      <Card className="bg-card shadow-sm mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-4 gap-6">
            <Skeleton className="h-20" />
            <Skeleton className="h-20 col-span-2" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const weeklyChange = weeklyData && weeklyData.length > 1
    ? ((weeklyData[weeklyData.length - 1].balance - weeklyData[0].balance) / weeklyData[0].balance) * 100
    : 0;

  return (
    <Card className="bg-card shadow-sm mb-6 border-border/40">
      <CardContent className="p-6">
        <div className="grid grid-cols-4 gap-6">
          {/* Saldo Actual */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
              Saldo Actual
            </p>
            <p className="text-3xl font-bold text-foreground mb-1">
              {formatCurrency(balance || 0)}
            </p>
            <div className="flex items-center gap-1 text-sm">
              {weeklyChange >= 0 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">+{weeklyChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-red-600">{weeklyChange.toFixed(1)}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs semana anterior</span>
            </div>
          </div>

          {/* Mini Chart */}
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Evolución (7 días)
            </p>
            <ResponsiveContainer width="100%" height={60}>
              <LineChart data={weeklyData || []}>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                          <p className="text-xs font-medium">
                            {formatCurrency(payload[0].value as number)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Indicators */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              Estado
            </p>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-400" />
              <span className="text-sm text-foreground">
                {stats?.pending || 0} <span className="text-muted-foreground">pendientes</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm text-foreground">
                {stats?.reconciled || 0} <span className="text-muted-foreground">conciliadas</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm text-foreground">
                {stats?.errors || 0} <span className="text-muted-foreground">discrepancias</span>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
