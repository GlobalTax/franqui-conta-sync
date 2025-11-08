import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateAlert } from "@/hooks/useAlerts";
import { useCentres } from "@/hooks/useCentres";

interface EditAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: any;
}

const ALERT_TYPES = [
  { value: "FACTURA_VENCIMIENTO", label: "Facturas próximas a vencer" },
  { value: "MOVIMIENTO_SIN_CONCILIAR", label: "Movimientos sin conciliar" },
  { value: "ASIENTO_BORRADOR", label: "Asientos sin contabilizar" },
  { value: "GASTO_EXCESIVO", label: "Gastos excesivos" },
  { value: "CONCILIACION_BAJA", label: "Tasa de conciliación baja" },
];

const OPERATORS = [
  { value: "mayor_que", label: "Mayor que" },
  { value: "menor_que", label: "Menor que" },
  { value: "igual_a", label: "Igual a" },
];

const PERIODS = [
  { value: "ultimo_mes", label: "Último mes" },
  { value: "ultima_semana", label: "Última semana" },
  { value: "hoy", label: "Hoy" },
];

export function EditAlertDialog({ open, onOpenChange, alert }: EditAlertDialogProps) {
  const updateAlert = useUpdateAlert();
  const { data: centres } = useCentres();

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    tipo: "",
    centro: "",
    umbral_valor: "",
    umbral_operador: "mayor_que",
    periodo_calculo: "ultimo_mes",
    canal: ["inapp"],
  });

  useEffect(() => {
    if (alert) {
      setFormData({
        nombre: alert.nombre || "",
        descripcion: alert.descripcion || "",
        tipo: alert.tipo || "",
        centro: alert.centro || "",
        umbral_valor: alert.umbral_valor?.toString() || "",
        umbral_operador: alert.umbral_operador || "mayor_que",
        periodo_calculo: alert.periodo_calculo || "ultimo_mes",
        canal: alert.canal || ["inapp"],
      });
    }
  }, [alert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateAlert.mutateAsync({
      id: alert.id,
      ...formData,
      centro: formData.centro || null,
      umbral_valor: parseFloat(formData.umbral_valor),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Alerta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Alerta *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="centro">Centro (opcional)</Label>
              <Select
                value={formData.centro}
                onValueChange={(value) => setFormData({ ...formData, centro: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los centros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los centros</SelectItem>
                  {centres?.map((centre) => (
                    <SelectItem key={centre.id} value={centre.codigo}>
                      {centre.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodo">Periodo de Cálculo</Label>
              <Select
                value={formData.periodo_calculo}
                onValueChange={(value) => setFormData({ ...formData, periodo_calculo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="operador">Operador</Label>
              <Select
                value={formData.umbral_operador}
                onValueChange={(value) => setFormData({ ...formData, umbral_operador: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="umbral">Valor Umbral *</Label>
              <Input
                id="umbral"
                type="number"
                step="0.01"
                value={formData.umbral_valor}
                onChange={(e) => setFormData({ ...formData, umbral_valor: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Canales de Notificación</Label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inapp"
                  checked={formData.canal.includes("inapp")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData({ ...formData, canal: [...formData.canal, "inapp"] });
                    } else {
                      setFormData({
                        ...formData,
                        canal: formData.canal.filter((c) => c !== "inapp"),
                      });
                    }
                  }}
                />
                <label htmlFor="inapp" className="text-sm">
                  In-App
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email"
                  checked={formData.canal.includes("email")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFormData({ ...formData, canal: [...formData.canal, "email"] });
                    } else {
                      setFormData({
                        ...formData,
                        canal: formData.canal.filter((c) => c !== "email"),
                      });
                    }
                  }}
                />
                <label htmlFor="email" className="text-sm">
                  Email
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateAlert.isPending}>
              {updateAlert.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
