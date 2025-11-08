import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, FileText, CreditCard, CheckCircle2 } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useDashboardKPIs } from "@/hooks/useDashboardKPIs";
import { useEvolutionCharts } from "@/hooks/useEvolutionCharts";
import { IncomeVsExpensesChart } from "@/components/charts/IncomeVsExpensesChart";
import { ExpensesCategoryChart } from "@/components/charts/ExpensesCategoryChart";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const Dashboard = () => {
  const { currentMembership, loading } = useOrganization();
  const centroCode = currentMembership?.restaurant?.id || "";

  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: charts, isLoading: chartsLoading } = useEvolutionCharts(centroCode, 6);

  // Últimas 5 facturas recibidas
  const { data: recentInvoices } = useQuery({
    queryKey: ["recent-invoices", centroCode],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices_received")
        .select("*")
        .eq("centro_code", centroCode)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!centroCode,
  });

  // Últimos 5 asientos contables
  const { data: recentEntries } = useQuery({
    queryKey: ["recent-entries", centroCode],
    queryFn: async () => {
      const { data } = await supabase
        .from("accounting_entries")
        .select("*")
        .eq("centro_code", centroCode)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!centroCode,
  });

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

        {/* KPIs Principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Facturas Pendientes
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpis?.invoicesReceivedPending || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Facturas recibidas
                  </p>
                </>
              )}
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
              {kpisLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpis?.unreconciledTransactions || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Sin conciliar
                  </p>
                </>
              )}
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
              {kpisLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpis?.reconciliationRate || 0}%</div>
                  <p className="text-xs text-muted-foreground">
                    Objetivo: 95%
                  </p>
                </>
              )}
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
              {kpisLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {(kpis?.monthlyExpenses || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mes actual
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gráficos de Evolución */}
        <div className="grid gap-4 md:grid-cols-2">
          {chartsLoading ? (
            <>
              <Card>
                <CardContent className="pt-6">
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {charts?.monthlyTrend && <IncomeVsExpensesChart data={charts.monthlyTrend} />}
              {charts?.expenseCategories && <ExpensesCategoryChart data={charts.expenseCategories} />}
            </>
          )}
        </div>

        {/* Actividad Reciente */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Últimas Facturas Recibidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentInvoices && recentInvoices.length > 0 ? (
                  recentInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(invoice.invoice_date), "dd/MM/yyyy")} • {Number(invoice.total).toFixed(2)}€
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        invoice.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-green-500/10 text-green-600'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No hay facturas recientes</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Últimos Asientos Contables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentEntries && recentEntries.length > 0 ? (
                  recentEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">#{entry.entry_number} - {entry.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.entry_date), "dd/MM/yyyy")} • {Number(entry.total_debit).toFixed(2)}€
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        entry.status === 'draft' ? 'bg-gray-500/10 text-gray-600' : 'bg-green-500/10 text-green-600'
                      }`}>
                        {entry.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No hay asientos recientes</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
