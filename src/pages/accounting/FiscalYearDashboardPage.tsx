import { useParams, useNavigate } from "react-router-dom";
import { FiscalYearDashboard } from "@/components/accounting/fiscal-year/FiscalYearDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function FiscalYearDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-destructive">ID de ejercicio fiscal no válido</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/contabilidad/ejercicios")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Ejercicios Fiscales
        </Button>
      </div>

      {/* Dashboard */}
      <FiscalYearDashboard fiscalYearId={id} />
    </div>
  );
}
