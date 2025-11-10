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
import { Search, TrendingUp, TrendingDown, Download, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  // Filtrar cuentas por búsqueda
  const filteredAccounts = (data?.accounts || []).filter((acc: AccountBreakdown) =>
    acc.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.account_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Export a CSV
  const handleExportCSV = () => {
    if (!data?.accounts) return;

    const headers = compareYoY
      ? ["Cuenta", "Nombre", "Importe Actual", "Importe Año Anterior", "Variación €", "Variación %", "Regla"]
      : ["Cuenta", "Nombre", "Importe", "Regla"];

    const rows = data.accounts.map((acc: AccountBreakdown) =>
      compareYoY
        ? [
            acc.account_code,
            acc.account_name,
            acc.amount_current.toFixed(2),
            (acc.amount_yoy || 0).toFixed(2),
            (acc.variance_amount || 0).toFixed(2),
            acc.variance_percent !== null ? acc.variance_percent.toFixed(2) + "%" : "N/A",
            acc.match_rule,
          ]
        : [acc.account_code, acc.account_name, acc.amount_current.toFixed(2), acc.match_rule]
    );

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `pl_breakdown_${rubricCode}_${startDate}_${endDate}.csv`;
    link.click();

    toast.success("Desglose exportado a CSV");
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

        <div className="flex items-center gap-2 mt-4">
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
            onClick={handleExportCSV}
            disabled={!data?.accounts || data.accounts.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
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
                <div className="col-span-2">Cuenta</div>
                <div className="col-span-3">Nombre</div>
                {compareYoY ? (
                  <>
                    <div className="col-span-2 text-right">Actual</div>
                    <div className="col-span-2 text-right">Año Anterior</div>
                    <div className="col-span-2 text-right">Variación</div>
                  </>
                ) : (
                  <div className="col-span-2 text-right">Importe</div>
                )}
                <div className="col-span-1 text-center">Regla</div>
              </div>

              {/* Rows */}
              {filteredAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No se encontraron cuentas" : "Sin cuentas en este periodo"}
                </div>
              ) : (
                filteredAccounts.map((acc: AccountBreakdown, idx: number) => (
                  <div
                    key={idx}
                    className="px-4 py-3 grid grid-cols-12 gap-4 text-sm border-t hover:bg-muted/30 transition-colors"
                  >
                    <div className="col-span-2 font-mono text-xs">
                      {acc.account_code}
                    </div>
                    <div className="col-span-3 text-sm">{acc.account_name}</div>
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
                      <div className="col-span-2 text-right font-semibold tabular-nums">
                        {acc.amount_current.toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    )}
                    <div className="col-span-1 text-center">
                      <Badge variant="outline" className="text-xs">
                        {acc.match_kind === "account_exact"
                          ? "Exacta"
                          : acc.match_kind === "account_like"
                          ? "Like"
                          : acc.match_kind === "account_range"
                          ? "Rango"
                          : acc.match_kind}
                      </Badge>
                    </div>
                  </div>
                ))
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
              {filteredAccounts.length} cuenta{filteredAccounts.length !== 1 ? "s" : ""}
              {searchTerm && ` (filtradas de ${data.accounts.length})`}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
