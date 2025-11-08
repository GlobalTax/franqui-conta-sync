import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "./KPICard";
import { ProgressTable } from "./ProgressTable";
import { IncomeVsExpensesChart } from "@/components/charts/IncomeVsExpensesChart";
import { ExpensesCategoryChart } from "@/components/charts/ExpensesCategoryChart";
import { Euro, FileText, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ResultadoTabProps {
  kpis: any;
  charts: any;
  recentInvoices: any[];
}

export const ResultadoTab = ({ kpis, charts, recentInvoices }: ResultadoTabProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* KPIs Principales */}
      <div className="grid gap-6 md:grid-cols-3">
        <KPICard
          title="Ingresos del Mes"
          subtitle="Facturación"
          value={kpis?.monthlyExpenses ? kpis.monthlyExpenses * 1.5 : 0}
          previousValue={kpis?.monthlyExpenses ? kpis.monthlyExpenses * 1.35 : 0}
          icon={Euro}
          format="currency"
        />
        
        <KPICard
          title="Gastos del Mes"
          subtitle="Mes actual"
          value={kpis?.monthlyExpenses || 0}
          previousValue={(kpis?.monthlyExpenses || 0) * 0.92}
          icon={Euro}
          format="currency"
        />
        
        <KPICard
          title="Resultado Neto"
          subtitle="Beneficio/Pérdida"
          value={kpis?.monthlyExpenses ? kpis.monthlyExpenses * 0.5 : 0}
          previousValue={kpis?.monthlyExpenses ? kpis.monthlyExpenses * 0.43 : 0}
          icon={TrendingUp}
          format="currency"
        />
      </div>

      {/* Gráficos de Evolución */}
      <div className="grid gap-6 md:grid-cols-2">
        {charts?.monthlyTrend && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">EVOLUCIÓN DE INGRESOS VS GASTOS</CardTitle>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded" />
                  <span className="text-muted-foreground">Ingresos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-destructive rounded" />
                  <span className="text-muted-foreground">Gastos</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <IncomeVsExpensesChart data={charts.monthlyTrend} />
            </CardContent>
          </Card>
        )}
        {charts?.expenseCategories && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">GASTOS POR CATEGORÍA</CardTitle>
              <p className="text-sm text-muted-foreground">Distribución del mes actual</p>
            </CardHeader>
            <CardContent>
              <ExpensesCategoryChart data={charts.expenseCategories} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tablas con Progreso */}
      <div className="grid gap-6 md:grid-cols-2">
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

        <ProgressTable
          title="GASTOS POR CATEGORÍA"
          subtitle="Mes actual"
          items={[
            { 
              name: "Personal", 
              amount: 35000, 
              percentage: 45,
              color: "bg-gradient-to-r from-red-500 to-red-400"
            },
            { 
              name: "Proveedores", 
              amount: 25000, 
              percentage: 32,
              color: "bg-gradient-to-r from-orange-500 to-orange-400"
            },
            { 
              name: "Alquileres", 
              amount: 18000, 
              percentage: 23,
              color: "bg-gradient-to-r from-yellow-500 to-yellow-400"
            },
          ]}
          onViewDetails={() => navigate("/accounting-entries")}
        />
      </div>
    </div>
  );
};
