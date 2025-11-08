import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useComplianceAlerts, useResolveComplianceAlert } from '@/hooks/useComplianceAlerts';
import { 
  AlertTriangle, 
  AlertCircle,
  XCircle,
  CheckCircle2,
  FileWarning
} from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function ComplianceAlertsPanel() {
  const { data: alerts, isLoading } = useComplianceAlerts({ resolved: false });
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const resolveAlertMutation = useResolveComplianceAlert();

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return XCircle;
      case 'high':
        return AlertTriangle;
      case 'medium':
        return AlertCircle;
      default:
        return FileWarning;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const handleResolve = async () => {
    if (!selectedAlert) return;

    await resolveAlertMutation.mutateAsync({
      alert_id: selectedAlert.id,
      resolution_notes: resolutionNotes,
    });

    setSelectedAlert(null);
    setResolutionNotes('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alertas de Cumplimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalAlerts = alerts?.filter(a => a.severity === 'critical').length || 0;
  const highAlerts = alerts?.filter(a => a.severity === 'high').length || 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Alertas de Cumplimiento</span>
            <div className="flex gap-2">
              {criticalAlerts > 0 && (
                <Badge variant="destructive">{criticalAlerts} Críticas</Badge>
              )}
              {highAlerts > 0 && (
                <Badge variant="default">{highAlerts} Altas</Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!alerts || alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-600" />
              <p>No hay alertas de cumplimiento</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 10).map((alert) => {
                const Icon = getSeverityIcon(alert.severity);
                return (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <Icon className={`w-5 h-5 ${
                        alert.severity === 'critical' || alert.severity === 'high'
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <Badge 
                          variant={getSeverityColor(alert.severity) as any}
                          className="text-xs"
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {alert.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alert.centro_code} • {new Date(alert.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      Resolver
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Alerta de Cumplimiento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium text-sm mb-1">{selectedAlert?.title}</p>
              <p className="text-xs text-muted-foreground">{selectedAlert?.description}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution">Notas de Resolución *</Label>
              <Textarea
                id="resolution"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe cómo se ha resuelto la alerta..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAlert(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleResolve}
              disabled={!resolutionNotes || resolveAlertMutation.isPending}
            >
              {resolveAlertMutation.isPending ? 'Resolviendo...' : 'Marcar como Resuelta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
