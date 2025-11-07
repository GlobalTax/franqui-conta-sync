import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, FileText, CreditCard, CheckCircle2 } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useEffect, useState } from "react";
import { getInvoiceCount, getBankTransactionCount } from "@/lib/supabase-queries";
import { supabase } from "@/integrations/supabase/client";
import type { Invoice } from "@/types/accounting";

const Dashboard = () => {
  const { currentMembership, loading } = useOrganization();
  const [stats, setStats] = useState({
    pendingInvoices: 0,
    monthlyTotal: 0,
    bankTransactions: 0,
    reconciliationRate: 0,
  });

  useEffect(() => {
    if (!currentMembership) return;

    const fetchStats = async () => {
      try {
        // Fetch pending invoices count
        const { count: invoiceCount } = await getInvoiceCount(
          currentMembership.organization_id,
          "pending",
          currentMembership.restaurant_id || undefined
        );

        // Fetch monthly total
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const { data: monthlyInvoices } = await supabase
          .from("invoices" as any)
          .select("total")
          .eq("organization_id", currentMembership.organization_id)
          .gte("issue_date", startOfMonth.toISOString().split("T")[0]);

        const monthlyTotal = ((monthlyInvoices as unknown as Invoice[]) || []).reduce(
          (sum, inv) => sum + Number(inv.total),
          0
        );

        // Fetch bank transactions count
        const { count: bankCount } = await getBankTransactionCount(
          currentMembership.organization_id,
          "pending"
        );

        setStats({
          pendingInvoices: invoiceCount || 0,
          monthlyTotal,
          bankTransactions: bankCount || 0,
          reconciliationRate: 0, // TODO: Calculate actual rate
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, [currentMembership]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!currentMembership) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-medium">No tienes acceso a ninguna organización</p>
          <p className="text-muted-foreground mt-2">Contacta con un administrador para obtener acceso</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            {currentMembership.organization?.name || "Cargando..."} - {currentMembership.restaurant?.nombre || "Todas las ubicaciones"}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Facturas Pendientes
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
              <p className="text-xs text-muted-foreground">
                Requieren revisión
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Transacciones Bancarias
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.bankTransactions}</div>
              <p className="text-xs text-muted-foreground">
                Sin conciliar
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tasa Conciliación
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.reconciliationRate}%</div>
              <p className="text-xs text-muted-foreground">
                Objetivo: 95%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Gastos del Mes
              </CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.monthlyTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
              </div>
              <p className="text-xs text-muted-foreground">
                Mes actual
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success-light">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Sistema configurado</p>
                    <p className="text-xs text-muted-foreground">
                      Listo para empezar • Ahora
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Próximos Pasos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Crear Plan de Cuentas</p>
                    <p className="text-xs text-muted-foreground">Configure su estructura contable</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Subir Primera Factura</p>
                    <p className="text-xs text-muted-foreground">Pruebe el sistema OCR</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Importar Extractos Bancarios</p>
                    <p className="text-xs text-muted-foreground">Comience la conciliación</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
