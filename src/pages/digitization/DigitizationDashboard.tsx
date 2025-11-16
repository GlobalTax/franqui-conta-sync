import { PageHeader } from "@/components/layout/PageHeader";
import { AutoPostingMetricsCard } from "@/components/digitization/AutoPostingMetricsCard";
import { TrendingUp } from "lucide-react";

export default function DigitizationDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Dashboard de Automatización"
        breadcrumbs={[
          { label: "Digitalización", href: "/digitization" },
          { label: "Dashboard" },
        ]}
      />
      
      <p className="text-muted-foreground">
        Métricas de auto-posting y sistema de aprendizaje
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AutoPostingMetricsCard />
        
        {/* Placeholder para futuras métricas */}
        <div className="col-span-2 flex items-center justify-center border-2 border-dashed border-border rounded-lg p-12">
          <div className="text-center space-y-2">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Más métricas próximamente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
