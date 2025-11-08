import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { ResolveDQIssueDialog } from "./ResolveDQIssueDialog";

interface DQIssueDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue: any;
}

export function DQIssueDetailDialog({ open, onOpenChange, issue }: DQIssueDetailDialogProps) {
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);

  if (!issue) return null;

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case "critica":
        return "destructive";
      case "alta":
        return "default";
      case "media":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Issue de Calidad</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                <Badge variant="outline" className="mt-1">
                  {issue.tipo}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Severidad</p>
                <Badge variant={getSeverityVariant(issue.severidad)} className="mt-1">
                  {issue.severidad.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Centro</p>
                <p className="mt-1">{issue.centro || "—"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                <div className="mt-1">
                  {issue.resuelto ? (
                    <Badge variant="secondary">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Resuelto
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Pendiente</Badge>
                  )}
                </div>
              </div>
            </div>

            {issue.employee && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Empleado Afectado</p>
                <p className="mt-1">
                  {issue.employee.nombre} {issue.employee.apellidos}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground">Periodo</p>
              <p className="mt-1">
                {format(new Date(issue.periodo_inicio), "dd/MM/yyyy", { locale: es })} -{" "}
                {format(new Date(issue.periodo_fin), "dd/MM/yyyy", { locale: es })}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Detalles</p>
              <div className="mt-2 p-4 bg-muted rounded-lg">
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(issue.detalle, null, 2)}
                </pre>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Fecha de Detección</p>
              <p className="mt-1">
                {format(new Date(issue.created_at), "dd/MM/yyyy 'a las' HH:mm", {
                  locale: es,
                })}
              </p>
            </div>

            {issue.resuelto && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resuelto</p>
                <p className="mt-1">
                  {format(new Date(issue.resuelto_at), "dd/MM/yyyy 'a las' HH:mm", {
                    locale: es,
                  })}
                </p>
                {issue.detalle?.notas_resolucion && (
                  <div className="mt-2 p-3 bg-muted rounded">
                    <p className="text-sm">{issue.detalle.notas_resolucion}</p>
                  </div>
                )}
              </div>
            )}

            {!issue.resuelto && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cerrar
                </Button>
                <Button onClick={() => setResolveDialogOpen(true)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Marcar como Resuelto
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ResolveDQIssueDialog
        open={resolveDialogOpen}
        onOpenChange={setResolveDialogOpen}
        issueId={issue?.id}
        onResolved={() => onOpenChange(false)}
      />
    </>
  );
}
