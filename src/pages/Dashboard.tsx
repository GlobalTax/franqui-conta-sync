import { Card, CardContent } from "@/components/ui/card";
import { Euro, FileText, CreditCard, CheckCircle2, AlertCircle, User, Users, BarChart3 } from "lucide-react";
import { useView } from "@/contexts/ViewContext";
import { useDashboardOperativo } from "@/hooks/useDashboardOperativo";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { GerenteView } from "@/components/dashboard/GerenteView";
import { ContabilidadView } from "@/components/dashboard/ContabilidadView";
import { ControllerView } from "@/components/dashboard/ControllerView";

const Dashboard = () => {
  const { selectedView } = useView();
  const [viewMode, setViewMode] = useState<"gerente" | "contabilidad" | "controller">("gerente");
  
  const { data: kpis, isLoading: kpisLoading } = useDashboardOperativo(selectedView);

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

  if (kpisLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando dashboard operativo...</p>
        </div>
      </div>
    );
  }

  if (!kpis) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Dashboard Operativo</h1>
              <p className="text-sm text-muted-foreground">
                Vista en tiempo real • {selectedView.type === 'company' ? 'Consolidado' : selectedView.name}
              </p>
            </div>
          </div>
          
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="gerente" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Gerente
              </TabsTrigger>
              <TabsTrigger value="contabilidad" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Contabilidad
              </TabsTrigger>
              <TabsTrigger value="controller" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Controller
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="p-6">
        <Tabs value={viewMode}>
          <TabsContent value="gerente" className="mt-0">
            <GerenteView kpis={kpis} />
          </TabsContent>
          
          <TabsContent value="contabilidad" className="mt-0">
            <ContabilidadView kpis={kpis} />
          </TabsContent>
          
          <TabsContent value="controller" className="mt-0">
            <ControllerView kpis={kpis} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
