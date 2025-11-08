import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Pencil, Trash2 } from "lucide-react";
import { useAlerts, useToggleAlert, useDeleteAlert } from "@/hooks/useAlerts";
import { CreateAlertDialog } from "@/components/alerts/CreateAlertDialog";
import { EditAlertDialog } from "@/components/alerts/EditAlertDialog";

export default function AlertsManagement() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [filters, setFilters] = useState<{ tipo?: string; activo?: boolean }>({});

  const { data: alerts, isLoading } = useAlerts(filters);
  const toggleAlert = useToggleAlert();
  const deleteAlert = useDeleteAlert();

  const handleEdit = (alert: any) => {
    setSelectedAlert(alert);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta alerta?")) {
      await deleteAlert.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold">Gestión de Alertas</h3>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Bell className="mr-2 h-4 w-4" />
              Nueva Alerta
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filtros */}
          <div className="flex gap-4 mb-6">
            <Select
              value={filters.tipo || ""}
              onValueChange={(value) =>
                setFilters({ ...filters, tipo: value || undefined })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo de alerta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los tipos</SelectItem>
                <SelectItem value="FACTURA_VENCIMIENTO">Vencimiento</SelectItem>
                <SelectItem value="MOVIMIENTO_SIN_CONCILIAR">Sin conciliar</SelectItem>
                <SelectItem value="ASIENTO_BORRADOR">Borradores</SelectItem>
                <SelectItem value="GASTO_EXCESIVO">Gasto excesivo</SelectItem>
                <SelectItem value="CONCILIACION_BAJA">Conciliación baja</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={
                filters.activo === undefined ? "" : filters.activo ? "true" : "false"
              }
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  activo: value === "" ? undefined : value === "true",
                })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                <SelectItem value="true">Activas</SelectItem>
                <SelectItem value="false">Inactivas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando alertas...</div>
          ) : !alerts || alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay alertas configuradas
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Centro</TableHead>
                  <TableHead>Umbral</TableHead>
                  <TableHead>Canales</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{alert.tipo}</Badge>
                    </TableCell>
                    <TableCell>{alert.centro || "Todos"}</TableCell>
                    <TableCell>
                      {alert.umbral_operador} {alert.umbral_valor}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {Array.isArray(alert.canal) &&
                          alert.canal.map((c: string) => (
                            <Badge key={c} variant="secondary" className="text-xs">
                              {c}
                            </Badge>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={alert.activo}
                        onCheckedChange={(checked) =>
                          toggleAlert.mutate({ id: alert.id, activo: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(alert)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(alert.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateAlertDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      {selectedAlert && (
        <EditAlertDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          alert={selectedAlert}
        />
      )}
    </div>
  );
}
