import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Link as LinkIcon } from "lucide-react";
import { useOrquestServices, useSyncOrquestServices, useOrquestSyncLogs } from "@/hooks/useOrquestServices";
import { format } from "date-fns";

const OrquestServicesManagement = () => {
  const { data: services, isLoading } = useOrquestServices();
  const { data: syncLogs } = useOrquestSyncLogs();
  const syncServices = useSyncOrquestServices();

  const handleSync = () => {
    syncServices.mutate();
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando servicios de Orquest...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Servicios de Orquest</h3>
            <p className="text-sm text-muted-foreground">
              Gestión de servicios sincronizados desde la API de Orquest
            </p>
          </div>
          <Button onClick={handleSync} disabled={syncServices.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncServices.isPending ? 'animate-spin' : ''}`} />
            {syncServices.isPending ? "Sincronizando..." : "Sincronizar con Orquest"}
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Servicio</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Zona Horaria</TableHead>
                <TableHead>Coordenadas</TableHead>
                <TableHead>Última Actualización</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services?.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <Badge variant="outline">{service.id}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{service.nombre}</div>
                  </TableCell>
                  <TableCell>{service.zona_horaria || "—"}</TableCell>
                  <TableCell>
                    {service.latitud && service.longitud ? (
                      <span className="text-sm text-muted-foreground">
                        {service.latitud}, {service.longitud}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {service.updated_at ? format(new Date(service.updated_at), "dd/MM/yyyy HH:mm") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {(!services || services.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            No hay servicios de Orquest. Haz clic en "Sincronizar con Orquest" para obtener los servicios.
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Historial de Sincronizaciones</h3>
        <div className="space-y-2">
          {syncLogs?.map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={log.status === "completed" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>
                    {log.status}
                  </Badge>
                  <span className="text-sm">
                    {log.total_services} servicios - {log.franchisees_succeeded} franchisees exitosos
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")} - {log.trigger_source}
                </div>
              </div>
              {log.errors && Array.isArray(log.errors) && log.errors.length > 0 && (
                <Badge variant="destructive">{log.errors.length} errores</Badge>
              )}
            </div>
          ))}
          {(!syncLogs || syncLogs.length === 0) && (
            <p className="text-center text-muted-foreground py-4">No hay historial de sincronizaciones</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default OrquestServicesManagement;
