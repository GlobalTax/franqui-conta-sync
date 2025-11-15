// ============================================================================
// PAGE: InventoryClosures - Gestión de asientos de existencias mensuales
// ============================================================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Package, FileText, Trash2, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InventoryClosureForm } from "@/components/inventory/InventoryClosureForm";
import { useInventoryClosures, type InventoryClosure } from "@/hooks/useInventoryClosures";
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
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function InventoryClosures() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClosure, setSelectedClosure] = useState<InventoryClosure | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    closures,
    isLoading,
    createClosure,
    deleteClosure,
    postClosure,
    isCreating,
    isDeleting,
    isPosting,
  } = useInventoryClosures();

  const handleCreate = async (data: any) => {
    await createClosure(data);
    setIsFormOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteClosure(deleteId);
      setDeleteId(null);
    }
  };

  const handlePost = async (id: string) => {
    await postClosure(id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Borrador</Badge>;
      case "posted":
        return <Badge variant="default" className="bg-green-600">Contabilizado</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleDateString('es-ES', { month: 'long' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando cierres de existencias...</p>
        </div>
      </div>
    );
  }

  const draftClosures = closures.filter(c => c.status === "draft");
  const postedClosures = closures.filter(c => c.status === "posted");

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asientos de Existencias</h1>
          <p className="text-muted-foreground">
            Gestiona la regularización mensual de inventario
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo cierre
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total cierres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{closures.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Borradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{draftClosures.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contabilizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{postedClosures.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de cierres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Cierres de existencias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {closures.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No hay cierres de existencias</p>
              <p className="text-muted-foreground mb-4">
                Crea el primer cierre mensual para regularizar tu inventario
              </p>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primer cierre
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {closures.map((closure) => (
                <div
                  key={closure.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-medium text-lg">
                          {getMonthName(closure.closure_month)} {closure.closure_year}
                        </h3>
                        {getStatusBadge(closure.status)}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {closure.entry_type === "global" ? "Entrada global" : "Entrada detallada"}
                        </span>
                        {closure.entry_type === "global" && closure.total_amount && (
                          <span className="font-medium text-foreground">
                            €{closure.total_amount.toFixed(2)}
                          </span>
                        )}
                        {closure.entry_type === "detailed" && closure.lines && (
                          <span>
                            {closure.lines.length} subpartida{closure.lines.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {closure.notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {closure.notes}
                        </p>
                      )}

                      {closure.entry_type === "detailed" && closure.lines && closure.lines.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {closure.lines.map((line) => (
                            <div key={line.id} className="text-sm flex items-center justify-between bg-muted/30 p-2 rounded">
                              <span>
                                <Badge variant="outline" className="mr-2">
                                  {line.category}
                                </Badge>
                                {line.description}
                              </span>
                              <span className="font-mono">
                                Inicial: €{line.initial_stock.toFixed(2)} → Final: €{line.final_stock.toFixed(2)}
                                <span className={line.variation >= 0 ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
                                  ({line.variation >= 0 ? '+' : ''}{line.variation.toFixed(2)})
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        Creado: {format(new Date(closure.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                        {closure.posted_at && (
                          <> • Contabilizado: {format(new Date(closure.posted_at), "dd MMM yyyy HH:mm", { locale: es })}</>
                        )}
                      </p>
                    </div>

                    <div className="flex gap-2 ml-4">
                      {closure.status === "draft" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePost(closure.id)}
                            disabled={isPosting}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Contabilizar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(closure.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      {closure.status === "posted" && closure.accounting_entry_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = `/contabilidad/apuntes?entry=${closure.accounting_entry_id}`}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Ver asiento
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog formulario */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo cierre de existencias</DialogTitle>
          </DialogHeader>
          <InventoryClosureForm
            onSubmit={handleCreate}
            onCancel={() => setIsFormOpen(false)}
            isSubmitting={isCreating}
          />
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para eliminar */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cierre de existencias?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El cierre y todas sus líneas de detalle serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
