import { useReconciliationSuggestions } from "@/hooks/useReconciliationSuggestions";
import { useConfirmReconciliation } from "@/hooks/useBankReconciliation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Eye, FileText, Receipt, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { ReconciliationMatchAnimation } from "./ReconciliationMatchAnimation";

interface ReconciliationSuggestionsListProps {
  transactionId: string | null;
  onReconcileSuccess?: () => void;
}

export const ReconciliationSuggestionsList = ({
  transactionId,
  onReconcileSuccess,
}: ReconciliationSuggestionsListProps) => {
  const { data: suggestions = [], isLoading } = useReconciliationSuggestions(transactionId);
  const { mutate: confirmReconciliation } = useConfirmReconciliation();
  const [showSuccess, setShowSuccess] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const getConfidenceVariant = (confidence: number) => {
    if (confidence >= 90) return "default";
    if (confidence >= 70) return "secondary";
    return "outline";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "bg-green-100 text-green-700 border-green-300";
    if (confidence >= 70) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-gray-100 text-gray-700 border-gray-300";
  };

  const handleReconcile = (suggestionId: string) => {
    confirmReconciliation(suggestionId, {
      onSuccess: () => {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        onReconcileSuccess?.();
      },
    });
  };

  if (!transactionId) {
    return (
      <div className="flex items-center justify-center h-full p-8 bg-muted/20">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Selecciona una transacción para ver sugerencias de conciliación
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 bg-muted/20 h-full">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      {showSuccess && <ReconciliationMatchAnimation />}

      <div className="h-full flex flex-col bg-muted/20">
        <div className="p-4 border-b border-border/40 bg-card/50">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Sugerencias de Conciliación
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {suggestions.length} coincidencias encontradas
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {suggestions.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  No se encontraron sugerencias automáticas
                </p>
                <Button variant="outline" size="sm">
                  Conciliar Manualmente
                </Button>
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <Card
                  key={suggestion.id}
                  className="hover:shadow-md transition-shadow cursor-pointer border-border/40"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm text-foreground">
                            {suggestion.document_type === "invoice"
                              ? `Factura #${suggestion.document_number}`
                              : suggestion.document_type === "daily_closure"
                              ? `Cierre Diario`
                              : `Documento #${suggestion.document_number}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.supplier_name || "Sin proveedor"}
                          </p>
                        </div>
                      </div>

                      <Badge className={getConfidenceColor(suggestion.confidence_score || 0)}>
                        {suggestion.confidence_score || 0}% confianza
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Importe</p>
                        <p className="font-medium text-foreground">
                          {formatCurrency(suggestion.amount || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha</p>
                        <p className="font-medium text-foreground">
                          {suggestion.document_date
                            ? format(new Date(suggestion.document_date), "dd/MM/yyyy", { locale: es })
                            : "-"}
                        </p>
                      </div>
                    </div>

                    {suggestion.match_reason && (
                      <div className="bg-muted/50 p-3 rounded-md text-xs mb-3 border border-border/40">
                        <p className="text-muted-foreground whitespace-pre-line">
                          {suggestion.match_reason}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => handleReconcile(suggestion.id)}
                              className="flex-1"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Conciliar
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Aprobar esta conciliación automática</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Ver detalles del documento</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};
