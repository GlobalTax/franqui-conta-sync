import { AccountingEntryWithTransactions } from "@/types/accounting-entries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AccountingEntriesTableProps {
  entries: AccountingEntryWithTransactions[];
  onSelectEntry?: (entry: AccountingEntryWithTransactions) => void;
}

const statusLabels = {
  draft: "Borrador",
  posted: "Contabilizado",
  closed: "Cerrado",
};

const statusVariants = {
  draft: "secondary",
  posted: "default",
  closed: "outline",
} as const;

export function AccountingEntriesTable({ entries, onSelectEntry }: AccountingEntriesTableProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Asiento</TableHead>
            <TableHead className="w-[120px]">Fecha</TableHead>
            <TableHead>Concepto</TableHead>
            <TableHead className="w-[150px]">Centro</TableHead>
            <TableHead className="text-right w-[120px]">Debe</TableHead>
            <TableHead className="text-right w-[120px]">Haber</TableHead>
            <TableHead className="w-[120px]">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                No hay asientos contables
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow
                key={entry.id}
                className={onSelectEntry ? "cursor-pointer hover:bg-muted/50" : ""}
                onClick={() => onSelectEntry?.(entry)}
              >
                <TableCell className="font-mono font-medium">
                  {entry.entry_number}
                </TableCell>
                <TableCell>
                  {format(new Date(entry.entry_date), "dd/MM/yyyy", { locale: es })}
                </TableCell>
                <TableCell className="max-w-[300px] truncate">
                  {entry.description}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {entry.centro_code}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {entry.total_debit.toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} €
                </TableCell>
                <TableCell className="text-right font-mono">
                  {entry.total_credit.toLocaleString("es-ES", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} €
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariants[entry.status]}>
                    {statusLabels[entry.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
