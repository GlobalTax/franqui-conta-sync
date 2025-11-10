import { TrendingUp, TrendingDown } from "lucide-react";
import type { PLReportLine } from "@/types/profit-loss";

interface PLTableMultiYearProps {
  yearQueries: Array<{
    data?: { plData: PLReportLine[] } | null;
    isLoading: boolean;
  }>;
  compareYears: number[];
  isQSRTemplate: boolean;
  onRubricClick?: (rubricCode: string, rubricName: string, year: number) => void;
}

export function PLTableMultiYear({ yearQueries, compareYears, isQSRTemplate, onRubricClick }: PLTableMultiYearProps) {
  if (yearQueries.some(q => !q.data?.plData?.length)) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay datos para algunos años seleccionados.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="space-y-1">
        {/* Header de años */}
        <div className="flex items-center justify-between py-3 px-4 bg-muted font-semibold sticky top-0 z-10">
          <div className="flex items-center gap-3 flex-1">
            <span className="font-mono text-xs w-8">#</span>
            <span>Concepto</span>
          </div>
          <div className="flex items-center gap-4">
            {compareYears.map((year) => (
              <div key={year} className="flex items-center gap-2">
                <span className="text-sm w-28 text-right">{year} €</span>
                <span className="text-sm w-16 text-right">%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filas de datos */}
        {yearQueries[0]?.data?.plData?.map((baseLine, idx) => {
          const linesByYear = yearQueries.map(q => 
            q.data?.plData?.find(l => l.rubric_code === baseLine.rubric_code)
          );

          return (
            <div
              key={`${baseLine.rubric_code}-${idx}`}
              className={`flex items-center justify-between py-3 px-4 ${
                baseLine.is_total
                  ? "bg-muted/50 font-semibold"
                  : "hover:bg-accent/30"
              } ${
                baseLine.rubric_code === 'resultado_neto' || baseLine.rubric_code === 'net_result'
                  ? "bg-primary/5 border-t-2 border-primary mt-2"
                  : ""
              } ${
                baseLine.level === 1
                  ? "bg-muted/80 font-bold text-base"
                  : baseLine.level === 2
                  ? "bg-muted/40 font-semibold"
                  : ""
              } ${
                !baseLine.is_total && onRubricClick
                  ? "cursor-pointer hover:bg-muted/60 transition-colors"
                  : ""
              } transition-colors duration-150`}
              onClick={() => {
                if (!baseLine.is_total && onRubricClick) {
                  onRubricClick(baseLine.rubric_code, baseLine.rubric_name, compareYears[0]);
                }
              }}
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="font-mono text-xs text-muted-foreground w-8">
                  {baseLine.sort}
                </span>
                <span
                  className={`${
                    baseLine.level === 1
                      ? "font-bold text-base"
                      : baseLine.level === 2
                      ? "font-semibold ml-4"
                      : baseLine.level === 3
                      ? "ml-8"
                      : "ml-12"
                  }`}
                >
                  {baseLine.rubric_name}
                </span>
              </div>
              <div className="flex items-center gap-4">
                {linesByYear.map((line, yearIdx) => {
                  const amount = line?.amount || 0;
                  const percentage = line?.percentage || 0;
                  const isNegative = amount < 0;
                  const isResult = line?.rubric_code === 'resultado_neto' || line?.rubric_code === 'net_result';

                  return (
                    <div key={yearIdx} className="flex items-center gap-2">
                      <span
                        className={`text-sm w-28 text-right tabular-nums ${
                          isResult
                            ? amount >= 0
                              ? "text-success font-bold"
                              : "text-destructive font-bold"
                            : isNegative
                            ? "text-destructive"
                            : ""
                        }`}
                      >
                        {amount.toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span
                        className={`text-sm w-16 text-right tabular-nums text-muted-foreground ${
                          Math.abs(percentage) > 100 ? "text-warning" : ""
                        }`}
                      >
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Fila de comparación año sobre año (solo si es QSR) */}
        {isQSRTemplate && compareYears.length >= 2 && (
          <div className="mt-6 pt-4 border-t-2">
            <div className="flex items-center justify-between py-3 px-4 bg-primary/10 font-semibold">
              <div className="flex items-center gap-3 flex-1">
                <span className="font-mono text-xs w-8"></span>
                <span>Variación Interanual</span>
              </div>
              <div className="flex items-center gap-4">
                {compareYears.slice(0, -1).map((year, idx) => {
                  const currentYearData = yearQueries[idx]?.data?.plData;
                  const previousYearData = yearQueries[idx + 1]?.data?.plData;

                  const currentSales = Math.abs(
                    currentYearData?.find(l => l.rubric_code === 'net_sales')?.amount || 0
                  );
                  const previousSales = Math.abs(
                    previousYearData?.find(l => l.rubric_code === 'net_sales')?.amount || 0
                  );

                  const variation = previousSales !== 0
                    ? ((currentSales - previousSales) / previousSales) * 100
                    : 0;

                  return (
                    <div key={year} className="flex items-center gap-2">
                      <span className="text-sm w-28 text-right"></span>
                      <span
                        className={`text-sm w-16 text-right tabular-nums font-bold flex items-center justify-end gap-1 ${
                          variation >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {variation >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(variation).toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
