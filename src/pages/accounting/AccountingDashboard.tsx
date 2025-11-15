import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useView } from "@/contexts/ViewContext";
import { KPICard } from "@/components/accounting/KPICard";
import { SectionHeader } from "@/components/common/SectionHeader";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Building,
  Activity,
  Scale,
  Percent,
  FileArchive,
} from "lucide-react";
import {
  useAccountingKPIs,
  useMonthlyEvolution,
  useAccountGroups,
} from "@/hooks/useAccountingDashboard";
import { AccountingEvolutionChart } from "@/components/accounting/AccountingEvolutionChart";
import { AccountGroupsPieChart } from "@/components/accounting/AccountGroupsPieChart";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function AccountingDashboard() {
  const { selectedView } = useView();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  const startDate = `${selectedYear}-01-01`;
  const endDate = `${selectedYear}-12-31`;

  const { data: kpis, isLoading: isLoadingKPIs } = useAccountingKPIs(startDate, endDate);
  const { data: evolution, isLoading: isLoadingEvolution } = useMonthlyEvolution(parseInt(selectedYear));
  const { data: incomeGroups, isLoading: isLoadingIncome } = useAccountGroups(startDate, endDate, 'income');
  const { data: expenseGroups, isLoading: isLoadingExpense } = useAccountGroups(startDate, endDate, 'expense');

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const breadcrumbs = [
    { label: "Contabilidad", href: "/contabilidad/apuntes" },
    { label: "Dashboard" },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  };

  if (!selectedView || selectedView.type !== 'centre') {
    return (
      <div className="container mx-auto py-6">
        <PageHeader title="Dashboard Contable" breadcrumbs={breadcrumbs} />
        <Alert>
          <AlertDescription>
            Selecciona un centro para ver el dashboard contable.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-1 tracking-tight">
              Dashboard Contable
            </h1>
            <p className="text-sm text-muted-foreground">
              Análisis financiero en tiempo real
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/contabilidad/periodificaciones')}
              className="gap-2"
            >
              <Activity className="h-4 w-4" />
              Periodificaciones
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/contabilidad/provisiones')}
              className="gap-2"
            >
              <FileArchive className="h-4 w-4" />
              Provisiones
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/contabilidad/migracion-historica')}
              className="gap-2"
            >
              <FileArchive className="h-4 w-4" />
              Migrar Ejercicio Histórico
            </Button>
            <div className="flex items-center gap-3 px-4 py-2 bg-card rounded-lg border border-border">
              <Label className="text-xs font-medium text-muted-foreground">
                Ejercicio
              </Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-28 h-8 border-0 bg-transparent font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Balance General */}
        <div className="space-y-8">
          <section>
            <SectionHeader 
              title="Balance General"
              subtitle="Estado patrimonial de la empresa"
            />
            <div className="grid gap-6 md:grid-cols-3">
          {isLoadingKPIs ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <KPICard
                title="Activo Total"
                value={formatCurrency(kpis?.total_activo || 0)}
                subtitle="Recursos totales"
                icon={Wallet}
                variant="default"
              />
              <KPICard
                title="Pasivo Total"
                value={formatCurrency(kpis?.total_pasivo || 0)}
                subtitle="Obligaciones totales"
                icon={TrendingDown}
                variant="warning"
              />
              <KPICard
                title="Patrimonio Neto"
                value={formatCurrency(kpis?.total_patrimonio || 0)}
                subtitle="Capital propio"
                icon={PiggyBank}
                variant="success"
              />
            </>
          )}
          </div>
        </section>

          {/* Resultado */}
          <section>
            <SectionHeader 
              title="Resultado del Ejercicio"
              subtitle="Beneficio o pérdida neta del periodo"
            />
            {isLoadingKPIs ? (
              <Skeleton className="h-32" />
            ) : (
              <KPICard
                title="Resultado Neto"
                value={formatCurrency(kpis?.resultado_ejercicio || 0)}
                subtitle={
                  kpis && kpis.resultado_ejercicio >= 0
                    ? "Beneficios"
                    : "Pérdidas"
                }
                icon={TrendingUp}
                variant={
                  kpis && kpis.resultado_ejercicio >= 0 ? "success" : "danger"
                }
                trend={kpis && kpis.resultado_ejercicio >= 0 ? "up" : "down"}
                trendValue={`${Math.abs(
                  ((kpis?.resultado_ejercicio || 0) / 1000000) * 100
                ).toFixed(1)}%`}
              />
            )}
          </section>

          {/* Ratios Financieros */}
          <section>
            <SectionHeader 
              title="Ratios Financieros"
              subtitle="Indicadores clave de salud financiera"
            />
            <div className="grid gap-6 md:grid-cols-3">
          {isLoadingKPIs ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <KPICard
                title="Ratio de Liquidez"
                value={kpis?.liquidez.toFixed(2) || "0.00"}
                subtitle="Activo / Pasivo (>1 recomendado)"
                icon={Activity}
                variant={kpis && kpis.liquidez > 1 ? "success" : "warning"}
              />
              <KPICard
                title="Ratio de Solvencia"
                value={kpis?.solvencia.toFixed(2) || "0.00"}
                subtitle="Capacidad de pago"
                icon={Scale}
                variant={kpis && kpis.solvencia > 0.5 ? "success" : "warning"}
              />
              <KPICard
                title="Endeudamiento"
                value={formatPercent(kpis?.endeudamiento || 0)}
                subtitle="Pasivo / Total (<50% recomendado)"
                icon={Percent}
                variant={kpis && kpis.endeudamiento < 0.5 ? "success" : "warning"}
              />
            </>
            )}
            </div>
          </section>

          {/* Evolución Mensual */}
          <AccountingEvolutionChart data={evolution || []} isLoading={isLoadingEvolution} />

          {/* Distribución de Ingresos y Gastos */}
          <div className="grid gap-4 md:grid-cols-2">
          <AccountGroupsPieChart
            data={incomeGroups || []}
            title="Distribución de Ingresos"
            description="Por grupo de cuenta"
            isLoading={isLoadingIncome}
          />
            <AccountGroupsPieChart
              data={expenseGroups || []}
              title="Distribución de Gastos"
              description="Por grupo de cuenta"
              isLoading={isLoadingExpense}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
