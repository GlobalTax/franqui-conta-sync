import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Lock, Plus, Calendar } from "lucide-react";
import { useView } from "@/contexts/ViewContext";
import {
  useGenerateClosingEntries,
  useGetOpeningBalances,
  useCloseFiscalYear,
} from "@/hooks/useClosingEntries";
import { useFiscalYears } from "@/hooks/useFiscalYears";
import { CreateFiscalYearDialog } from "@/components/accounting/CreateFiscalYearDialog";
import { FiscalYearSelector } from "@/components/accounting/FiscalYearSelector";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FiscalYearClosing = () => {
  const { selectedView } = useView();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [step, setStep] = useState<"preview" | "confirmed">("preview");
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<string>("");

  const centroCode =
    selectedView?.type === "centre" ? selectedView.id : undefined;

  // Fetch fiscal years for the selected centre
  const { data: fiscalYears, isLoading: loadingYears } = useFiscalYears(centroCode);

  // Find selected fiscal year object
  const selectedFiscalYear = fiscalYears?.find(fy => fy.id === selectedFiscalYearId);
  const openYears = fiscalYears?.filter(fy => fy.status === 'open') || [];

  // Closing date from the selected fiscal year's end_date
  const closingDate = selectedFiscalYear?.end_date || new Date().toISOString().split("T")[0];

  const { data: closingEntries, isLoading: loadingClosing } =
    useGenerateClosingEntries(
      centroCode,
      selectedFiscalYearId || undefined,
      closingDate
    );

  const { data: openingBalances, isLoading: loadingOpening } =
    useGetOpeningBalances(centroCode, selectedFiscalYearId || undefined);

  const closeFiscalYear = useCloseFiscalYear();

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const handleConfirmClose = () => {
    if (selectedFiscalYearId) {
      closeFiscalYear.mutate(
        { fiscalYearId: selectedFiscalYearId, closingDate },
        {
          onSuccess: () => {
            setStep("confirmed");
            setShowConfirmDialog(false);
            setSelectedFiscalYearId("");
          },
        }
      );
    }
  };

  // Group closing entries by type
  const regularizacionGastos = closingEntries?.filter(
    (e) => e.entry_type === "REGULARIZACION_GASTOS"
  );
  const regularizacionIngresos = closingEntries?.filter(
    (e) => e.entry_type === "REGULARIZACION_INGRESOS"
  );

  // Calculate result
  const totalIngresos =
    regularizacionIngresos
      ?.filter((e) => e.account_code === "129")
      .reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const totalGastos =
    regularizacionGastos
      ?.filter((e) => e.account_code === "129")
      .reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const resultado = totalIngresos - totalGastos;

  if (!selectedView) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Seleccione una vista (empresa o centro) para gestionar los ejercicios fiscales
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Contabilidad" },
          { label: "Ejercicios Fiscales" },
        ]}
        title="Gestión de Ejercicios Fiscales"
      />

      {/* Fiscal Years Table + Create Button */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ejercicios Fiscales
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Ejercicios del centro seleccionado
            </p>
          </div>
          {centroCode && <CreateFiscalYearDialog centroCode={centroCode} />}
        </CardHeader>
        <CardContent>
          {loadingYears ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !fiscalYears || fiscalYears.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No hay ejercicios fiscales creados para este centro.</p>
              <p className="text-sm mt-1">Crea uno nuevo con el botón superior.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Año</TableHead>
                  <TableHead>Fecha Inicio</TableHead>
                  <TableHead>Fecha Fin</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fiscalYears.map((fy) => (
                  <TableRow key={fy.id}>
                    <TableCell className="font-mono">{fy.year}</TableCell>
                    <TableCell>{fy.start_date}</TableCell>
                    <TableCell>{fy.end_date}</TableCell>
                    <TableCell>
                      <Badge variant={fy.status === 'open' ? 'default' : 'secondary'}>
                        {fy.status === 'open' ? 'Abierto' : 'Cerrado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(fy.created_at).toLocaleDateString('es-ES')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Closing Section - only if there are open years */}
      {openYears.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Cierre de Ejercicio
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Seleccione el ejercicio abierto que desea cerrar
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedFiscalYearId} onValueChange={setSelectedFiscalYearId}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Seleccionar ejercicio a cerrar" />
                </SelectTrigger>
                <SelectContent>
                  {openYears.map((fy) => (
                    <SelectItem key={fy.id} value={fy.id}>
                      {fy.year} — {fy.start_date} a {fy.end_date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedFiscalYear && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Va a cerrar el ejercicio <strong>{selectedFiscalYear.year}</strong> (del{" "}
                    {selectedFiscalYear.start_date} al {selectedFiscalYear.end_date}). Revise
                    los asientos de regularización antes de confirmar.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Only show preview sections when a fiscal year is selected */}
          {selectedFiscalYearId && (
            <>
              {/* Status Alert */}
              {step === "confirmed" && (
                <Alert className="border-green-600 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    Ejercicio cerrado correctamente. Los asientos de cierre y apertura han
                    sido generados.
                  </AlertDescription>
                </Alert>
              )}

              {/* Resultado del Ejercicio */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Resultado del Ejercicio {selectedFiscalYear?.year}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Ingresos (Grupo 7)</p>
                      <p className="text-2xl text-green-600">
                        {formatAmount(totalIngresos)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Gastos (Grupo 6)</p>
                      <p className="text-2xl text-red-600">
                        {formatAmount(totalGastos)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Resultado Neto</p>
                      <p
                        className={`text-3xl ${
                          resultado >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatAmount(resultado)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {resultado >= 0 ? "Beneficio" : "Pérdida"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Asientos de Regularización */}
              <Card>
                <CardHeader>
                  <CardTitle>Asientos de Regularización</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Asientos que saldan las cuentas de gastos e ingresos
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {loadingClosing ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="font-medium mb-3">1. Regularización de Gastos</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cuenta</TableHead>
                              <TableHead>Nombre</TableHead>
                              <TableHead className="text-right">Debe</TableHead>
                              <TableHead className="text-right">Haber</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {regularizacionGastos?.length ? (
                              regularizacionGastos.map((entry, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-mono">{entry.account_code}</TableCell>
                                  <TableCell>{entry.account_name}</TableCell>
                                  <TableCell className="text-right font-mono">
                                    {entry.movement_type === "debit" ? formatAmount(entry.amount) : "-"}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {entry.movement_type === "credit" ? formatAmount(entry.amount) : "-"}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                  Sin asientos de regularización de gastos
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <div>
                        <h3 className="font-medium mb-3">2. Regularización de Ingresos</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cuenta</TableHead>
                              <TableHead>Nombre</TableHead>
                              <TableHead className="text-right">Debe</TableHead>
                              <TableHead className="text-right">Haber</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {regularizacionIngresos?.length ? (
                              regularizacionIngresos.map((entry, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-mono">{entry.account_code}</TableCell>
                                  <TableCell>{entry.account_name}</TableCell>
                                  <TableCell className="text-right font-mono">
                                    {entry.movement_type === "debit" ? formatAmount(entry.amount) : "-"}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    {entry.movement_type === "credit" ? formatAmount(entry.amount) : "-"}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                  Sin asientos de regularización de ingresos
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Saldos para Apertura */}
              <Card>
                <CardHeader>
                  <CardTitle>Saldos para Asiento de Apertura</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Saldos de cuentas de balance para el siguiente ejercicio
                  </p>
                </CardHeader>
                <CardContent>
                  {loadingOpening ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cuenta</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead className="text-right">Debe</TableHead>
                          <TableHead className="text-right">Haber</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {openingBalances?.length ? (
                          openingBalances.map((balance, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono">{balance.account_code}</TableCell>
                              <TableCell>{balance.account_name}</TableCell>
                              <TableCell className="text-right font-mono">
                                {balance.movement_type === "debit" ? formatAmount(balance.balance) : "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {balance.movement_type === "credit" ? formatAmount(balance.balance) : "-"}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              Sin saldos de apertura disponibles
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Action Button */}
              {step === "preview" && selectedFiscalYear?.status === 'open' && (
                <Card>
                  <CardContent className="pt-6">
                    <Button
                      size="lg"
                      className="w-full gap-2"
                      onClick={() => setShowConfirmDialog(true)}
                    >
                      <Lock className="h-5 w-5" />
                      Cerrar Ejercicio {selectedFiscalYear.year}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Cierre de Ejercicio {selectedFiscalYear?.year}</DialogTitle>
            <DialogDescription>
              Esta acción generará los asientos de cierre y marcará el ejercicio como
              cerrado. No podrá modificar asientos contables del periodo.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Periodo: {selectedFiscalYear?.start_date} — {selectedFiscalYear?.end_date}
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmClose} disabled={closeFiscalYear.isPending}>
              {closeFiscalYear.isPending ? "Cerrando..." : "Confirmar Cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FiscalYearClosing;
