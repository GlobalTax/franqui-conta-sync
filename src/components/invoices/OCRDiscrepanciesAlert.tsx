import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Sparkles, Info } from "lucide-react";

interface Props {
  discrepancies: string[];
  proposedFix: { what: string; why: string } | null;
  autofixApplied: string[];
  validation: {
    ok: boolean;
    errors: string[];
    warnings: string[];
  };
  onApplyFix?: () => void;
}

export function OCRDiscrepanciesAlert({ 
  discrepancies, 
  proposedFix, 
  autofixApplied,
  validation,
  onApplyFix 
}: Props) {
  
  const hasIssues = discrepancies.length > 0 || validation.errors.length > 0 || validation.warnings.length > 0;
  
  if (!hasIssues && autofixApplied.length === 0) {
    return (
      <Alert className="border-success/20 bg-success-light">
        <CheckCircle className="h-4 w-4 text-success" />
        <AlertTitle className="text-success">✅ Factura validada</AlertTitle>
        <AlertDescription className="text-success">
          No se detectaron discrepancias. La factura cumple con las reglas fiscales españolas.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-3">
      {/* Auto-correcciones aplicadas */}
      {autofixApplied.length > 0 && (
        <Alert className="border-primary/20 bg-primary/5">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertTitle className="text-foreground">
            🤖 Correcciones Automáticas Aplicadas
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-2 space-y-1 text-sm text-muted-foreground">
              {autofixApplied.map((fix, i) => (
                <li key={i}>
                  <code className="text-xs bg-primary/10 px-1 rounded text-primary">{fix}</code>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Errores críticos */}
      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>❌ Errores Críticos</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-2 space-y-1">
              {validation.errors.map((err, i) => (
                <li key={i} className="text-sm">{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <Alert className="border-warning/20 bg-warning-light">
          <Info className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">⚠️ Advertencias</AlertTitle>
          <AlertDescription className="text-warning">
            <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
              {validation.warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Discrepancias detectadas */}
      {discrepancies.length > 0 && (
        <Alert className="border-warning/20 bg-warning-light">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">🔍 Discrepancias Detectadas</AlertTitle>
          <AlertDescription className="text-warning">
            <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
              {discrepancies.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
            
            {/* Corrección propuesta */}
            {proposedFix && (
              <div className="mt-4 p-3 bg-card rounded-md border border-warning/20">
                <p className="font-semibold text-warning flex items-center gap-2">
                  💡 Corrección Sugerida
                </p>
                <p className="text-sm text-foreground mt-1 font-medium">{proposedFix.what}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Motivo:</strong> {proposedFix.why}
                </p>
                {onApplyFix && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="mt-3 border-warning/30 hover:bg-warning/10 text-warning"
                    onClick={onApplyFix}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Aplicar Corrección
                  </Button>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
