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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MoreHorizontal, Check, X, Eye, Edit } from "lucide-react";
import { usePostEntry } from "@/hooks/usePostEntry";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useState } from "react";

interface AccountingEntriesTableProps {
  entries: AccountingEntryWithTransactions[];
  onSelectEntry?: (entry: AccountingEntryWithTransactions) => void;
  onRefresh?: () => void;
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

export function AccountingEntriesTable({ entries, onSelectEntry, onRefresh }: AccountingEntriesTableProps) {
  const { postEntry, unpostEntry, isPosting, isUnposting } = usePostEntry();
  const { isAdmin } = useAdminCheck();
  const [selectedEntry, setSelectedEntry] = useState<AccountingEntryWithTransactions | null>(null);
  const [showUnpostDialog, setShowUnpostDialog] = useState(false);
  const [unpostReason, setUnpostReason] = useState("");

  const handlePost = (entry: AccountingEntryWithTransactions) => {
    postEntry({ entryId: entry.id }, {
      onSuccess: () => onRefresh?.(),
    });
  };

  const handleUnpost = () => {
    if (!selectedEntry || !unpostReason.trim()) return;
    
    unpostEntry(
      { entryId: selectedEntry.id, motivo: unpostReason },
      {
        onSuccess: () => {
          setShowUnpostDialog(false);
          setUnpostReason("");
          setSelectedEntry(null);
          onRefresh?.();
        },
      }
    );
  };

  const isBalanced = (entry: AccountingEntryWithTransactions) => {
    return Math.abs(entry.total_debit - entry.total_credit) < 0.01;
  };

  return (
    <>
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
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                  No hay asientos contables
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono font-medium">
                    {entry.entry_number || "-"}
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
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariants[entry.status]}>
                        {statusLabels[entry.status]}
                      </Badge>
                      {entry.status === "draft" && !isBalanced(entry) && (
                        <Badge variant="destructive" className="text-xs">
                          Descuadrado
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSelectEntry?.(entry)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalle
                        </DropdownMenuItem>
                        {entry.status === "draft" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handlePost(entry)}
                              disabled={!isBalanced(entry) || isPosting}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Contabilizar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          </>
                        )}
                        {entry.status === "posted" && isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedEntry(entry);
                                setShowUnpostDialog(true);
                              }}
                              disabled={isUnposting}
                              className="text-destructive"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Descontabilizar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={showUnpostDialog} onOpenChange={setShowUnpostDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descontabilizar Asiento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción requiere justificación y quedará registrada en el histórico.
              Solo los administradores pueden descontabilizar asientos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="reason">Motivo de la descontabilización</Label>
            <Input
              id="reason"
              placeholder="Describe el motivo..."
              value={unpostReason}
              onChange={(e) => setUnpostReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnpost}
              disabled={!unpostReason.trim() || isUnposting}
            >
              Descontabilizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
