// ============================================================================
// COMPONENT: AccrualCalendar - Calendario de asientos periódicos
// ============================================================================

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { AccrualEntry } from "@/hooks/useAccruals";

interface AccrualCalendarProps {
  entries: AccrualEntry[];
  onPost: (entryId: string) => void;
  isPosting: boolean;
}

export function AccrualCalendar({ entries, onPost, isPosting }: AccrualCalendarProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No hay asientos periódicos generados</p>
        <p className="text-sm mt-2">
          Usa el botón "Generar asientos" para crear el calendario de periodificación
        </p>
      </div>
    );
  }

  const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const postedCount = entries.filter((e) => e.status === "posted").length;

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Total periodos</p>
          <p className="text-2xl font-bold">{entries.length}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Contabilizados</p>
          <p className="text-2xl font-bold text-green-600">
            {postedCount} / {entries.length}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Importe total</p>
          <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      {/* Tabla de asientos */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Periodo</TableHead>
              <TableHead>Año</TableHead>
              <TableHead>Mes</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Asiento</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, index) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <span className="font-medium">Periodo {index + 1}</span>
                </TableCell>
                <TableCell>{entry.period_year}</TableCell>
                <TableCell>
                  {format(new Date(entry.period_date), "MMMM", { locale: es })}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(entry.amount)}
                </TableCell>
                <TableCell>
                  {entry.status === "posted" ? (
                    <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Contabilizado
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Circle className="mr-1 h-3 w-3" />
                      Pendiente
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {entry.accounting_entry_id ? (
                    <span className="text-sm font-mono text-muted-foreground">
                      {entry.accounting_entry_id.slice(0, 8)}...
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {entry.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPost(entry.id)}
                      disabled={isPosting}
                    >
                      <PlayCircle className="mr-1 h-3 w-3" />
                      Contabilizar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
