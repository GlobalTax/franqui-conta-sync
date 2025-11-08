import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReconciliation } from "@/hooks/useReconciliation";
import { BankAccountSelector } from "@/components/treasury/BankAccountSelector";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { Check, X, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useView } from "@/contexts/ViewContext";

export default function Reconciliation() {
  const { selectedView } = useView();
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const { 
    pendingMatches, 
    approvedMatches, 
    isLoading,
    approveMatch,
    rejectMatch,
    suggestMatches 
  } = useReconciliation(selectedView?.id);

  const handleSuggestMatches = () => {
    if (!selectedView?.id) {
      toast.error("Selecciona un centro primero");
      return;
    }
    
    suggestMatches({
      centroCode: selectedView.id,
      startDate: format(dateRange.from, "yyyy-MM-dd"),
      endDate: format(dateRange.to, "yyyy-MM-dd"),
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy", { locale: es });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Conciliación Bancaria"
          subtitle="Concilia transacciones bancarias con asientos contables"
          breadcrumbs={[
            { label: "Tesorería", href: "/bancos" },
            { label: "Conciliación" }
          ]}
        />

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <h2 className="text-lg font-semibold">Filtros</h2>
            <p className="text-sm text-muted-foreground">Selecciona cuenta bancaria y período</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Cuenta Bancaria</label>
                <BankAccountSelector
                  value={selectedAccount}
                  onChange={setSelectedAccount}
                  centroCode={selectedView?.id}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">Período</label>
                <div className="flex gap-2">
                  <DateRangePicker
                    startDate={dateRange.from}
                    endDate={dateRange.to}
                    onStartDateChange={(date) => date && setDateRange({ ...dateRange, from: date })}
                    onEndDateChange={(date) => date && setDateRange({ ...dateRange, to: date })}
                  />
                  <Button onClick={handleSuggestMatches} variant="outline">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Sugerir Conciliaciones
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pendientes ({pendingMatches.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Aprobadas ({approvedMatches.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30">
                <h2 className="text-lg font-semibold">Conciliaciones Pendientes</h2>
                <p className="text-sm text-muted-foreground">
                  Revisa y aprueba las conciliaciones sugeridas automáticamente
                </p>
              </div>
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Cargando...</div>
                ) : pendingMatches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay conciliaciones pendientes. Haz clic en "Sugerir Conciliaciones" para buscar coincidencias.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha Trans.</TableHead>
                        <TableHead>Descripción Bancaria</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                        <TableHead>Asiento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-center">Confianza</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingMatches.map((match) => (
                        <TableRow key={match.id}>
                          <TableCell>
                            {match.bank_transactions?.transaction_date 
                              ? formatDate(match.bank_transactions.transaction_date)
                              : "-"}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {match.bank_transactions?.description || "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {match.bank_transactions?.amount 
                              ? formatCurrency(match.bank_transactions.amount)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {match.accounting_entry_id 
                              ? `Asiento ${match.accounting_entry_id.substring(0, 8)}`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={match.match_type === "automatic" ? "default" : "secondary"}>
                              {match.match_type === "automatic" ? "Automático" : "Sugerido"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={
                                (match.confidence_score || 0) >= 80 
                                  ? "default" 
                                  : "secondary"
                              }
                            >
                              {match.confidence_score ? `${match.confidence_score}%` : "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveMatch(match.id)}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectMatch(match.id)}
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30">
                <h2 className="text-lg font-semibold">Conciliaciones Aprobadas</h2>
                <p className="text-sm text-muted-foreground">
                  Historial de conciliaciones confirmadas
                </p>
              </div>
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Cargando...</div>
                ) : approvedMatches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay conciliaciones aprobadas todavía
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha Trans.</TableHead>
                        <TableHead>Descripción Bancaria</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                        <TableHead>Asiento</TableHead>
                        <TableHead>Conciliado Por</TableHead>
                        <TableHead>Fecha Conciliación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedMatches.map((match) => (
                        <TableRow key={match.id}>
                          <TableCell>
                            {match.bank_transactions?.transaction_date 
                              ? formatDate(match.bank_transactions.transaction_date)
                              : "-"}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {match.bank_transactions?.description || "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {match.bank_transactions?.amount 
                              ? formatCurrency(match.bank_transactions.amount)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {match.accounting_entry_id 
                              ? `Asiento ${match.accounting_entry_id.substring(0, 8)}`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {match.matched_by ? match.matched_by.substring(0, 8) : "Sistema"}
                          </TableCell>
                          <TableCell>
                            {match.matched_at ? formatDate(match.matched_at) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
