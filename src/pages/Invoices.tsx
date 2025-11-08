import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useInvoicesReceived } from "@/hooks/useInvoicesReceived";
import { useGenerateEntryFromInvoiceReceived } from "@/hooks/useInvoiceToEntry";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { toast } from "sonner";

const Invoices = () => {
  const navigate = useNavigate();
  const { data: invoices, isLoading } = useInvoicesReceived();
  const generateEntry = useGenerateEntryFromInvoiceReceived();

  const handleGenerateEntry = async (invoiceId: string) => {
    try {
      await generateEntry.mutateAsync(invoiceId);
    } catch (error) {
      console.error("Error generating entry:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando facturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Facturas
            </h1>
            <p className="text-muted-foreground mt-2">
              Gestión de facturas y OCR
            </p>
          </div>
          <Button className="gap-2" onClick={() => navigate('/facturas/nueva')}>
            <Upload className="h-4 w-4" />
            Nueva Factura Recibida
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Facturas</CardTitle>
          </CardHeader>
          <CardContent>
            {!invoices || invoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No hay facturas</h3>
                <p className="text-muted-foreground mt-2">
                  Comienza creando tu primera factura recibida
                </p>
                <Button className="mt-4 gap-2" onClick={() => navigate('/facturas/nueva')}>
                  <Upload className="h-4 w-4" />
                  Nueva Factura
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Receipt className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {invoice.invoice_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.supplier?.name || 'Sin proveedor'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(invoice.invoice_date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          {Number(invoice.total).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                        </p>
                        <p className="text-sm text-muted-foreground">Total</p>
                      </div>
                      <InvoiceStatusBadge status={invoice.status} type="received" />
                      {!invoice.entry_id && invoice.status === 'approved' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleGenerateEntry(invoice.id)}
                          disabled={generateEntry.isPending}
                        >
                          {generateEntry.isPending ? 'Generando...' : 'Generar Asiento'}
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/facturas/${invoice.id}`)}
                      >
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Invoices;
