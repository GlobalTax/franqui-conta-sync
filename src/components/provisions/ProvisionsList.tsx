// ============================================================================
// COMPONENT: ProvisionsList - Lista de provisiones
// ============================================================================

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, FileText, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Provision } from "@/hooks/useProvisions";

interface ProvisionsListProps {
  provisions: Provision[];
  onPost: (id: string) => Promise<void>;
  onCancel: (id: string, reason: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const statusConfig = {
  draft: { label: "Borrador", color: "bg-gray-500" },
  active: { label: "Activa", color: "bg-blue-500" },
  invoiced: { label: "Facturada", color: "bg-green-500" },
  cancelled: { label: "Cancelada", color: "bg-red-500" },
};

export function ProvisionsList({
  provisions,
  onPost,
  onCancel,
  onDelete,
}: ProvisionsListProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedProvision, setSelectedProvision] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const handleCancelClick = (id: string) => {
    setSelectedProvision(id);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (selectedProvision && cancelReason.trim()) {
      await onCancel(selectedProvision, cancelReason);
      setCancelDialogOpen(false);
      setSelectedProvision(null);
      setCancelReason("");
    }
  };

  if (provisions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>No hay provisiones registradas</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {provisions.map((provision) => (
              <TableRow key={provision.id}>
                <TableCell>
                  {new Date(provision.provision_date).toLocaleDateString("es-ES")}
                </TableCell>
                <TableCell className="font-medium">
                  {provision.supplier_name}
                </TableCell>
                <TableCell className="max-w-md truncate">
                  {provision.description}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(provision.amount)}
                </TableCell>
                <TableCell>
                  <Badge className={statusConfig[provision.status].color}>
                    {statusConfig[provision.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {provision.status === "draft" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onPost(provision.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Contabilizar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDelete(provision.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {provision.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelClick(provision.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar provisión</AlertDialogTitle>
            <AlertDialogDescription>
              Se revertirá el asiento contable de esta provisión. Indica el motivo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="cancel-reason">Motivo de cancelación</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ej: Factura recibida, No procede el gasto, etc."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelReason("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={!cancelReason.trim()}
            >
              Confirmar cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
