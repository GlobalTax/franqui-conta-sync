import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, ChevronDown, AlertTriangle } from "lucide-react";
import { useState } from "react";
import type { NormalizationChange } from "@/lib/fiscal-normalizer";

interface NormalizationChangesAlertProps {
  changes: NormalizationChange[];
  warnings: string[];
}

export function NormalizationChangesAlert({
  changes,
  warnings,
}: NormalizationChangesAlertProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (changes.length === 0 && warnings.length === 0) {
    return null;
  }

  const getRuleLabel = (rule: string): string => {
    const labels: Record<string, string> = {
      NORMALIZE_VAT_FORMAT: "NIF/CIF normalizado",
      NORMALIZE_INVOICE_NUMBER: "Nº factura limpiado",
      NORMALIZE_LEGAL_NAME: "Razón social normalizada",
      ROUND_CURRENCY: "Importe redondeado",
      DEFAULT_CURRENCY_EUR: "Moneda EUR por defecto",
      EXTRACT_CENTRE_CODE: "Código centro detectado",
    };
    return labels[rule] || rule;
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      "issuer.vat_id": "NIF/CIF Emisor",
      "receiver.vat_id": "NIF/CIF Receptor",
      invoice_number: "Nº Factura",
      "issuer.name": "Razón Social Emisor",
      "receiver.name": "Razón Social Receptor",
      "totals.currency": "Moneda",
      "totals.base_10": "Base 10%",
      "totals.vat_10": "IVA 10%",
      "totals.base_21": "Base 21%",
      "totals.vat_21": "IVA 21%",
      "totals.total": "Total",
      detected_centre_code: "Código Centro",
    };

    // Manejar líneas dinámicamente (ej. lines[0].quantity)
    if (field.startsWith("lines[")) {
      const match = field.match(/lines\[(\d+)\]\.(\w+)/);
      if (match) {
        const [, index, prop] = match;
        const propLabels: Record<string, string> = {
          quantity: "Cantidad",
          unit_price: "Precio unitario",
          amount: "Importe",
        };
        return `Línea ${parseInt(index) + 1} - ${propLabels[prop] || prop}`;
      }
    }

    return labels[field] || field;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Alert className="border-success/40 bg-success/5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm font-semibold text-foreground">
                Normalización Fiscal Aplicada
              </span>
            </div>
            <AlertDescription className="text-xs text-muted-foreground">
              {changes.length > 0 && (
                <span>
                  {changes.length} campo(s) normalizado(s) según PGC España
                </span>
              )}
              {warnings.length > 0 && (
                <span className="ml-2 text-warning">
                  · {warnings.length} advertencia(s)
                </span>
              )}
            </AlertDescription>
          </div>
          <CollapsibleTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="mt-3 space-y-3">
          {/* Cambios aplicados */}
          {changes.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Cambios Aplicados
              </div>
              <div className="space-y-1.5">
                {changes.map((change, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 text-xs bg-background/50 rounded-md p-2 border border-border/30"
                  >
                    <Badge
                      variant="outline"
                      className="shrink-0 text-[10px] px-1.5 py-0.5 h-auto"
                    >
                      {getRuleLabel(change.rule)}
                    </Badge>
                    <div className="flex-1 space-y-0.5">
                      <div className="font-medium text-foreground">
                        {getFieldLabel(change.field)}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span className="line-through">{String(change.before)}</span>
                        <span>→</span>
                        <span className="text-success font-medium">
                          {String(change.after)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advertencias */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-warning uppercase tracking-wide flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Advertencias
              </div>
              <div className="space-y-1">
                {warnings.map((warning, index) => (
                  <div
                    key={index}
                    className="text-xs bg-warning/5 rounded-md p-2 border border-warning/20 text-warning-foreground"
                  >
                    {warning}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Alert>
    </Collapsible>
  );
}
