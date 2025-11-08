import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClosePeriod } from "@/hooks/useClosingPeriods";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ClosePeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centroCode: string;
}

const MONTHS = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

export function ClosePeriodDialog({ open, onOpenChange, centroCode }: ClosePeriodDialogProps) {
  const currentYear = new Date().getFullYear();
  const [periodType, setPeriodType] = useState<"monthly" | "annual">("monthly");
  const [year, setYear] = useState(currentYear.toString());
  const [month, setMonth] = useState("1");
  const [notes, setNotes] = useState("");
  const closePeriod = useClosePeriod();

  const handleClose = async () => {
    await closePeriod.mutateAsync({
      centroCode,
      year: parseInt(year),
      month: periodType === "monthly" ? parseInt(month) : undefined,
      notes: notes || undefined,
    });
    onOpenChange(false);
    // Reset form
    setPeriodType("monthly");
    setYear(currentYear.toString());
    setMonth("1");
    setNotes("");
  };

  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cerrar Período Contable</DialogTitle>
          <DialogDescription>
            Genera el asiento de regularización y cierra el período seleccionado.
            Los asientos del período quedarán bloqueados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="default" className="border-warning bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm">
              Esta acción generará automáticamente el asiento de regularización
              (grupos 6 y 7 → cuenta 129). Todos los asientos contabilizados del período
              participarán en el cálculo.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="period-type">Tipo de Cierre</Label>
            <Select value={periodType} onValueChange={(v) => setPeriodType(v as any)}>
              <SelectTrigger id="period-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="annual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Ejercicio</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="year">
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

            {periodType === "monthly" && (
              <div className="space-y-2">
                <Label htmlFor="month">Mes</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger id="month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones sobre el cierre..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleClose} 
            disabled={closePeriod.isPending}
          >
            {closePeriod.isPending ? "Cerrando..." : "Cerrar Período"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
