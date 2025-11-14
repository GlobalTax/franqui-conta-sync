// ============================================================================
// ACCOUNTING VALIDATION ALERT - Muestra resultados de validación contable
// ============================================================================

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface AccountingValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    sum_bases: number;
    sum_taxes: number;
    declared_base: number;
    declared_tax: number;
    declared_total: number;
    calculated_total: number;
    diff_bases: number;
    diff_taxes: number;
    diff_total: number;
  };
}

interface Props {
  validation?: AccountingValidation;
}

export function AccountingValidationAlert({ validation }: Props) {
  if (!validation) {
    return null;
  }

  const { valid, errors, warnings, details } = validation;
  
  // ========================================================================
  // ESTADO: VÁLIDO (sin errores ni warnings)
  // ========================================================================
  
  if (valid && warnings.length === 0) {
    return (
      <Alert className="border-success/20 bg-success-light">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <AlertTitle className="text-success">✅ Validación Contable Aprobada</AlertTitle>
        <AlertDescription className="text-success">
          Los totales, bases e IVA cuadran correctamente (±0.02€).
        </AlertDescription>
      </Alert>
    );
  }

  // ========================================================================
  // ESTADO: ERRORES CRÍTICOS
  // ========================================================================

  if (!valid) {
    return (
      <div className="space-y-3">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>❌ Errores de Validación Contable</AlertTitle>
          <AlertDescription>
            <p className="mb-2 font-medium">
              La factura presenta discrepancias en sus totales que impiden su contabilización:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-sm">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>

        {/* Detalles técnicos */}
        <Card className="p-4 bg-muted/50">
          <h4 className="font-semibold text-sm mb-3 text-foreground">
            📊 Detalles de Cálculo
          </h4>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">∑ Bases IVA:</span>
              <span className="font-mono font-medium">{details.sum_bases.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base declarada:</span>
              <span className="font-mono font-medium">{details.declared_base.toFixed(2)}€</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">∑ Cuotas IVA:</span>
              <span className="font-mono font-medium">{details.sum_taxes.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA declarado:</span>
              <span className="font-mono font-medium">{details.declared_tax.toFixed(2)}€</span>
            </div>
            
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Total calculado:</span>
              <span className="font-mono font-medium">{details.calculated_total.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Total declarado:</span>
              <span className="font-mono font-medium">{details.declared_total.toFixed(2)}€</span>
            </div>
          </div>

          {/* Diferencias */}
          {(Math.abs(details.diff_bases) > 0.01 || 
            Math.abs(details.diff_taxes) > 0.01 || 
            Math.abs(details.diff_total) > 0.01) && (
            <div className="mt-3 pt-3 border-t space-y-1">
              <p className="text-xs font-semibold text-destructive">Diferencias detectadas:</p>
              {Math.abs(details.diff_bases) > 0.01 && (
                <p className="text-xs text-muted-foreground">
                  • Bases: <span className="font-mono text-destructive">{details.diff_bases > 0 ? '+' : ''}{details.diff_bases.toFixed(2)}€</span>
                </p>
              )}
              {Math.abs(details.diff_taxes) > 0.01 && (
                <p className="text-xs text-muted-foreground">
                  • IVA: <span className="font-mono text-destructive">{details.diff_taxes > 0 ? '+' : ''}{details.diff_taxes.toFixed(2)}€</span>
                </p>
              )}
              {Math.abs(details.diff_total) > 0.01 && (
                <p className="text-xs text-muted-foreground">
                  • Total: <span className="font-mono text-destructive">{details.diff_total > 0 ? '+' : ''}{details.diff_total.toFixed(2)}€</span>
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Warnings adicionales */}
        {warnings.length > 0 && (
          <Alert className="border-warning/20 bg-warning-light">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning">⚠️ Advertencias</AlertTitle>
            <AlertDescription className="text-warning">
              <ul className="list-disc pl-4 space-y-1 text-sm">
                {warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // ========================================================================
  // ESTADO: VÁLIDO PERO CON WARNINGS
  // ========================================================================

  return (
    <Alert className="border-warning/20 bg-warning-light">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="text-warning">
        ✓ Validación Aprobada con Advertencias
      </AlertTitle>
      <AlertDescription className="text-warning">
        <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
          {warnings.map((warn, i) => (
            <li key={i}>{warn}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
