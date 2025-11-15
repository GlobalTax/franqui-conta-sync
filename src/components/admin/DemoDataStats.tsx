// ============================================================================
// DEMO DATA STATS v2.0
// Real-time statistics dashboard for demo data generation
// ============================================================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  Store, 
  Users, 
  Package, 
  Banknote,
  FileText,
  Receipt,
  CheckCircle2,
  TrendingUp,
  Database,
} from "lucide-react";
import { formatDemoCurrency } from "@/lib/demo/demoDataHelpers";

export interface DemoStats {
  franchisees: number;
  companies: number;
  centres: number;
  suppliers: number;
  fiscalYears: number;
  bankAccounts: number;
  bankTransactions: number;
  invoicesReceived: number;
  invoicesIssued: number;
  accountingEntries: number;
  reconciliations: number;
  totalTransactionVolume: number;
}

interface DemoDataStatsProps {
  stats: DemoStats;
  isGenerating: boolean;
  currentPhase?: string;
  progress?: number;
}

export function DemoDataStats({ 
  stats, 
  isGenerating, 
  currentPhase,
  progress = 0 
}: DemoDataStatsProps) {
  const statCards = [
    {
      label: "Estructura",
      items: [
        { icon: Building2, label: "Franquiciados", value: stats.franchisees },
        { icon: Store, label: "Sociedades", value: stats.companies },
        { icon: Store, label: "Centros", value: stats.centres },
        { icon: Users, label: "Proveedores", value: stats.suppliers },
      ],
    },
    {
      label: "Transacciones Bancarias",
      items: [
        { icon: Banknote, label: "Cuentas Bancarias", value: stats.bankAccounts },
        { icon: TrendingUp, label: "Movimientos", value: stats.bankTransactions },
        { icon: CheckCircle2, label: "Conciliadas", value: stats.reconciliations },
        { icon: Database, label: "Volumen Total", value: formatDemoCurrency(stats.totalTransactionVolume), raw: true },
      ],
    },
    {
      label: "Documentos",
      items: [
        { icon: FileText, label: "Facturas Recibidas", value: stats.invoicesReceived },
        { icon: Receipt, label: "Facturas Emitidas", value: stats.invoicesIssued },
        { icon: Package, label: "Asientos Contables", value: stats.accountingEntries },
        { icon: CheckCircle2, label: "Ejercicios Fiscales", value: stats.fiscalYears },
      ],
    },
  ];

  const totalItems = Object.values(stats).reduce((sum, val) => 
    typeof val === 'number' ? sum + val : sum, 0
  );

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      {isGenerating && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Generando datos demo...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={progress} className="h-2" />
            {currentPhase && (
              <p className="text-xs text-muted-foreground">{currentPhase}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Resumen de Datos Demo</span>
            <Badge variant="outline" className="text-xs">
              {totalItems} elementos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statCards.map((section) => (
              <div key={section.label} className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {section.label}
                </h4>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <Badge 
                        variant={(typeof item.value === 'number' && item.value > 0) ? "default" : "outline"} 
                        className="text-xs"
                      >
                        {item.raw ? item.value : typeof item.value === 'number' ? item.value.toLocaleString('es-ES') : item.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      {stats.bankTransactions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Métricas Clave</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Tasa Conciliación"
                value={`${stats.bankTransactions > 0 ? Math.round((stats.reconciliations / stats.bankTransactions) * 100) : 0}%`}
                trend={stats.reconciliations > stats.bankTransactions * 0.7 ? 'up' : 'neutral'}
              />
              <MetricCard
                label="Facturas/Centro"
                value={`${stats.centres > 0 ? Math.round(stats.invoicesReceived / stats.centres) : 0}`}
                trend="neutral"
              />
              <MetricCard
                label="Mov. Bancarios/Cuenta"
                value={`${stats.bankAccounts > 0 ? Math.round(stats.bankTransactions / stats.bankAccounts) : 0}`}
                trend="neutral"
              />
              <MetricCard
                label="Ticket Medio"
                value={stats.bankTransactions > 0 ? formatDemoCurrency(stats.totalTransactionVolume / stats.bankTransactions) : '€0'}
                trend="neutral"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  trend 
}: { 
  label: string; 
  value: string; 
  trend: 'up' | 'down' | 'neutral' 
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {trend !== 'neutral' && (
        <div className={`flex items-center gap-1 text-xs ${
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}>
          <TrendingUp className={`h-3 w-3 ${trend === 'down' ? 'rotate-180' : ''}`} />
          <span>{trend === 'up' ? 'Óptimo' : 'Bajo'}</span>
        </div>
      )}
    </div>
  );
}
