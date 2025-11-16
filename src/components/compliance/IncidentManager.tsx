// ============================================================================
// COMPONENT: Incident Manager
// Gestor de incidentes de cumplimiento normativo
// ============================================================================

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUnresolvedIncidents } from '@/hooks/useEntryIntegrity';
import { AlertCircle, CheckCircle, Eye, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export function IncidentManager() {
  const { data: incidents, isLoading } = useUnresolvedIncidents();
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const queryClient = useQueryClient();

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
      case 'error':
        return <Badge className="bg-destructive/80">Error</Badge>;
      case 'warning':
        return <Badge className="bg-warning">Advertencia</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  const getIncidentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      modification_attempt: 'Intento de modificación',
      unauthorized_access: 'Acceso no autorizado',
      data_integrity_failure: 'Fallo de integridad',
      backup_failure: 'Fallo de backup',
      system_error: 'Error de sistema',
      manual_override: 'Override manual',
      regulatory_report: 'Reporte regulatorio',
    };
    return labels[type] || type;
  };

  const handleResolve = async () => {
    if (!selectedIncident || !resolutionNotes.trim()) {
      toast.error('Debes añadir notas de resolución');
      return;
    }

    setIsResolving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('accounting_incident_log' as any)
        .update({
          resolved: true,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq('id', selectedIncident.id);

      if (error) throw error;

      toast.success('Incidente marcado como resuelto');
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setSelectedIncident(null);
      setResolutionNotes('');
    } catch (error: any) {
      toast.error('Error al resolver incidente', {
        description: error.message,
      });
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Incidentes Activos</CardTitle>
              <CardDescription>
                Registro de incidencias según Ley 11/2021
              </CardDescription>
            </div>
            {incidents && incidents.length > 0 && (
              <Badge variant="destructive" className="text-base px-3 py-1">
                {incidents.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando incidentes...
            </div>
          ) : !incidents || incidents.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-success opacity-50" />
              <p className="text-sm text-muted-foreground">
                No hay incidentes sin resolver
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident: any) => (
                <div
                  key={incident.id}
                  className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getSeverityBadge(incident.severity)}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(incident.incident_date), "PPp", { locale: es })}
                      </span>
                    </div>
                    <p className="font-medium text-sm mb-1">
                      {getIncidentTypeLabel(incident.incident_type)}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {incident.description}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Incidente</DialogTitle>
            <DialogDescription>
              {selectedIncident && format(new Date(selectedIncident.incident_date), "PPP", { locale: es })}
            </DialogDescription>
          </DialogHeader>

          {selectedIncident && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Tipo</Label>
                  <p className="font-medium">
                    {getIncidentTypeLabel(selectedIncident.incident_type)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Severidad</Label>
                  <div className="mt-1">
                    {getSeverityBadge(selectedIncident.severity)}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Descripción</Label>
                <p className="mt-1">{selectedIncident.description}</p>
              </div>

              {selectedIncident.technical_details && (
                <div>
                  <Label className="text-muted-foreground">Detalles Técnicos</Label>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedIncident.technical_details, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <Label htmlFor="resolution-notes">Notas de Resolución *</Label>
                <Textarea
                  id="resolution-notes"
                  placeholder="Describe las acciones tomadas para resolver este incidente..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedIncident(null)}
                  disabled={isResolving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleResolve}
                  disabled={isResolving || !resolutionNotes.trim()}
                >
                  {isResolving ? (
                    <>Resolviendo...</>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar como Resuelto
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
