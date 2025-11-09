import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { PLReportLine } from "@/types/profit-loss";
import { UseQueryResult } from "@tanstack/react-query";

interface PLTableMonthlyProps {
  monthlyQueries: UseQueryResult<{ plData: PLReportLine[]; summary: any }>[];
  prevYearMonthlyQueries?: UseQueryResult<{ plData: PLReportLine[]; summary: any }>[];
  year: number;
  showYoY: boolean;
}

export const PLTableMonthly = ({
  monthlyQueries,
  prevYearMonthlyQueries,
  year,
  showYoY,
}: PLTableMonthlyProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  
  // Verificar si todas las queries han cargado
  const isLoading = monthlyQueries.some(q => q.isLoading) || 
    (showYoY && prevYearMonthlyQueries?.some(q => q.isLoading));
  
  // Obtener datos de todos los meses
  const plDataByMonth = monthlyQueries.map(q => q.data?.plData || []);
  const prevYearPlDataByMonth = prevYearMonthlyQueries?.map(q => q.data?.plData || []) || [];
  
  // Obtener estructura de rubros del primer mes que tenga datos
  const baseRubrics = useMemo(() => {
    for (const monthData of plDataByMonth) {
      if (monthData.length > 0) return monthData;
    }
    return [];
  }, [plDataByMonth]);
  
  // Virtualización
  const virtualizer = useVirtualizer({
    count: baseRubrics.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });
  
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }
  
  return (
    <div ref={parentRef} className="flex-1 overflow-auto max-h-[600px] border rounded-lg">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background border-b">
          <TableRow>
            <TableHead className="sticky left-0 z-20 bg-background min-w-[300px] border-r">
              Concepto
            </TableHead>
            {monthNames.map((month, idx) => (
              showYoY ? (
                <>
                  <TableHead key={`${month}-curr`} className="text-right min-w-[100px]">
                    {month} {year}
                  </TableHead>
                  <TableHead key={`${month}-prev`} className="text-right min-w-[100px] text-muted-foreground">
                    {month} {year-1}
                  </TableHead>
                  <TableHead key={`${month}-var`} className="text-right min-w-[80px] border-r">
                    Δ%
                  </TableHead>
                </>
              ) : (
                <TableHead key={month} className="text-right min-w-[100px]">
                  {month}
                </TableHead>
              )
            ))}
            {!showYoY && (
              <TableHead className="text-right font-bold min-w-[120px] border-l bg-muted/30">
                Total
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
          {virtualizer.getVirtualItems().map(virtualRow => {
            const rubric = baseRubrics[virtualRow.index];
            
            // Calcular totales del año
            let totalYear = 0;
            
            return (
              <TableRow
                key={rubric.rubric_code}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`
                  ${rubric.level === 0 ? 'font-bold text-base bg-primary/5' : ''}
                  ${rubric.level === 1 ? 'font-semibold bg-muted/30' : ''}
                  ${rubric.is_total ? 'font-bold bg-accent/10 border-t-2' : ''}
                `}
              >
                <TableCell 
                  className="sticky left-0 z-10 bg-background border-r"
                  style={{ paddingLeft: `${(rubric.level || 0) * 16 + 8}px` }}
                >
                  {rubric.rubric_name}
                </TableCell>
                {plDataByMonth.map((monthData, monthIdx) => {
                  const matchingRubric = monthData.find(r => r.rubric_code === rubric.rubric_code);
                  const currentAmount = matchingRubric?.amount || 0;
                  totalYear += currentAmount;
                  
                  if (showYoY) {
                    const prevMonthData = prevYearPlDataByMonth[monthIdx] || [];
                    const prevMatchingRubric = prevMonthData.find(r => r.rubric_code === rubric.rubric_code);
                    const prevAmount = prevMatchingRubric?.amount || 0;
                    const variance = prevAmount !== 0 ? ((currentAmount - prevAmount) / Math.abs(prevAmount)) * 100 : 0;
                    
                    return (
                      <>
                        <TableCell key={`${monthIdx}-curr`} className="text-right font-mono text-sm">
                          {currentAmount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell key={`${monthIdx}-prev`} className="text-right font-mono text-sm text-muted-foreground">
                          {prevAmount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell 
                          key={`${monthIdx}-var`} 
                          className={`text-right font-mono text-sm border-r ${
                            variance > 5 ? 'text-success font-semibold' : 
                            variance < -5 ? 'text-destructive font-semibold' : 
                            ''
                          }`}
                        >
                          {variance.toFixed(1)}%
                        </TableCell>
                      </>
                    );
                  } else {
                    return (
                      <TableCell key={monthIdx} className="text-right font-mono text-sm">
                        {currentAmount.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </TableCell>
                    );
                  }
                })}
                {!showYoY && (
                  <TableCell className="text-right font-mono text-sm font-bold border-l bg-muted/30">
                    {totalYear.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
