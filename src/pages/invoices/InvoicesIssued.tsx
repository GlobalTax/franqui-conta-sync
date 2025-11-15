import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useInvoicesIssued } from '@/hooks/useInvoicesIssued';
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge';
import { Plus, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function InvoicesIssued() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const { data: invoices, isLoading } = useInvoicesIssued({ page, pageSize });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Facturas Emitidas</h1>
            <p className="text-muted-foreground mt-2">Gestiona las facturas a clientes</p>
          </div>
          <Button onClick={() => navigate('/facturas/emitidas/nueva')}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Factura
          </Button>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <h2 className="text-lg font-semibold">Listado de Facturas</h2>
          </div>
          <div className="p-4">
            {invoices && invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-4 flex-1">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{invoice.full_invoice_number}</h3>
                          <InvoiceStatusBadge status={invoice.status} type="issued" />
                        </div>
                        <p className="text-sm text-muted-foreground">{invoice.customer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(invoice.invoice_date), 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-bold">{invoice.total.toFixed(2)} €</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">No hay facturas emitidas</h3>
                <Button onClick={() => navigate('/facturas/emitidas/nueva')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Factura
                </Button>
              </div>
            )}
          </div>
          {invoices && invoices.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!invoices || invoices.length < pageSize}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
