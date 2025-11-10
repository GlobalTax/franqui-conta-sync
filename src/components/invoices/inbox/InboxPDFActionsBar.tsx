// ============================================================================
// COMPONENT: InboxPDFActionsBar
// Barra inferior sticky con acciones de manipulación PDF y contabilización
// ============================================================================

import { X, Scissors, Link2, FileCheck, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InboxPDFActionsBarProps {
  selectedCount: number;
  selectedInvoices: any[];
  canSplit: boolean;
  canMerge: boolean;
  canPost: boolean;
  onDeselect: () => void;
  onSplit: () => void;
  onMerge: () => void;
  onPost: () => void;
  onDelete: () => void;
  onNew?: () => void;
  showNewButton?: boolean;
  isLoading?: boolean;
}

export function InboxPDFActionsBar({
  selectedCount,
  selectedInvoices,
  canSplit,
  canMerge,
  canPost,
  onDeselect,
  onSplit,
  onMerge,
  onPost,
  onDelete,
  onNew,
  showNewButton = true,
  isLoading = false,
}: InboxPDFActionsBarProps) {
  // Si no hay selección y se muestra botón Nuevo
  if (selectedCount === 0 && showNewButton && onNew) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 shadow-[0_-2px_16px_rgba(0,0,0,0.1)]">
        <div className="container mx-auto max-w-7xl px-6 py-3">
          <div className="flex items-center justify-end">
            <Button
              size="default"
              onClick={onNew}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva Factura
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 shadow-[0_-2px_16px_rgba(0,0,0,0.1)]">
      <div className="container mx-auto max-w-7xl px-6 py-3">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Selection info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-foreground">
                {selectedCount} documento{selectedCount > 1 ? 's' : ''} seleccionado{selectedCount > 1 ? 's' : ''}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDeselect}
              className="h-8 gap-1.5"
            >
              <X className="h-4 w-4" />
              Deseleccionar
            </Button>
          </div>

          {/* Center: PDF Actions */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onSplit}
                    disabled={!canSplit || isLoading}
                    className="h-9 gap-2"
                  >
                    <Scissors className="h-4 w-4" />
                    Separar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Dividir documento multipágina
                    {!canSplit && <span className="block text-muted-foreground mt-1">Selecciona 1 factura con múltiples páginas</span>}
                  </p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onMerge}
                    disabled={!canMerge || isLoading}
                    className="h-9 gap-2"
                  >
                    <Link2 className="h-4 w-4" />
                    Juntar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Fusionar múltiples PDFs
                    {!canMerge && <span className="block text-muted-foreground mt-1">Selecciona al menos 2 facturas</span>}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-6" />

            {/* Right: Accounting Actions */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={onPost}
                    disabled={!canPost || isLoading}
                    className="h-9 gap-2"
                  >
                    <FileCheck className="h-4 w-4" />
                    Contabilizar ({selectedCount})
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Contabilizar facturas en lote
                    {!canPost && (
                      <span className="block text-muted-foreground mt-1">
                        Las facturas deben estar aprobadas y sin contabilizar
                      </span>
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onDelete}
                    disabled={isLoading}
                    className="h-9 gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Eliminar facturas seleccionadas</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
