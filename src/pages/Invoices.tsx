import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/hooks/useOrganization";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  total: number;
  status: string;
  supplier_id: string | null;
  restaurant_id: string;
}

const Invoices = () => {
  const { currentMembership, loading } = useOrganization();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  useEffect(() => {
    if (!currentMembership) return;

    const fetchInvoices = async () => {
      try {
        let query = supabase
          .from("invoices" as any)
          .select("*")
          .eq("organization_id", currentMembership.organization_id)
          .order("issue_date", { ascending: false });

        if (currentMembership.restaurant_id) {
          query = query.eq("restaurant_id", currentMembership.restaurant_id);
        }

        const { data, error } = await query;
        if (error) throw error;

        setInvoices((data as unknown) as Invoice[]);
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setLoadingInvoices(false);
      }
    };

    fetchInvoices();
  }, [currentMembership]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-success-light text-success hover:bg-success-light">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Aprobada
          </Badge>
        );
      case "review":
        return (
          <Badge className="bg-warning-light text-warning hover:bg-warning-light">
            <AlertCircle className="mr-1 h-3 w-3" />
            En Revisión
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <FileText className="mr-1 h-3 w-3" />
            Pendiente
          </Badge>
        );
    }
  };

  if (loading || loadingInvoices) {
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
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Subir Factura
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Facturas</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No hay facturas</h3>
                <p className="text-muted-foreground mt-2">
                  Comienza subiendo tu primera factura
                </p>
                <Button className="mt-4 gap-2">
                  <Upload className="h-4 w-4" />
                  Subir Primera Factura
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
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {invoice.invoice_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(invoice.issue_date).toLocaleDateString('es-ES')}
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
                      {getStatusBadge(invoice.status)}
                      <Button variant="ghost" size="sm">
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
