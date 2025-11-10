import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Zap, Shield } from 'lucide-react';

interface ReprocessOCRSimpleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  onConfirm: (engine: 'openai' | 'mindee') => Promise<void>;
  isLoading?: boolean;
}

export function ReprocessOCRSimpleDialog({
  open,
  onOpenChange,
  invoiceId,
  onConfirm,
  isLoading = false
}: ReprocessOCRSimpleDialogProps) {
  const [engine, setEngine] = useState<'openai' | 'mindee'>('openai');

  const handleConfirm = async () => {
    await onConfirm(engine);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reintentar OCR</DialogTitle>
          <DialogDescription>
            Selecciona el motor de reconocimiento para re-procesar el documento
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={engine} onValueChange={(v) => setEngine(v as 'openai' | 'mindee')}>
          <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent cursor-pointer">
            <RadioGroupItem value="openai" id="openai" />
            <Label htmlFor="openai" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 font-medium">
                <Zap className="h-4 w-4 text-green-600" />
                OpenAI Vision
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Rápido · Multilenguaje · GPT-4 Vision
              </p>
            </Label>
          </div>

          <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent cursor-pointer">
            <RadioGroupItem value="mindee" id="mindee" />
            <Label htmlFor="mindee" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 font-medium">
                <Shield className="h-4 w-4 text-blue-600" />
                Mindee
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Preciso · Datos en UE · Especializado facturas
              </p>
            </Label>
          </div>
        </RadioGroup>

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
