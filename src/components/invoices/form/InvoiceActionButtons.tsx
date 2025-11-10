// ============================================================================
// INVOICE ACTION BUTTONS
// Botones de acción del formulario (Confirmar, Guardar, Ignorar, Cancelar)
// ============================================================================

import { Button } from '@/components/ui/button';
import { FileCheck, Save, Ban, X } from 'lucide-react';
import { useMemo } from 'react';

interface InvoiceActionButtonsProps {
  isEditMode: boolean;
  isLoading: boolean;
  isDirty: boolean;
  canPost: boolean;
  onConfirmAndPost: () => void;
  onSaveDraft: () => void;
  onIgnore: () => void;
  onCancel: () => void;
}

export function InvoiceActionButtons({
  isEditMode,
  isLoading,
  isDirty,
  canPost,
  onConfirmAndPost,
  onSaveDraft,
  onIgnore,
  onCancel
}: InvoiceActionButtonsProps) {
  return (
    <div className="sticky bottom-0 bg-background border-t shadow-lg p-4 mt-8">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          {/* Cancelar */}
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>

          {/* Ignorar */}
          {isEditMode && (
            <Button
              type="button"
              variant="outline"
              onClick={onIgnore}
              disabled={isLoading}
            >
              <Ban className="h-4 w-4 mr-2" />
              Ignorar
            </Button>
          )}

          {/* Guardar sin contabilizar */}
          <Button
            type="button"
            variant="secondary"
            onClick={onSaveDraft}
            disabled={isLoading || !isDirty}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar sin contabilizar
          </Button>

          {/* Confirmar y Contabilizar */}
          <Button
            type="button"
            size="lg"
            className="bg-primary hover:bg-primary/90"
            disabled={!canPost || isLoading}
            onClick={onConfirmAndPost}
          >
            <FileCheck className="h-5 w-5 mr-2" />
            Confirmar y Contabilizar
          </Button>
        </div>

        {/* Mensajes de ayuda */}
        {!canPost && (
          <p className="text-sm text-muted-foreground text-center mt-3">
            Completa todos los campos obligatorios para contabilizar
          </p>
        )}
      </div>
    </div>
  );
}
