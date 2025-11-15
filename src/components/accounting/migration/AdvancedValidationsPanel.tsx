import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Loader2,
  TrendingUp,
  FileCheck,
  Receipt,
  List
} from "lucide-react";
import { useAdvancedValidations } from "@/hooks/useAdvancedValidations";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface AdvancedValidationsPanelProps {
  fiscalYearId: string;
  centroCode: string;
}

export function AdvancedValidationsPanel({ fiscalYearId, centroCode }: AdvancedValidationsPanelProps) {
  const { data: validations, isLoading, refetch, isFetching } = useAdvancedValidations(fiscalYearId, centroCode);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    trialBalance: false,
    vat: false,
    sequence: false,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Ejecutando Validaciones Avanzadas...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!validations) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>No se pudieron ejecutar las validaciones</AlertDescription>
      </Alert>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileCheck className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Validaciones Contables Avanzadas</CardTitle>
              <CardDescription>
                Comprobaciones de integridad antes del cierre definitivo
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Re-validar</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Status Alert */}
        {validations.overallValid ? (
          <Alert className="border-success bg-success/10">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <AlertTitle className="text-success">✅ Validación Completa</AlertTitle>
            <AlertDescription>
              Todas las validaciones críticas pasaron correctamente. El ejercicio está listo para cerrarse.
              {validations.warnings > 0 && (
                <span className="block mt-2 text-warning">
                  ⚠️ {validations.warnings} advertencias detectadas (no bloquean el cierre)
                </span>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <XCircle className="h-5 w-5" />
            <AlertTitle>❌ {validations.criticalErrors} Errores Críticos</AlertTitle>
            <AlertDescription>
              Debes resolver los errores críticos antes de cerrar el ejercicio.
              {validations.warnings > 0 && (
                <span className="block mt-1">
                  También hay {validations.warnings} advertencias.
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* 1. GLOBAL BALANCE */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {validations.globalBalance.valid ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <h3 className="font-semibold text-lg flex items-center gap-2">
              Balance Global del Ejercicio
              {validations.globalBalance.valid ? (
                <Badge variant="outline" className="bg-success/10 text-success border-success">
                  VÁLIDO
                </Badge>
              ) : (
                <Badge variant="destructive">CRÍTICO</Badge>
              )}
            </h3>
          </div>
          
          <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
            <div>
              <p className="text-xs text-muted-foreground">Total Debe</p>
              <p className="text-lg font-mono font-semibold">
                {validations.globalBalance.totalDebit.toLocaleString('es-ES', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} €
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Haber</p>
              <p className="text-lg font-mono font-semibold">
                {validations.globalBalance.totalCredit.toLocaleString('es-ES', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} €
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Diferencia</p>
              <p className={`text-lg font-mono font-semibold ${
                validations.globalBalance.valid ? 'text-success' : 'text-destructive'
              }`}>
                {validations.globalBalance.difference.toLocaleString('es-ES', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })} €
              </p>
            </div>
          </div>

          {validations.globalBalance.errorMessage && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{validations.globalBalance.errorMessage}</AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* 2. TRIAL BALANCE */}
        <Collapsible open={expandedSections.trialBalance} onOpenChange={() => toggleSection('trialBalance')}>
          <div className="space-y-2">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between hover:bg-muted/50 p-2 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  {validations.trialBalance.valid ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  )}
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    Sumas y Saldos por Cuenta
                    {validations.trialBalance.valid ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-success">
                        VÁLIDO
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning">
                        {validations.trialBalance.totalInvalidAccounts} ADVERTENCIAS
                      </Badge>
                    )}
                  </h3>
                </div>
                <TrendingUp className={`h-4 w-4 transition-transform ${
                  expandedSections.trialBalance ? 'rotate-180' : ''
                }`} />
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              {validations.trialBalance.valid ? (
                <p className="text-sm text-muted-foreground ml-7 mt-2">
                  Todas las cuentas tienen saldos coherentes con su grupo PGC
                </p>
              ) : (
                <div className="ml-7 mt-3 space-y-2">
                  <p className="text-sm text-warning font-medium">
                    {validations.trialBalance.totalInvalidAccounts} cuentas con saldos atípicos:
                  </p>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-2 font-medium">Cuenta</th>
                          <th className="text-left p-2 font-medium">Nombre</th>
                          <th className="text-right p-2 font-medium">Saldo</th>
                          <th className="text-left p-2 font-medium">Advertencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validations.trialBalance.invalidAccounts.slice(0, 10).map((acc, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2 font-mono">{acc.accountCode}</td>
                            <td className="p-2">{acc.accountName}</td>
                            <td className="p-2 text-right font-mono">
                              {acc.balance.toLocaleString('es-ES', { 
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2 
                              })} €
                            </td>
                            <td className="p-2 text-xs text-warning">{acc.warning}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {validations.trialBalance.totalInvalidAccounts > 10 && (
                    <p className="text-xs text-muted-foreground ml-2">
                      ... y {validations.trialBalance.totalInvalidAccounts - 10} más
                    </p>
                  )}
                </div>
              )}
            </CollapsibleContent>
          </div>
        </Collapsible>

        <Separator />

        {/* 3. VAT RECONCILIATION */}
        <Collapsible open={expandedSections.vat} onOpenChange={() => toggleSection('vat')}>
          <div className="space-y-2">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between hover:bg-muted/50 p-2 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  {validations.vatReconciliation.valid ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    Conciliación de IVA
                    {validations.vatReconciliation.valid ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-success">
                        VÁLIDO
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        {validations.vatReconciliation.totalErrors} ERRORES CRÍTICOS
                      </Badge>
                    )}
                  </h3>
                </div>
                <Receipt className={`h-4 w-4 transition-transform ${
                  expandedSections.vat ? 'rotate-180' : ''
                }`} />
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="ml-7 mt-3 space-y-3">
                {validations.vatReconciliation.details.map((vat, idx) => (
                  <div key={idx} className="border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold flex items-center gap-2">
                        IVA {vat.vatType}
                        {vat.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </h4>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Emitidas</p>
                        <p className="font-mono">{vat.vatIssued.toFixed(2)} €</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Recibidas</p>
                        <p className="font-mono">{vat.vatReceived.toFixed(2)} €</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">En Contabilidad</p>
                        <p className="font-mono">{vat.vatInAccounting.toFixed(2)} €</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Diferencia</p>
                        <p className={`font-mono font-semibold ${
                          vat.isValid ? 'text-success' : 'text-destructive'
                        }`}>
                          {vat.difference.toFixed(2)} €
                        </p>
                      </div>
                    </div>
                    {vat.errorMessage && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertDescription className="text-xs">{vat.errorMessage}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        <Separator />

        {/* 4. ENTRY SEQUENCE */}
        <Collapsible open={expandedSections.sequence} onOpenChange={() => toggleSection('sequence')}>
          <div className="space-y-2">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between hover:bg-muted/50 p-2 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  {validations.entrySequence.isValid ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  )}
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    Secuencia de Asientos
                    {validations.entrySequence.isValid ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-success">
                        VÁLIDO
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning">
                        ADVERTENCIA
                      </Badge>
                    )}
                  </h3>
                </div>
                <List className={`h-4 w-4 transition-transform ${
                  expandedSections.sequence ? 'rotate-180' : ''
                }`} />
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="ml-7 mt-3">
                <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/30">
                  <div>
                    <p className="text-xs text-muted-foreground">Rango</p>
                    <p className="font-mono font-semibold">
                      {validations.entrySequence.minEntryNumber} → {validations.entrySequence.maxEntryNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Asientos</p>
                    <p className="font-mono font-semibold">
                      {validations.entrySequence.actualCount} de {validations.entrySequence.expectedCount}
                    </p>
                  </div>
                </div>

                {validations.entrySequence.warningMessage && (
                  <Alert variant="default" className="mt-3 border-warning bg-warning/10">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning">
                      {validations.entrySequence.warningMessage}
                    </AlertDescription>
                  </Alert>
                )}

                {validations.entrySequence.missingNumbers.length > 0 && (
                  <div className="mt-3 p-2 border rounded text-xs">
                    <p className="font-medium mb-1">Números faltantes:</p>
                    <p className="font-mono text-muted-foreground">
                      {validations.entrySequence.missingNumbers.slice(0, 20).join(', ')}
                      {validations.entrySequence.missingNumbers.length > 20 && '...'}
                    </p>
                  </div>
                )}

                {validations.entrySequence.duplicateNumbers.length > 0 && (
                  <div className="mt-2 p-2 border rounded text-xs">
                    <p className="font-medium mb-1">Números duplicados:</p>
                    <p className="font-mono text-destructive">
                      {validations.entrySequence.duplicateNumbers.slice(0, 20).join(', ')}
                      {validations.entrySequence.duplicateNumbers.length > 20 && '...'}
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
