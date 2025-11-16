import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInvoicesIssued } from "@/hooks/useInvoicesIssued";
import { InvoicesIssuedVirtualList } from "@/components/invoices/InvoicesIssuedVirtualList";
import { InvoiceQueries } from "@/infrastructure/persistence/supabase/queries/InvoiceQueries";
import { useOrganization } from "@/hooks/useOrganization";
import { useListNavigationShortcuts } from "@/lib/shortcuts/ShortcutManager";

export default function InvoicesIssued() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentMembership } = useOrganization();
  const [page, setPage] = useState(0);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pageSize = 50;
  const { data: invoices = [], isLoading } = useInvoicesIssued({ page, pageSize });

  // 🎹 Navegación por teclado j/k
  useListNavigationShortcuts(
    invoices,
    selectedIndex,
    setSelectedIndex,
    (invoice) => navigate(`/facturas/emitidas/${invoice.id}`)
  );

  const prefetchNextPage = async () => {
    if (isPrefetching || invoices.length < pageSize) return;
    
    setIsPrefetching(true);
    
    try {
      const selectedCentro = currentMembership?.restaurant?.codigo;
      
      await queryClient.prefetchQuery({
        queryKey: ['invoices_issued', { page: page + 1, pageSize }, selectedCentro, page + 1],
        queryFn: async () => {
          const domainInvoices = await InvoiceQueries.findInvoicesIssued({
            centroCode: selectedCentro,
            page: page + 1,
            pageSize,
          });
          
          return domainInvoices.map(inv => ({
            id: inv.id,
            centro_code: inv.centroCode,
            customer_name: inv.customerName,
            full_invoice_number: inv.fullInvoiceNumber,
            invoice_date: inv.invoiceDate,
            total: inv.total,
            status: inv.status,
          }));
        },
        staleTime: 5 * 60 * 1000,
      });
      
      console.log(`✅ Prefetch: Página ${page + 1} precargada`);
    } catch (error) {
      console.error('Error prefetching:', error);
    } finally {
      setIsPrefetching(false);
    }
  };

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
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando facturas...</p>
            </div>
          ) : (
            <InvoicesIssuedVirtualList
              invoices={invoices}
              onInvoiceClick={(invoice) => navigate(`/facturas/emitidas/${invoice.id}`)}
              currentPage={page}
              totalInPage={invoices.length}
              onNearEnd={prefetchNextPage}
              selectedIndex={selectedIndex}
            />
          )}
          
          {invoices.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page + 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={invoices.length < pageSize}
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
