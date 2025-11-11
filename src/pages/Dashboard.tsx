import { Card, CardContent } from "@/components/ui/card";
import { Euro, Users, TrendingUp, AlertCircle } from "lucide-react";
import { useView } from "@/contexts/ViewContext";
import { useDashboardMain } from "@/hooks/useDashboardMain";
import { KPICard } from "@/components/dashboard/KPICard";
import { SalesByChannelChart } from "@/components/dashboard/SalesByChannelChart";
import { TreasuryCard } from "@/components/dashboard/TreasuryCard";
import { IncidentsCard } from "@/components/dashboard/IncidentsCard";
import { IVASummaryChart } from "@/components/dashboard/IVASummaryChart";
import { OCRQuickAccessCard } from "@/components/invoices/OCRQuickAccessCard";

const Dashboard = () => {
  const { selectedView } = useView();
  const { data, isLoading } = useDashboardMain(selectedView);

  if (!selectedView) {
    return (
      <div className="container mx-auto py-6">
        <Card className="p-12">
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-semibold">Bienvenido al Dashboard</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Por favor, selecciona una sociedad (vista consolidada) o un centro individual 
              en el selector superior para comenzar a ver tus métricas financieras.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Operativo</h1>
            <p className="text-sm text-muted-foreground">
              Vista en tiempo real • {selectedView.type === 'company' ? 'Consolidado' : selectedView.name}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Acceso Rápido OCR */}
        <OCRQuickAccessCard />

        {/* KPIs Principales */}
        <div className="grid gap-6 md:grid-cols-3">
          <KPICard 
            title="Ventas Día"
            value={data.dailySales}
            icon={Euro}
            format="currency"
            variant="accent"
          />
          <KPICard 
            title="Coste Laboral"
            subtitle="Mes actual"
            value={data.laborCost}
            icon={Users}
            format="currency"
            variant="default"
          />
          <KPICard 
            title="Margen Neto"
            subtitle="% sobre ventas"
            value={data.netMarginPercent}
            icon={TrendingUp}
            format="percentage"
            variant="success"
          />
        </div>

        {/* Gráficos y Cards */}
        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-8">
            <SalesByChannelChart data={data.salesByChannel} />
          </div>
          <div className="md:col-span-4">
            <TreasuryCard 
              bankBalance={data.bankBalance}
              cashAudit={data.cashAudit}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          <div className="md:col-span-8">
            <IncidentsCard incidents={data.incidents} />
          </div>
          <div className="md:col-span-4">
            <IVASummaryChart ivaSummary={data.ivaSummary} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
