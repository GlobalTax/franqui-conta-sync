import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Lock } from "lucide-react";
import { useView } from "@/contexts/ViewContext";
import {
  useGenerateClosingEntries,
  useGetOpeningBalances,
  useCloseFiscalYear,
} from "@/hooks/useClosingEntries";
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

const FiscalYearClosing = () => {
  const { selectedView } = useView();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [step, setStep] = useState<"preview" | "confirmed">("preview");

  // Hardcoded for demo - in production this should come from selected fiscal year
  const fiscalYearId = "some-fiscal-year-id";
  const closingDate = new Date().toISOString().split("T")[0];
  const centroCode =
    selectedView?.type === "centre" ? selectedView.id : undefined;

  const { data: closingEntries, isLoading: loadingClosing } =
    useGenerateClosingEntries(centroCode, fiscalYearId, closingDate);

  const { data: openingBalances, isLoading: loadingOpening } =
    useGetOpeningBalances(centroCode, fiscalYearId);

  const closeFiscalYear = useCloseFiscalYear();

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const handleConfirmClose = () => {
    if (fiscalYearId) {
      closeFiscalYear.mutate(
        { fiscalYearId, closingDate },
        {
          onSuccess: () => {
            setStep("confirmed");
            setShowConfirmDialog(false);
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
            Seleccione una vista (empresa o centro) para realizar el cierre de ejercicio
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
          { label: "Cierre de Ejercicio" },
        ]}
        title="Cierre y Apertura de Ejercicio Fiscal"
      />

      {/* Status Alert */}
      {step === "preview" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> El cierre de ejercicio es una operación crítica.
            Revise cuidadosamente los asientos de regularización antes de confirmar.
          </AlertDescription>
        </Alert>
      )}

      {step === "confirmed" && (
        <Alert className="border-green-600 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>Ejercicio cerrado correctamente.</strong> Los asientos de cierre y
            apertura han sido generados.
          </AlertDescription>
        </Alert>
      )}

      {/* Resultado del Ejercicio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Resultado del Ejercicio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Ingresos (Grupo 7)</p>
              <p className="text-2xl font-bold text-green-600">
                {formatAmount(totalIngresos)}
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Gastos (Grupo 6)</p>
              <p className="text-2xl font-bold text-red-600">
                {formatAmount(totalGastos)}
              </p>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Resultado Neto</p>
              <p
                className={`text-3xl font-bold ${
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
              {/* Regularización de Gastos */}
              <div>
                <h3 className="font-semibold mb-3">1. Regularización de Gastos</h3>
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
                    {regularizacionGastos?.map((entry, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono">{entry.account_code}</TableCell>
                        <TableCell>{entry.account_name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {entry.movement_type === "debit"
                            ? formatAmount(entry.amount)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {entry.movement_type === "credit"
                            ? formatAmount(entry.amount)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Regularización de Ingresos */}
              <div>
                <h3 className="font-semibold mb-3">2. Regularización de Ingresos</h3>
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
                    {regularizacionIngresos?.map((entry, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono">{entry.account_code}</TableCell>
                        <TableCell>{entry.account_name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {entry.movement_type === "debit"
                            ? formatAmount(entry.amount)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {entry.movement_type === "credit"
                            ? formatAmount(entry.amount)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
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
                {openingBalances?.map((balance, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono">{balance.account_code}</TableCell>
                    <TableCell>{balance.account_name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {balance.movement_type === "debit"
                        ? formatAmount(balance.balance)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {balance.movement_type === "credit"
                        ? formatAmount(balance.balance)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Button */}
      {step === "preview" && (
        <Card>
          <CardContent className="pt-6">
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => setShowConfirmDialog(true)}
              disabled={!closingEntries || closingEntries.length === 0}
            >
              <Lock className="h-5 w-5" />
              Cerrar Ejercicio Fiscal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Cierre de Ejercicio</DialogTitle>
            <DialogDescription>
              Esta acción generará los asientos de cierre y marcará el ejercicio como
              cerrado. ¿Desea continuar?
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Una vez cerrado el ejercicio, no podrá modificar los asientos contables del
              periodo.
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
