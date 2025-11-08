import { Card, CardContent } from "@/components/ui/card";
import { Euro, FileText, CreditCard, CheckCircle2 } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useDashboardKPIs } from "@/hooks/useDashboardKPIs";
import { useEvolutionCharts } from "@/hooks/useEvolutionCharts";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/dashboard/KPICard";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { ResultadoTab } from "@/components/dashboard/ResultadoTab";
import { TesoreriaTab } from "@/components/dashboard/TesoreriaTab";
import { CarteraTab } from "@/components/dashboard/CarteraTab";
import { ImpuestosTab } from "@/components/dashboard/ImpuestosTab";

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
    <div className="min-h-screen bg-background">
      <DashboardTabs>
        {{
          resultado: (
            <ResultadoTab 
              kpis={kpis}
              charts={charts}
              recentInvoices={recentInvoices || []}
            />
          ),
          tesoreria: (
            <TesoreriaTab kpis={kpis} />
          ),
          cartera: (
            <CarteraTab kpis={kpis} />
          ),
          impuestos: (
            <ImpuestosTab kpis={kpis} />
          ),
        }}
      </DashboardTabs>
    </div>
  );
};

export default Dashboard;
