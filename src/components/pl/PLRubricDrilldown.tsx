import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, TrendingUp, TrendingDown, Download, X, ArrowUp, ArrowDown, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface PLRubricDrilldownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateCode: string;
  rubricCode: string;
  rubricName: string;
  companyId?: string;
  centroCode?: string;
  startDate: string;
  endDate: string;
  compareYoY?: boolean;
}

interface AccountBreakdown {
  account_code: string;
  account_name: string;
  amount_current: number;
  amount_yoy?: number;
  variance_amount?: number;
  variance_percent?: number;
  match_rule: string;
  match_kind: string;
}

type SortKey = "account_code" | "amount_current" | "variance_percent";
type SortOrder = "asc" | "desc";

export function PLRubricDrilldown({
  open,
  onOpenChange,
  templateCode,
  rubricCode,
  rubricName,
  companyId,
  centroCode,
  startDate,
  endDate,
  compareYoY = false,
}: PLRubricDrilldownProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMatchKind, setFilterMatchKind] = useState<string>("all");
  const [minAmount, setMinAmount] = useState<number>(0);
  const [sortKey, setSortKey] = useState<SortKey>("amount_current");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Fetch breakdown data
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "pl-rubric-breakdown",
      templateCode,
      rubricCode,
      companyId,
      centroCode,
      startDate,
      endDate,
      compareYoY,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("pl-rubric-breakdown", {
        body: {
          template_code: templateCode,
          rubric_code: rubricCode,
          company_id: companyId,
          centro_code: centroCode,
          start_date: startDate,
          end_date: endDate,
          compare_yoy: compareYoY,
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: open,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Filtrar y ordenar cuentas
  const filteredAndSortedAccounts = (data?.accounts || [])
    .filter((acc: AccountBreakdown) =>
      (filterMatchKind === "all" || acc.match_kind === filterMatchKind) &&
      Math.abs(acc.amount_current) >= minAmount &&
      (acc.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.account_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const aVal = sortKey === "account_code" ? a.account_code : 
                    sortKey === "variance_percent" ? (a.variance_percent || 0) : 
                    a.amount_current;
      const bVal = sortKey === "account_code" ? b.account_code :
                    sortKey === "variance_percent" ? (b.variance_percent || 0) :
                    b.amount_current;
      
      if (sortKey === "account_code") {
        return sortOrder === "asc" 
          ? aVal.toString().localeCompare(bVal.toString()) 
          : bVal.toString().localeCompare(aVal.toString());
      }
      return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  const maxAmount = Math.max(...(data?.accounts || []).map((a: AccountBreakdown) => Math.abs(a.amount_current)), 1);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const getPGCHierarchy = (accountCode: string) => {
    if (accountCode.length >= 1) {
      return {
        group: accountCode.substring(0, 1),
        subgroup: accountCode.length >= 2 ? accountCode.substring(0, 2) : null,
        account: accountCode.length >= 4 ? accountCode.substring(0, 4) : null,
      };
    }
    return null;
  };

  const matchKindColors: Record<string, string> = {
    account_exact: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    account_like: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    account_range: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    group: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    channel: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    centre: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  };

  const matchKindLabels: Record<string, string> = {
    account_exact: "Exacta",
    account_like: "LIKE",
    account_range: "Rango",
    group: "Grupo",
    channel: "Canal",
    centre: "Centro",
  };

  // Export a Excel con formato
  const handleExportExcel = () => {
    if (!data?.accounts) return;

    const exportData = filteredAndSortedAccounts.map((acc: AccountBreakdown) => ({
      "Cuenta PGC": acc.account_code,
      "Nombre": acc.account_name,
      "Importe Actual": acc.amount_current,
      ...(compareYoY && {
        "Año Anterior": acc.amount_yoy || 0,
        "Variación €": acc.variance_amount || 0,
        "Variación %": acc.variance_percent !== null ? acc.variance_percent : null,
      }),
      "Tipo Regla": matchKindLabels[acc.match_kind] || acc.match_kind,
      "Regla": acc.match_rule,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);

    // Configurar anchos de columna
    ws['!cols'] = [
      { wch: 12 }, // Cuenta
      { wch: 40 }, // Nombre
      { wch: 15 }, // Importe
      ...(compareYoY ? [{ wch: 15 }, { wch: 15 }, { wch: 12 }] : []),
      { wch: 15 }, // Tipo Regla
      { wch: 30 }, // Regla
    ];

    // Crear workbook y agregar metadatos
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Desglose");

    // Agregar hoja de metadatos
    const metadata = [
      ["Rubro", rubricName],
      ["Código", rubricCode],
      ["Periodo", `${startDate} → ${endDate}`],
      ...(compareYoY && data?.period_yoy ? [["Comparación", `${data.period_yoy.start_date} → ${data.period_yoy.end_date}`]] : []),
      ["Total Cuentas", data.accounts.length],
      ["Cuentas Filtradas", filteredAndSortedAccounts.length],
      ["Total Importe", data.totals.current],
      ...(compareYoY ? [["Total Año Anterior", data.totals.yoy || 0]] : []),
      ["Exportado", new Date().toLocaleString("es-ES")],
    ];
    const wsMetadata = XLSX.utils.aoa_to_sheet(metadata);
    XLSX.utils.book_append_sheet(wb, wsMetadata, "Información");

    XLSX.writeFile(wb, `pl_breakdown_${rubricCode}_${startDate}_${endDate}.xlsx`);
    toast.success("Desglose exportado a Excel");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Desglose: {rubricName}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {startDate} → {endDate}
                {compareYoY && data?.period_yoy && (
                  <span className="ml-2 text-muted-foreground">
                    vs {data.period_yoy.start_date} → {data.period_yoy.end_date}
                  </span>
                )}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cuenta o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={!data?.accounts || data.accounts.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterMatchKind} onValueChange={setFilterMatchKind}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de regla" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las reglas</SelectItem>
                <SelectItem value="account_exact">Cuenta exacta</SelectItem>
                <SelectItem value="account_like">Patrón LIKE</SelectItem>
                <SelectItem value="account_range">Rango</SelectItem>
                <SelectItem value="group">Grupo PGC</SelectItem>
                <SelectItem value="channel">Canal</SelectItem>
                <SelectItem value="centre">Centro</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              type="number"
              placeholder="Importe mín..."
              value={minAmount || ""}
              onChange={(e) => setMinAmount(parseFloat(e.target.value) || 0)}
              className="w-[150px]"
              min="0"
              step="100"
            />
            
            <Badge variant="outline" className="text-xs">
              {filteredAndSortedAccounts.length} de {data?.accounts?.length || 0} cuentas
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1 mt-4">
          {isLoading && (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              Error al cargar desglose: {(error as Error).message}
            </div>
          )}

          {data && !isLoading && (
            <div className="border rounded-lg overflow-hidden">
              {/* Header */}
              <div className="bg-muted px-4 py-3 font-semibold grid grid-cols-12 gap-4 text-sm sticky top-0 z-10">
                <div 
                  className="col-span-2 cursor-pointer hover:bg-muted/70 flex items-center gap-1 rounded px-1"
                  onClick={() => handleSort("account_code")}
                >
                  Cuenta
                  {sortKey === "account_code" && (
                    sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  )}
                </div>
                <div className="col-span-2">Nombre</div>
                {compareYoY ? (
                  <>
                    <div 
                      className="col-span-2 text-right cursor-pointer hover:bg-muted/70 flex items-center justify-end gap-1 rounded px-1"
                      onClick={() => handleSort("amount_current")}
                    >
                      Actual
                      {sortKey === "amount_current" && (
                        sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      )}
                    </div>
                    <div className="col-span-2 text-right">Año Anterior</div>
                    <div 
                      className="col-span-2 text-right cursor-pointer hover:bg-muted/70 flex items-center justify-end gap-1 rounded px-1"
                      onClick={() => handleSort("variance_percent")}
                    >
                      Variación
                      {sortKey === "variance_percent" && (
                        sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      )}
                    </div>
                  </>
                ) : (
                  <div 
                    className="col-span-4 text-right cursor-pointer hover:bg-muted/70 flex items-center justify-end gap-1 rounded px-1"
                    onClick={() => handleSort("amount_current")}
                  >
                    Importe
                    {sortKey === "amount_current" && (
                      sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </div>
                )}
                <div className="col-span-2 text-center">Regla</div>
              </div>

              {/* Rows */}
              {filteredAndSortedAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || filterMatchKind !== "all" || minAmount > 0
                    ? "No se encontraron cuentas con los filtros aplicados"
                    : "Sin cuentas en este periodo"}
                </div>
              ) : (
                filteredAndSortedAccounts.map((acc: AccountBreakdown, idx: number) => {
                  const hierarchy = getPGCHierarchy(acc.account_code);
                  const participation = (Math.abs(acc.amount_current) / maxAmount) * 100;
                  
                  return (
                    <div
                      key={idx}
                      className="px-4 py-3 grid grid-cols-12 gap-4 text-sm border-t hover:bg-muted/30 transition-colors"
                    >
                      <div className="col-span-2 font-mono text-xs flex items-center gap-1 flex-wrap">
                        {hierarchy && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            G{hierarchy.group}
                          </Badge>
                        )}
                        <span>{acc.account_code}</span>
                      </div>
                      <div className="col-span-2 text-sm">
                        {acc.account_name}
                        <Progress value={participation} className="w-full h-1 mt-1" />
                      </div>
                    {compareYoY ? (
                      <>
                        <div className="col-span-2 text-right font-semibold tabular-nums">
                          {acc.amount_current.toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="col-span-2 text-right text-muted-foreground tabular-nums">
                          {(acc.amount_yoy || 0).toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="col-span-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {acc.variance_percent !== null &&
                            acc.variance_percent !== undefined ? (
                              <>
                                {acc.variance_percent > 0 ? (
                                  <TrendingUp className="h-4 w-4 text-success" />
                                ) : acc.variance_percent < 0 ? (
                                  <TrendingDown className="h-4 w-4 text-destructive" />
                                ) : null}
                                <span
                                  className={`font-semibold tabular-nums ${
                                    acc.variance_percent > 0
                                      ? "text-success"
                                      : acc.variance_percent < 0
                                      ? "text-destructive"
                                      : ""
                                  }`}
                                >
                                  {acc.variance_percent > 0 ? "+" : ""}
                                  {acc.variance_percent.toFixed(1)}%
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-4 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="font-semibold tabular-nums">
                            {acc.amount_current.toLocaleString("es-ES", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="col-span-2 text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-center gap-1">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${matchKindColors[acc.match_kind] || ""}`}
                              >
                                {matchKindLabels[acc.match_kind] || acc.match_kind}
                              </Badge>
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="text-xs space-y-1">
                              <p><strong>Regla:</strong> {acc.match_rule}</p>
                              <p><strong>Tipo:</strong> {matchKindLabels[acc.match_kind] || acc.match_kind}</p>
                              <p><strong>Participación:</strong> {participation.toFixed(1)}%</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer con totales */}
        {data && !isLoading && (
          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/50 rounded-lg font-bold text-sm">
              <div className="col-span-5">TOTAL</div>
              {compareYoY ? (
                <>
                  <div className="col-span-2 text-right tabular-nums">
                    {data.totals.current.toLocaleString("es-ES", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="col-span-2 text-right text-muted-foreground tabular-nums">
                    {(data.totals.yoy || 0).toLocaleString("es-ES", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {data.totals.variance_percent !== null &&
                      data.totals.variance_percent !== undefined ? (
                        <>
                          {data.totals.variance_percent > 0 ? (
                            <TrendingUp className="h-4 w-4 text-success" />
                          ) : data.totals.variance_percent < 0 ? (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          ) : null}
                          <span
                            className={`font-bold tabular-nums ${
                              data.totals.variance_percent > 0
                                ? "text-success"
                                : data.totals.variance_percent < 0
                                ? "text-destructive"
                                : ""
                            }`}
                          >
                            {data.totals.variance_percent > 0 ? "+" : ""}
                            {data.totals.variance_percent.toFixed(1)}%
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs">N/A</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="col-span-2 text-right tabular-nums">
                  {data.totals.current.toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              )}
              <div className="col-span-1"></div>
            </div>
            <div className="text-xs text-muted-foreground mt-2 text-center">
              {filteredAndSortedAccounts.length} cuenta{filteredAndSortedAccounts.length !== 1 ? "s" : ""}
              {(searchTerm || filterMatchKind !== "all" || minAmount > 0) && ` (filtradas de ${data.accounts.length})`}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
