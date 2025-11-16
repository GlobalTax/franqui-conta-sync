// ============================================================================
// PAGE: Compliance Dashboard
// Panel principal de Auditoría & Cumplimiento Normativo
// ============================================================================

import { IntegrityDashboard } from '@/components/compliance/IntegrityDashboard';
import { IncidentManager } from '@/components/compliance/IncidentManager';
import { PeriodLockManager } from '@/components/compliance/PeriodLockManager';
import { VerifactuExporter } from '@/components/compliance/VerifactuExporter';
import { useComplianceMetrics } from '@/hooks/useComplianceMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, AlertTriangle, Lock, FileCheck } from 'lucide-react';

export default function ComplianceDashboard() {
  const { data: metrics } = useComplianceMetrics();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Auditoría & Cumplimiento</h1>
        <p className="text-muted-foreground">
          Gestión de cumplimiento normativo según RD 1007/2023 y Ley 11/2021
        </p>
      </div>

      {/* KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Asientos Totales</p>
                  <p className="text-2xl font-bold">{metrics.totalEntries}</p>
                </div>
                <FileCheck className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Asientos Bloqueados</p>
                  <p className="text-2xl font-bold">{metrics.lockedEntries}</p>
                </div>
                <Lock className="h-8 w-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Incidentes Activos</p>
                  <p className="text-2xl font-bold text-destructive">
                    {metrics.unresolvedIncidents}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Períodos Cerrados</p>
                  <p className="text-2xl font-bold">{metrics.closedPeriods}</p>
                </div>
                <Shield className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <IntegrityDashboard />
          <IncidentManager />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <PeriodLockManager />
          <VerifactuExporter />
        </div>
      </div>
    </div>
  );
}
