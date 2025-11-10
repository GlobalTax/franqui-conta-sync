// ============================================================================
// COMPONENT: MergeDocumentsDialog
// Diálogo para fusionar múltiples PDFs en un único documento
// ============================================================================

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { GripVertical, FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SortableItemProps {
  id: string;
  invoice: any;
  index: number;
}

function SortableItem({ id, invoice, index }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm font-medium">{index + 1}.</span>
        <FileText className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">{invoice.invoice_number}</p>
          <p className="text-xs text-muted-foreground">
            {invoice.ocr_pages || 1} página{(invoice.ocr_pages || 1) > 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

interface MergeDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: any[];
  onConfirm: (primaryInvoiceId: string, order: string[]) => void;
  isLoading?: boolean;
}

export function MergeDocumentsDialog({
  open,
  onOpenChange,
  invoices,
  onConfirm,
  isLoading = false,
}: MergeDocumentsDialogProps) {
  const [orderedInvoices, setOrderedInvoices] = useState(invoices);
  const [primaryInvoiceId, setPrimaryInvoiceId] = useState(invoices[0]?.id || '');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedInvoices((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const totalPages = orderedInvoices.reduce((sum, inv) => sum + (inv.ocr_pages || 1), 0);

  const handleConfirm = () => {
    onConfirm(
      primaryInvoiceId,
      orderedInvoices.map(inv => inv.id)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Juntar Documentos</DialogTitle>
          <DialogDescription>
            {invoices.length} documento{invoices.length > 1 ? 's' : ''} seleccionado{invoices.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Orden de fusión (arrastra para reordenar)
            </Label>
            <ScrollArea className="max-h-[300px] pr-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedInvoices.map(inv => inv.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {orderedInvoices.map((invoice, index) => (
                      <SortableItem
                        key={invoice.id}
                        id={invoice.id}
                        invoice={invoice}
                        index={index}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </ScrollArea>
          </div>

          <Separator />

          <div>
            <Label htmlFor="primary-invoice" className="text-sm font-medium mb-2 block">
              Factura principal (conservar datos contables)
            </Label>
            <Select value={primaryInvoiceId} onValueChange={setPrimaryInvoiceId} disabled={isLoading}>
              <SelectTrigger id="primary-invoice">
                <SelectValue placeholder="Selecciona factura principal" />
              </SelectTrigger>
              <SelectContent>
                {orderedInvoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} - {invoice.supplier?.name || 'Sin proveedor'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Los datos de esta factura se conservarán en el documento fusionado
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p>ℹ️ Se creará 1 documento con <strong>{totalPages}</strong> página{totalPages > 1 ? 's' : ''}</p>
                <p className="text-muted-foreground">
                  ⚠️ Las otras {invoices.length - 1} factura{invoices.length - 1 > 1 ? 's' : ''} se eliminarán permanentemente
                </p>
              </div>
            </AlertDescription>
          </Alert>
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
            disabled={!primaryInvoiceId || isLoading}
          >
            {isLoading ? 'Fusionando...' : 'Juntar Documentos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
