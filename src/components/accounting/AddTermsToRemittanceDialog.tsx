import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { usePaymentTerms } from "@/hooks/usePaymentTerms";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface AddTermsToRemittanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centroCode: string;
  remittanceType: "cobro" | "pago";
  onAddTerms: (termIds: string[]) => void;
}

export function AddTermsToRemittanceDialog({
  open,
  onOpenChange,
  centroCode,
  remittanceType,
  onAddTerms,
}: AddTermsToRemittanceDialogProps) {
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  
  const { terms } = usePaymentTerms({
    centroCode,
    status: "pending",
    invoiceType: remittanceType === "cobro" ? "issued" : "received",
  });

  // Filter out terms already in a remittance
  const availableTerms = terms.filter(term => !term.remittance_id);

  const toggleTerm = (termId: string) => {
    setSelectedTerms(prev =>
      prev.includes(termId)
        ? prev.filter(id => id !== termId)
        : [...prev, termId]
    );
  };

  const handleAdd = () => {
    onAddTerms(selectedTerms);
    setSelectedTerms([]);
    onOpenChange(false);
  };

  const totalSelected = availableTerms
    .filter(term => selectedTerms.includes(term.id))
    .reduce((sum, term) => sum + (term.amount - term.paid_amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Añadir Vencimientos a Remesa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {availableTerms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay vencimientos pendientes disponibles
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {selectedTerms.length} vencimiento{selectedTerms.length !== 1 ? 's' : ''} seleccionado{selectedTerms.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{totalSelected.toFixed(2)} €</p>
                    <p className="text-sm text-muted-foreground">Total seleccionado</p>
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Fecha Vencimiento</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead className="text-right">Importe Pendiente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableTerms.map((term) => {
                    const pending = term.amount - term.paid_amount;
                    return (
                      <TableRow key={term.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedTerms.includes(term.id)}
                            onCheckedChange={() => toggleTerm(term.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(term.due_date), "dd MMM yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="font-medium">{term.concept}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {term.document_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {pending.toFixed(2)} €
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAdd}
              disabled={selectedTerms.length === 0}
            >
              Añadir {selectedTerms.length} Vencimiento{selectedTerms.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
