import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TrendingUp, TrendingDown } from "lucide-react";
import { AdjustmentCell } from "./AdjustmentCell";
import type { PLReportLine, PLReportLineAccumulated, PLReportLineWithAdjustments } from "@/types/profit-loss";

interface PLTableSingleProps {
  data: (PLReportLine | PLReportLineAccumulated | PLReportLineWithAdjustments)[];
  showAccumulated: boolean;
  showAdjustments: boolean;
  getAdjustmentAmount?: (rubricCode: string) => number;
  upsertAdjustment?: any;
  enableVirtualization?: boolean;
  onRubricClick?: (rubricCode: string, rubricName: string) => void;
}

export function PLTableSingle({
  data,
  showAccumulated,
  showAdjustments,
  getAdjustmentAmount,
  upsertAdjustment,
  enableVirtualization,
  onRubricClick,
}: PLTableSingleProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = enableVirtualization ?? data.length > 50;

  // Calcular altura dinámica según nivel de indentación
  const estimateSize = useMemo(() => {
    return (index: number) => {
      const line = data[index];
      const baseHeight = 48; // py-3 (12px × 2) + contenido (24px)
      const levelPadding = line.level * 4; // 4px extra por nivel
      const isSpecialRow = line.rubric_code === 'resultado_neto' || line.rubric_code === 'net_result';
      return baseHeight + levelPadding + (isSpecialRow ? 8 : 0); // Extra espacio para resultado neto
    };
  }, [data]);

  // Configurar virtualizador
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 5,
    enabled: shouldVirtualize,
  });

  const virtualItems = shouldVirtualize ? virtualizer.getVirtualItems() : data.map((_, index) => ({ index, key: index, start: 0, size: estimateSize(index) }));

  return (
    <div className="space-y-1">
      {/* Header sticky */}
      <div className="flex items-center justify-between py-3 px-4 bg-muted font-semibold sticky top-0 z-10">
        <div className="flex items-center gap-3 flex-1">
          <span className="font-mono text-xs w-8">#</span>
          <span>Concepto</span>
        </div>
        {showAdjustments ? (
          <div className="flex items-center gap-4">
            <span className="text-sm w-32 text-right text-muted-foreground">Calculado</span>
            <span className="text-sm w-32 text-right bg-accent px-2 py-1 rounded">A Sumar</span>
            <span className="text-sm w-32 text-right font-semibold">Importe</span>
            <span className="text-sm w-16 text-right">%</span>
          </div>
        ) : showAccumulated ? (
          <div className="flex items-center gap-4">
            <span className="text-sm w-32 text-right">Mes €</span>
            <span className="text-sm w-20 text-right">Mes %</span>
            <span className="text-sm w-32 text-right bg-blue-100 dark:bg-blue-950 px-2 py-1 rounded">Acum. €</span>
            <span className="text-sm w-20 text-right bg-blue-100 dark:bg-blue-950 px-2 py-1 rounded">Acum. %</span>
          </div>
        ) : (
          <div className="flex items-center gap-8">
            <span className="text-sm w-32 text-right">Importe</span>
            <span className="text-sm w-16 text-right">%</span>
          </div>
        )}
      </div>

      {/* Contenedor virtualizado */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{
          height: shouldVirtualize ? '600px' : 'auto',
          maxHeight: shouldVirtualize ? '80vh' : 'none',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: shouldVirtualize ? `${virtualizer.getTotalSize()}px` : 'auto',
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const line = data[virtualRow.index] as any;
            const idx = virtualRow.index;
            const isAccumulatedData = 'amount_period' in line;
            const isAdjustmentData = 'amount_calculated' in line;
            const displayAmount = isAccumulatedData ? line.amount_period : isAdjustmentData ? line.amount_final : line.amount;
            const displayPercentage = isAccumulatedData ? line.percentage_period : line.percentage;

            return (
              <div
                key={`${line.rubric_code}-${idx}`}
                className={`flex items-center justify-between py-3 px-4 ${
                  line.is_total
                    ? "bg-muted/50 font-semibold"
                    : "hover:bg-accent/30"
                } ${
                  line.rubric_code === 'resultado_neto' || line.rubric_code === 'net_result'
                    ? "bg-primary/5 border-t-2 border-primary mt-2"
                    : ""
                } ${
                  line.rubric_code === 'ebitda' || line.rubric_code === 'margen_bruto' || line.rubric_code === 'gross_margin'
                    ? "border-l-4 border-l-primary"
                    : ""
                } ${
                  !line.is_total && onRubricClick
                    ? "cursor-pointer hover:bg-muted/60 transition-colors"
                    : ""
                }`}
                style={{
                  paddingLeft: `${line.level * 2 + 1}rem`,
                  ...(shouldVirtualize ? {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  } : {}),
                }}
                onClick={() => {
                  if (!line.is_total && onRubricClick) {
                    onRubricClick(line.rubric_code, line.rubric_name);
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="font-mono text-xs w-8 text-muted-foreground flex-shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`truncate ${
                      line.is_total ? "font-semibold text-foreground" : ""
                    } ${
                      line.rubric_code === 'resultado_neto' || line.rubric_code === 'net_result'
                        ? "font-bold text-lg"
                        : ""
                    }`}
                    title={line.rubric_name}
                  >
                    {line.rubric_name}
                  </span>
                </div>
                
                {showAdjustments && isAdjustmentData ? (
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-right w-32 text-muted-foreground">
                      {line.amount_calculated.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}€
                    </span>
                    <div className="w-32 bg-accent px-2 py-1 rounded">
                      <AdjustmentCell
                        rubricCode={line.rubric_code}
                        currentAdjustment={getAdjustmentAmount?.(line.rubric_code) || 0}
                        onUpdate={(amount) =>
                          upsertAdjustment?.mutate({
                            rubricCode: line.rubric_code,
                            amount,
                          })
                        }
                        isDisabled={line.is_total}
                      />
                    </div>
                    <span
                      className={`font-mono font-semibold text-right w-32 ${
                        line.amount_final >= 0 ? "text-success" : "text-foreground"
                      }`}
                    >
                      {line.amount_final.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}€
                    </span>
                    <span className="text-sm text-muted-foreground text-right w-16">
                      {Math.abs(line.percentage || 0).toFixed(1)}%
                    </span>
                  </div>
                ) : showAccumulated && isAccumulatedData ? (
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-mono font-semibold text-right w-32 ${
                        displayAmount >= 0 ? "text-success" : "text-foreground"
                      }`}
                    >
                      {displayAmount.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}€
                    </span>
                    <span className="text-sm text-muted-foreground text-right w-20">
                      {Math.abs(displayPercentage || 0).toFixed(1)}%
                    </span>
                    <span
                      className={`font-mono font-bold text-right w-32 bg-blue-100 dark:bg-blue-950 px-2 py-1 rounded ${
                        line.amount_ytd >= 0 ? "text-success" : "text-foreground"
                      }`}
                    >
                      {line.amount_ytd.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}€
                    </span>
                    <span className="text-sm font-semibold text-right w-20 bg-blue-100 dark:bg-blue-950 px-2 py-1 rounded">
                      {Math.abs(line.percentage_ytd || 0).toFixed(1)}%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-8">
                    <span
                      className={`font-mono font-semibold text-right w-32 ${
                        displayAmount >= 0 ? "text-success" : "text-foreground"
                      } ${
                        line.rubric_code === 'resultado_neto' || line.rubric_code === 'net_result'
                          ? "text-lg"
                          : ""
                      }`}
                    >
                      {displayAmount.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}€
                    </span>
                    <span
                      className={`text-sm text-muted-foreground text-right w-16 ${
                        line.rubric_code === 'resultado_neto' || line.rubric_code === 'net_result'
                          ? "font-semibold"
                          : ""
                      }`}
                    >
                      {Math.abs(displayPercentage || 0).toFixed(1)}%
                    </span>
                    {line.is_total && line.rubric_code !== 'resultado_neto' && line.rubric_code !== 'net_result' && (
                      <div className="w-6">
                        {displayAmount >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Indicador de virtualización (opcional) */}
      {shouldVirtualize && (
        <div className="text-xs text-muted-foreground text-right px-4 py-2">
          Mostrando {virtualItems.length} de {data.length} filas (virtualización activa)
        </div>
      )}
    </div>
  );
}
