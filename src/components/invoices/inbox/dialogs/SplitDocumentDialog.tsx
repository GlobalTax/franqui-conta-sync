// ============================================================================
// COMPONENT: SplitDocumentDialog
// Diálogo para dividir un PDF multipágina en varios documentos
// ============================================================================

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SplitRange {
  id: string;
  fromPage: number;
  toPage: number;
  name: string;
}

interface SplitDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any | null;
  onConfirm: (splits: SplitRange[]) => void;
  isLoading?: boolean;
}

export function SplitDocumentDialog({
  open,
  onOpenChange,
  invoice,
  onConfirm,
  isLoading = false,
}: SplitDocumentDialogProps) {
  const totalPages = invoice?.ocr_pages || 1;
  
  const [splits, setSplits] = useState<SplitRange[]>([
    { id: crypto.randomUUID(), fromPage: 1, toPage: Math.ceil(totalPages / 2), name: 'Parte 1' },
    { id: crypto.randomUUID(), fromPage: Math.ceil(totalPages / 2) + 1, toPage: totalPages, name: 'Parte 2' },
  ]);

  const handleAddSplit = () => {
    const lastSplit = splits[splits.length - 1];
    const newFromPage = lastSplit.toPage + 1;
    
    if (newFromPage > totalPages) return;

    setSplits([...splits, {
      id: crypto.randomUUID(),
      fromPage: newFromPage,
      toPage: totalPages,
      name: `Parte ${splits.length + 1}`,
    }]);
  };

  const handleRemoveSplit = (id: string) => {
    if (splits.length <= 2) return;
    setSplits(splits.filter(s => s.id !== id));
  };

  const handleUpdateSplit = (id: string, field: keyof SplitRange, value: any) => {
    setSplits(splits.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const validateSplits = (): string | null => {
    for (const split of splits) {
      if (split.fromPage < 1 || split.toPage > totalPages) {
        return `Rango inválido en "${split.name}": páginas deben estar entre 1 y ${totalPages}`;
      }
      if (split.fromPage > split.toPage) {
        return `Rango inválido en "${split.name}": página inicial debe ser menor que la final`;
      }
      if (!split.name.trim()) {
        return 'Todas las divisiones deben tener un nombre';
      }
    }

    // Check for overlaps
    const sortedSplits = [...splits].sort((a, b) => a.fromPage - b.fromPage);
    for (let i = 0; i < sortedSplits.length - 1; i++) {
      if (sortedSplits[i].toPage >= sortedSplits[i + 1].fromPage) {
        return 'Las divisiones no pueden solaparse';
      }
    }

    return null;
  };

  const validationError = validateSplits();

  const handleConfirm = () => {
    if (validationError) return;
    onConfirm(splits.map(s => ({
      from_page: s.fromPage,
      to_page: s.toPage,
      name: s.name,
    })) as any);
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Separar Documento
          </DialogTitle>
          <DialogDescription>
            {invoice.invoice_number} - {totalPages} página{totalPages > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define cómo dividir este documento en múltiples facturas:
            </p>

            {splits.map((split, index) => (
              <div key={split.id} className="p-4 bg-muted/30 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">División {index + 1}</Label>
                  {splits.length > 2 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveSplit(split.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor={`from-${split.id}`} className="text-xs">
                      Desde página
                    </Label>
                    <Input
                      id={`from-${split.id}`}
                      type="number"
                      min={1}
                      max={totalPages}
                      value={split.fromPage}
                      onChange={(e) => handleUpdateSplit(split.id, 'fromPage', parseInt(e.target.value) || 1)}
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`to-${split.id}`} className="text-xs">
                      Hasta página
                    </Label>
                    <Input
                      id={`to-${split.id}`}
                      type="number"
                      min={1}
                      max={totalPages}
                      value={split.toPage}
                      onChange={(e) => handleUpdateSplit(split.id, 'toPage', parseInt(e.target.value) || totalPages)}
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`name-${split.id}`} className="text-xs">
                      Nombre
                    </Label>
                    <Input
                      id={`name-${split.id}`}
                      value={split.name}
                      onChange={(e) => handleUpdateSplit(split.id, 'name', e.target.value)}
                      placeholder="Ej: Parte 1"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Páginas: {split.fromPage}-{split.toPage} ({split.toPage - split.fromPage + 1} página{split.toPage - split.fromPage + 1 > 1 ? 's' : ''})
                </div>
              </div>
            ))}

            {splits.length < 10 && splits[splits.length - 1].toPage < totalPages && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddSplit}
                disabled={isLoading}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Añadir División
              </Button>
            )}
          </div>
        </ScrollArea>

        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        <Separator />

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            ℹ️ Se crearán {splits.length} nueva{splits.length > 1 ? 's' : ''} factura{splits.length > 1 ? 's' : ''} con estado "Pendiente de aprobación"
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!!validationError || isLoading}
          >
            {isLoading ? 'Dividiendo...' : 'Dividir Documento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
