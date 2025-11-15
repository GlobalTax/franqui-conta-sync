// ============================================================================
// COMPONENT: AccrualsList - Lista de periodificaciones
// ============================================================================

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MoreVertical, Eye, Trash2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Accrual } from "@/hooks/useAccruals";

interface AccrualsListProps {
  accruals: Accrual[];
  onView: (accrual: Accrual) => void;
  onDelete: (id: string) => void;
  onGenerate: (id: string) => void;
}

const statusLabels = {
  active: "Activo",
  completed: "Completado",
  cancelled: "Cancelado",
};

const statusColors = {
  active: "bg-green-500/10 text-green-700 dark:text-green-400",
  completed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  cancelled: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

const typeLabels = {
  income: "Ingreso",
  expense: "Gasto",
};

const frequencyLabels = {
  monthly: "Mensual",
  quarterly: "Trimestral",
  annual: "Anual",
};

export function AccrualsList({ accruals, onView, onDelete, onGenerate }: AccrualsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  if (accruals.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay periodificaciones creadas
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Cuenta</TableHead>
            <TableHead className="text-right">Importe</TableHead>
            <TableHead>Periodo</TableHead>
            <TableHead>Frecuencia</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accruals.map((accrual) => (
            <TableRow key={accrual.id}>
              <TableCell>
                <Badge variant="outline">
                  {typeLabels[accrual.accrual_type]}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                {accrual.description}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {accrual.account_code}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(accrual.total_amount)}
              </TableCell>
              <TableCell className="text-sm">
                {format(new Date(accrual.start_date), "dd/MM/yy", { locale: es })}
                {" - "}
                {format(new Date(accrual.end_date), "dd/MM/yy", { locale: es })}
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {frequencyLabels[accrual.frequency]}
                </span>
              </TableCell>
              <TableCell>
                <Badge className={statusColors[accrual.status]}>
                  {statusLabels[accrual.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(accrual)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver calendario
                    </DropdownMenuItem>
                    {accrual.status === "active" && (
                      <DropdownMenuItem onClick={() => onGenerate(accrual.id)}>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Generar asientos
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleDelete(accrual.id)}
                      disabled={deletingId === accrual.id}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deletingId === accrual.id ? "Eliminando..." : "Eliminar"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
