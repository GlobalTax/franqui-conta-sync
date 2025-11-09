import { FileText, Filter, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InboxEmptyStateProps {
  variant: 'no-invoices' | 'no-results' | 'all-processed';
  onClearFilters?: () => void;
  onNewInvoice?: () => void;
}

export function InboxEmptyState({ variant, onClearFilters, onNewInvoice }: InboxEmptyStateProps) {
  if (variant === 'no-invoices') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay facturas en tu bandeja</h3>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
          Crea la primera factura o importa desde OCR para comenzar
        </p>
        <div className="flex gap-3">
          <Button onClick={onNewInvoice}>
            Nueva Factura
          </Button>
          <Button variant="outline" onClick={onNewInvoice}>
            Importar con OCR
          </Button>
        </div>
      </div>
    );
  }

  if (variant === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Filter className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No se encontraron facturas</h3>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
          Prueba ajustando los filtros o búsqueda
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          Limpiar Filtros
        </Button>
      </div>
    );
  }

  // all-processed
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
      <h3 className="text-lg font-semibold mb-2">¡Bandeja vacía! ✅</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        Todas las facturas están procesadas
      </p>
    </div>
  );
}
