// ============================================================================
// OCR BOTTOM BAR
// Barra inferior con acciones masivas para facturas seleccionadas
// ============================================================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBulkInvoiceActions } from "@/hooks/useBulkInvoiceActions";
import { useOrganization } from "@/hooks/useOrganization";
import { CheckCircle2, X, Building2 } from "lucide-react";
import { toast } from "sonner";

interface OCRBottomBarProps {
  selectedIds: string[];
  onClear: () => void;
  onSuccess: () => void;
}

export function OCRBottomBar({ selectedIds, onClear, onSuccess }: OCRBottomBarProps) {
  const { currentMembership } = useOrganization();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { bulkApprove, isLoading: isBulkLoading } = useBulkInvoiceActions();

  const handleBulkApprove = async () => {
    if (!currentMembership) {
      toast.error("No hay membresía activa");
      return;
    }

    setIsProcessing(true);

    try {
      bulkApprove({
        invoiceIds: selectedIds,
        comments: 'Aprobación masiva desde OCR Inbox',
      });

      toast.success(`${selectedIds.length} facturas aprobadas correctamente`);
      onSuccess();
    } catch (error) {
      console.error('Error bulk approve:', error);
      toast.error('Error al aprobar facturas');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="container mx-auto p-6">
        <Card className="shadow-xl pointer-events-auto border-2 border-primary/20">
          <div className="p-4 flex items-center justify-between">
            {/* Selected Count */}
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-base px-4 py-2">
                {selectedIds.length} seleccionadas
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                disabled={isProcessing}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleBulkApprove}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Aprobar seleccionadas
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
