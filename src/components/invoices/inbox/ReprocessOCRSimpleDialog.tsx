import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ReprocessOCRSimpleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function ReprocessOCRSimpleDialog({
  open,
  onOpenChange,
  invoiceId,
  onConfirm,
  isLoading = false
}: ReprocessOCRSimpleDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reprocesar OCR</DialogTitle>
          <DialogDescription>
            ¿Confirmas que deseas reprocesar este documento con Mindee?
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground py-4">
          El motor Mindee Invoice API procesará el documento con tecnología especializada en facturas europeas para extraer todos los datos con mayor precisión.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              'Reprocesar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
