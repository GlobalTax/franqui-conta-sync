// ============================================================================
// COMPONENT: Entry Audit Timeline
// Timeline de auditoría de cambios en asientos contables
// ============================================================================

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEntryAuditLog } from '@/hooks/useEntryIntegrity';
import { Clock, User, Edit, Lock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EntryAuditTimelineProps {
  entryId: string;
}

export function EntryAuditTimeline({ entryId }: EntryAuditTimelineProps) {
  const { data: auditLog, isLoading } = useEntryAuditLog(entryId);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <FileText className="h-4 w-4" />;
      case 'updated':
        return <Edit className="h-4 w-4" />;
      case 'locked':
        return <Lock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: 'Asiento creado',
      updated: 'Asiento modificado',
      locked: 'Asiento bloqueado',
      posted: 'Asiento contabilizado',
    };
    return labels[action] || action;
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'created':
        return <Badge variant="secondary">Creado</Badge>;
      case 'updated':
        return <Badge className="bg-primary">Modificado</Badge>;
      case 'locked':
        return <Badge variant="destructive">Bloqueado</Badge>;
      case 'posted':
        return <Badge className="bg-success text-success-foreground">Contabilizado</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Auditoría</CardTitle>
        <CardDescription>
          Registro de cambios según RD 1007/2023
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Cargando historial...
          </div>
        ) : !auditLog || auditLog.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay eventos de auditoría registrados
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-6 bottom-6 w-px bg-border" />

            <div className="space-y-4">
              {auditLog.map((log: any, index: number) => (
                <div key={log.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className="absolute left-2.5 top-2 h-3 w-3 rounded-full bg-primary border-2 border-background" />

                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="font-medium text-sm">
                          {getActionLabel(log.action)}
                        </span>
                      </div>
                      {getActionBadge(log.action)}
                    </div>

                    <div className="text-sm text-muted-foreground mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>{log.user_email || 'Sistema'}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(log.timestamp), "PPp", { locale: es })}</span>
                      </div>
                    </div>

                    {log.change_details && (
                      <div className="mt-3 p-3 bg-muted rounded text-xs font-mono overflow-auto max-h-32">
                        {JSON.stringify(log.change_details, null, 2)}
                      </div>
                    )}

                    {log.reason && (
                      <div className="mt-2 text-sm text-muted-foreground italic">
                        "{log.reason}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
