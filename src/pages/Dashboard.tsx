import { Card, CardContent } from "@/components/ui/card";
import { Euro, FileText, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { useView } from "@/contexts/ViewContext";
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
  const { selectedView } = useView();
  
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs(selectedView);
  const { data: charts, isLoading: chartsLoading } = useEvolutionCharts("", 6);

  // Fetch recent invoices (adapt to selected view)
  const { data: recentInvoices } = useQuery({
    queryKey: ["recent-invoices", selectedView],
    queryFn: async () => {
      if (!selectedView) return [];
      
      let centroCodes: string[] = [];
      
      if (selectedView.type === 'company') {
        const { data: centres } = await supabase
          .from("centres")
          .select("codigo")
          .eq("company_id", selectedView.id)
          .eq("activo", true);
        
        centroCodes = centres?.map(c => c.codigo) || [];
      } else {
        const { data: centre } = await supabase
          .from("centres")
          .select("codigo")
          .eq("id", selectedView.id)
          .single();
        
        if (centre) centroCodes = [centre.codigo];
      }
      
      if (centroCodes.length === 0) return [];
      
      const { data } = await supabase
        .from("invoices_received")
        .select("*")
        .in("centro_code", centroCodes)
        .order("created_at", { ascending: false })
        .limit(5);
      
      return data || [];
    },
    enabled: !!selectedView,
  });

  // Fetch recent accounting entries
  const { data: recentEntries } = useQuery({
    queryKey: ["recent-entries", selectedView],
    queryFn: async () => {
      if (!selectedView) return [];
      
      let centroCodes: string[] = [];
      
      if (selectedView.type === 'company') {
        const { data: centres } = await supabase
          .from("centres")
          .select("codigo")
          .eq("company_id", selectedView.id)
          .eq("activo", true);
        
        centroCodes = centres?.map(c => c.codigo) || [];
      } else {
        const { data: centre } = await supabase
          .from("centres")
          .select("codigo")
          .eq("id", selectedView.id)
          .single();
        
        if (centre) centroCodes = [centre.codigo];
      }
      
      if (centroCodes.length === 0) return [];
      
      const { data } = await supabase
        .from("accounting_entries")
        .select("*")
        .in("centro_code", centroCodes)
        .order("created_at", { ascending: false })
        .limit(5);
      
      return data || [];
    },
    enabled: !!selectedView,
  });

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

  if (kpisLoading || chartsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
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
