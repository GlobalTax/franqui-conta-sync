import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Target, Wallet } from "lucide-react";
import type { PLReportLine, PLReportSummary } from "@/types/profit-loss";

interface PLQSRKPICardsProps {
  plData: PLReportLine[];
  summary: PLReportSummary;
}

/**
 * KPI Cards específicos para formato McDonald's/QSR
 * Muestra P.A.C., S.O.I., Cash Flow Socio y Resultado Bruto
 */
export const PLQSRKPICards = ({ plData, summary }: PLQSRKPICardsProps) => {
  // Buscar rubros específicos del formato QSR
  const resultadoBruto = plData.find((l) => l.rubric_code === "resultado_bruto_explotacion");
  const pac = plData.find((l) => l.rubric_code === "pac");
  const soi = plData.find((l) => l.rubric_code === "soi");
  const cashFlowSocio = plData.find((l) => l.rubric_code === "cash_flow_socio");

  const formatCurrency = (value: number) => {
    return value.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getTrendIcon = (value: number) => {
    if (value >= 0) {
      return <TrendingUp className="h-4 w-4 text-success" />;
    }
    return <TrendingDown className="h-4 w-4 text-destructive" />;
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Resultado Bruto de Explotación */}
      <Card className="border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Resultado Bruto</p>
              <p className="text-xs text-muted-foreground mt-1">Ventas - Comida/Papel</p>
            </div>
            <div className="rounded-full bg-primary/10 p-2">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${(resultadoBruto?.amount || 0) >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(resultadoBruto?.amount || 0)}€
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-medium text-muted-foreground">
              {Math.abs(resultadoBruto?.percentage || 0).toFixed(1)}% sobre ventas
            </span>
            {getTrendIcon(resultadoBruto?.amount || 0)}
          </div>
        </CardContent>
      </Card>

      {/* P.A.C. (Profit After Controllables) */}
      <Card className="border-accent/50 bg-gradient-to-br from-accent/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-foreground">P.A.C.</p>
              <p className="text-xs text-muted-foreground mt-1">Profit After Controllables</p>
            </div>
            <div className="rounded-full bg-accent/20 p-2">
              <Target className="h-4 w-4 text-accent-foreground" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${(pac?.amount || 0) >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(pac?.amount || 0)}€
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-semibold text-foreground">
              {Math.abs(pac?.percentage || 0).toFixed(1)}% margen
            </span>
            {getTrendIcon(pac?.amount || 0)}
          </div>
        </CardContent>
      </Card>

      {/* S.O.I. (Store Operating Income) */}
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-foreground">S.O.I.</p>
              <p className="text-xs text-muted-foreground mt-1">Store Operating Income</p>
            </div>
            <div className="rounded-full bg-primary/20 p-2">
              <Target className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${(soi?.amount || 0) >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(soi?.amount || 0)}€
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-semibold text-foreground">
              {Math.abs(soi?.percentage || 0).toFixed(1)}% operativo
            </span>
            {getTrendIcon(soi?.amount || 0)}
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow Socio */}
      <Card className="border-success/30">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cash Flow Socio</p>
              <p className="text-xs text-muted-foreground mt-1">Disponible para inversión</p>
            </div>
            <div className="rounded-full bg-success/10 p-2">
              <Wallet className="h-4 w-4 text-success" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${(cashFlowSocio?.amount || 0) >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(cashFlowSocio?.amount || 0)}€
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-medium text-muted-foreground">
              {Math.abs(cashFlowSocio?.percentage || 0).toFixed(1)}% liquidez
            </span>
            {getTrendIcon(cashFlowSocio?.amount || 0)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
