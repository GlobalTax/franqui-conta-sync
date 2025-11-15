import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Eye, Calendar, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Invoice {
  id: string;
  full_invoice_number: string;
  customer_name: string;
  invoice_date: string;
  total: number;
  status: string;
  centro_code: string;
}

interface InvoicesIssuedVirtualListProps {
  invoices: Invoice[];
  onInvoiceClick: (invoice: Invoice) => void;
}

export function InvoicesIssuedVirtualList({ 
  invoices, 
  onInvoiceClick 
}: InvoicesIssuedVirtualListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: invoices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96, // altura de cada tarjeta
    overscan: 5,
  });

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No hay facturas emitidas</p>
        <p className="text-sm">Las facturas aparecerán aquí cuando las crees</p>
      </div>
    );
  }

  return (
    <div 
      ref={parentRef} 
      className="h-[calc(100vh-280px)] overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const invoice = invoices[virtualRow.index];
          
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                paddingBottom: '8px',
              }}
            >
              <Card 
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onInvoiceClick(invoice)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                      <h3 className="font-semibold text-lg truncate">
                        {invoice.full_invoice_number}
                      </h3>
                      <Badge 
                        variant={
                          invoice.status === 'paid' ? 'default' :
                          invoice.status === 'pending' ? 'secondary' :
                          invoice.status === 'overdue' ? 'destructive' :
                          'outline'
                        }
                      >
                        {invoice.status === 'paid' ? 'Pagada' :
                         invoice.status === 'pending' ? 'Pendiente' :
                         invoice.status === 'overdue' ? 'Vencida' :
                         invoice.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        <span className="truncate">{invoice.customer_name}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(invoice.invoice_date), 'dd MMM yyyy', { locale: es })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {invoice.total.toLocaleString('es-ES', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} €
                      </p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInvoiceClick(invoice);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
