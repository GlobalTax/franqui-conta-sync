import { PageHeader } from "@/components/layout/PageHeader";
import { OCRMetricsCards } from "@/components/digitization/OCRMetricsCards";
import { AutoPostingEvolutionChart } from "@/components/digitization/AutoPostingEvolutionChart";
import { AccountAccuracyChart } from "@/components/digitization/AccountAccuracyChart";
import { TopCorrectedSuppliersChart } from "@/components/digitization/TopCorrectedSuppliersChart";
import { LearningPatternsTable } from "@/components/digitization/LearningPatternsTable";

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
        Métricas completas de auto-posting, aprendizaje automático y OCR
      </p>

      {/* Row 1: OCR Metrics Cards */}
      <OCRMetricsCards />

      {/* Row 2: Evolution Chart + Account Accuracy */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AutoPostingEvolutionChart />
        </div>
        <div className="lg:col-span-1">
          <AccountAccuracyChart />
        </div>
      </div>

      {/* Row 3: Top Suppliers + Learning Patterns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopCorrectedSuppliersChart />
        <LearningPatternsTable />
      </div>
    </div>
  );
}
