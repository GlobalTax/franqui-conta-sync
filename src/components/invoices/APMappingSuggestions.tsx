import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, CheckCircle, TrendingUp, Info } from "lucide-react";
import type { APMappingSuggestion } from "@/hooks/useInvoiceOCR";

interface Props {
  invoiceSuggestion: APMappingSuggestion;
  lineSuggestions: APMappingSuggestion[];
  onAcceptAll: () => void;
  onAcceptInvoice: () => void;
}

export function APMappingSuggestions({ 
  invoiceSuggestion, 
  lineSuggestions,
  onAcceptAll,
  onAcceptInvoice
}: Props) {
  
  const getConfidenceBadge = (score: number) => {
    if (score >= 80) return { label: "Alta", className: "bg-success-light text-success border-success" };
    if (score >= 50) return { label: "Media", className: "bg-warning-light text-warning border-warning" };
    return { label: "Baja", className: "bg-destructive/10 text-destructive border-destructive" };
  };

  const confidenceBadge = getConfidenceBadge(invoiceSuggestion.confidence_score);

  return (
    <div className="space-y-4">
      {/* Sugerencia a nivel de factura */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h4 className="font-semibold text-lg">
              Sugerencia Automática de Cuentas
            </h4>
          </div>
          <Badge className={confidenceBadge.className}>
            {confidenceBadge.label} ({invoiceSuggestion.confidence_score}%)
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-card p-3 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-1">Cuenta de Gasto</p>
            <p className="font-mono font-bold text-lg text-primary">
              {invoiceSuggestion.account_suggestion}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {invoiceSuggestion.matched_rule_name || 'Regla por defecto'}
            </p>
          </div>

          <div className="bg-card p-3 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-1">IVA Soportado</p>
            <p className="font-mono font-bold text-lg text-foreground">
              {invoiceSuggestion.tax_account}
            </p>
          </div>

          <div className="bg-card p-3 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-1">Proveedores</p>
            <p className="font-mono font-bold text-lg text-foreground">
              {invoiceSuggestion.ap_account}
            </p>
          </div>
        </div>

        <Alert className="bg-card border-primary/20 mb-4">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-foreground">💡 Justificación</AlertTitle>
          <AlertDescription className="text-muted-foreground text-sm">
            {invoiceSuggestion.rationale}
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button 
            onClick={onAcceptAll}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Aceptar Todas las Sugerencias
          </Button>
          
          <Button 
            variant="outline"
            onClick={onAcceptInvoice}
            className="border-primary/30 hover:bg-primary/10"
          >
            Aceptar Solo Factura
          </Button>
        </div>
      </Card>

      {/* Sugerencias por línea */}
      {lineSuggestions.length > 0 && (
        <Card className="p-6">
          <h5 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Sugerencias por Línea de Factura
          </h5>
          
          <div className="space-y-2">
            {lineSuggestions.map((suggestion, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Línea {index + 1}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.rationale}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-mono font-bold text-primary">
                    {suggestion.account_suggestion}
                  </p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {suggestion.confidence_score}% confianza
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
