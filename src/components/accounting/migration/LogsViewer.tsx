/**
 * LogsViewer Component
 * 
 * Purpose: Visualizador avanzado de logs de migración con filtros y export
 * 
 * Features:
 * - Tabla con logs en tiempo real
 * - Filtros por step, severity, action
 * - Búsqueda de texto
 * - Paginación
 * - Detalles expandibles (JSONB)
 * - Export a CSV
 * - Auto-refresh cada 5 segundos
 * - Badges de colores por severidad
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, RefreshCw, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { MigrationStep, LogSeverity } from "@/lib/migration/migrationLogger";

interface LogEntry {
  id: string;
  migration_run_id: string;
  step_name: MigrationStep;
  action: string;
  severity: LogSeverity;
  message: string;
  details: Record<string, any>;
  records_processed: number;
  records_total: number;
  execution_time_ms: number;
  user_email: string | null;
  created_at: string;
}

interface LogsViewerProps {
  migrationRunId?: string;
  fiscalYearId?: string;
  autoRefresh?: boolean;
  maxHeight?: string;
}

export function LogsViewer({
  migrationRunId,
  fiscalYearId,
  autoRefresh = true,
  maxHeight = "600px",
}: LogsViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // Filtros
  const [stepFilter, setStepFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  // Paginación
  const [page, setPage] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);
  const pageSize = 50;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_migration_logs' as any, {
        p_migration_run_id: migrationRunId || null,
        p_fiscal_year_id: fiscalYearId || null,
        p_step_name: stepFilter === 'all' ? null : stepFilter,
        p_severity: severityFilter === 'all' ? null : severityFilter,
        p_limit: pageSize,
        p_offset: page * pageSize,
      });

      if (error) throw error;

      setLogs(data || []);
      if (data && data.length > 0) {
        setTotalLogs(data[0].total_count || 0);
      }
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      toast.error(`Error al cargar logs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [migrationRunId, fiscalYearId, stepFilter, severityFilter, page]);

  // Auto-refresh cada 5 segundos
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, migrationRunId, fiscalYearId, stepFilter, severityFilter, page]);

  const toggleExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Step', 'Severity', 'Action', 'Message', 'Records', 'Time (ms)', 'User'];
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString('es-ES'),
      log.step_name,
      log.severity,
      log.action,
      log.message,
      log.records_processed > 0 ? `${log.records_processed}/${log.records_total}` : '-',
      log.execution_time_ms || '-',
      log.user_email || 'Sistema',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `migration_logs_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exportados a CSV');
  };

  const filteredLogs = logs.filter(log =>
    searchText === '' || log.message.toLowerCase().includes(searchText.toLowerCase())
  );

  const getSeverityColor = (severity: LogSeverity) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Logs de Auditoría
            </CardTitle>
            <CardDescription>
              Registro detallado de operaciones de migración ({totalLogs} eventos)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Actualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={logs.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={stepFilter} onValueChange={setStepFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por paso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los pasos</SelectItem>
              <SelectItem value="config">Configuración</SelectItem>
              <SelectItem value="apertura">Apertura</SelectItem>
              <SelectItem value="diario">Diario</SelectItem>
              <SelectItem value="iva_emitidas">IVA Emitidas</SelectItem>
              <SelectItem value="iva_recibidas">IVA Recibidas</SelectItem>
              <SelectItem value="bancos">Bancos</SelectItem>
              <SelectItem value="cierre">Cierre</SelectItem>
              <SelectItem value="rollback">Rollback</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por severidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las severidades</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Buscar en mensajes..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        {/* Tabla de Logs */}
        <div 
          className="border rounded-lg overflow-auto"
          style={{ maxHeight }}
        >
          {filteredLogs.length === 0 ? (
            <Alert>
              <AlertDescription>
                No hay logs registrados para los filtros seleccionados
              </AlertDescription>
            </Alert>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="p-2 text-left w-10"></th>
                  <th className="p-2 text-left">Timestamp</th>
                  <th className="p-2 text-left">Paso</th>
                  <th className="p-2 text-left">Severidad</th>
                  <th className="p-2 text-left">Mensaje</th>
                  <th className="p-2 text-right">Registros</th>
                  <th className="p-2 text-right">Tiempo</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogs.has(log.id);
                  return (
                    <Collapsible key={log.id} open={isExpanded} onOpenChange={() => toggleExpanded(log.id)}>
                      <CollapsibleTrigger asChild>
                        <tr className="border-b hover:bg-muted/50 cursor-pointer">
                          <td className="p-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString('es-ES')}
                          </td>
                          <td className="p-2">
                            <Badge variant="outline">{log.step_name}</Badge>
                          </td>
                          <td className="p-2">
                            <Badge variant={getSeverityColor(log.severity)}>
                              {log.severity}
                            </Badge>
                          </td>
                          <td className="p-2">{log.message}</td>
                          <td className="p-2 text-right text-xs">
                            {log.records_processed > 0 ? (
                              <span>{log.records_processed}/{log.records_total}</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="p-2 text-right text-xs text-muted-foreground">
                            {log.execution_time_ms > 0 ? `${log.execution_time_ms}ms` : '-'}
                          </td>
                        </tr>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <tr className="bg-muted/30">
                          <td colSpan={7} className="p-4">
                            <div className="space-y-2 text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="font-semibold">Acción:</span> {log.action}
                                </div>
                                <div>
                                  <span className="font-semibold">Usuario:</span> {log.user_email || 'Sistema'}
                                </div>
                              </div>
                              {Object.keys(log.details).length > 0 && (
                                <div>
                                  <span className="font-semibold">Detalles:</span>
                                  <pre className="bg-background p-2 rounded mt-1 overflow-x-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {totalLogs > pageSize && (
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalLogs)} de {totalLogs}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * pageSize >= totalLogs}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
