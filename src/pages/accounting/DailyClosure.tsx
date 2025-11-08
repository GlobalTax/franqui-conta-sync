import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  useDailyClosures, 
  useCreateDailyClosure, 
  useUpdateDailyClosure,
  useValidateClosure,
  usePostClosure,
  useDeleteDailyClosure,
  type DailyClosure 
} from '@/hooks/useDailyClosures';
import { useView } from '@/contexts/ViewContext';
import { DailyClosureForm } from '@/components/accounting/DailyClosureForm';
import { Plus, CheckCircle, Lock, Eye, Edit, Trash2, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { DataTablePro } from '@/components/common/DataTablePro';

export default function DailyClosure() {
  const { selectedView } = useView();
  const centroCode = selectedView?.id || '';
  
  const [showForm, setShowForm] = useState(false);
  const [selectedClosure, setSelectedClosure] = useState<DailyClosure | undefined>();
  const [viewClosure, setViewClosure] = useState<DailyClosure | undefined>();
  const [closureToValidate, setClosureToValidate] = useState<string | undefined>();
  const [closureToPost, setClosureToPost] = useState<string | undefined>();
  const [closureToDelete, setClosureToDelete] = useState<string | undefined>();

  const { data: closures = [], isLoading } = useDailyClosures(centroCode);
  const createMutation = useCreateDailyClosure();
  const updateMutation = useUpdateDailyClosure();
  const validateMutation = useValidateClosure();
  const postMutation = usePostClosure();
  const deleteMutation = useDeleteDailyClosure();

  const handleSubmit = (data: any) => {
    if (selectedClosure) {
      updateMutation.mutate(
        { id: selectedClosure.id, ...data },
        {
          onSuccess: () => {
            setShowForm(false);
            setSelectedClosure(undefined);
          },
        }
      );
    } else {
      createMutation.mutate(
        { ...data, centro_code: centroCode, status: 'draft' },
        {
          onSuccess: () => {
            setShowForm(false);
          },
        }
      );
    }
  };

  const handleValidate = () => {
    if (closureToValidate) {
      validateMutation.mutate(closureToValidate, {
        onSuccess: () => setClosureToValidate(undefined),
      });
    }
  };

  const handlePost = () => {
    if (closureToPost) {
      postMutation.mutate(closureToPost, {
        onSuccess: () => setClosureToPost(undefined),
      });
    }
  };

  const handleDelete = () => {
    if (closureToDelete) {
      deleteMutation.mutate(closureToDelete, {
        onSuccess: () => setClosureToDelete(undefined),
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: { variant: 'outline', label: 'Borrador' },
      validated_manager: { variant: 'secondary', label: 'Validado' },
      posted: { variant: 'default', label: 'Contabilizado' },
      closed: { variant: 'success', label: 'Cerrado' },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const columns = [
    {
      key: 'closure_date',
      label: 'Fecha',
      render: (value: string) => format(new Date(value), 'dd/MM/yyyy', { locale: es }),
    },
    {
      key: 'total_sales',
      label: 'Total Ventas',
      render: (value: number) => `${value?.toFixed(2)} €`,
    },
    {
      key: 'total_tax',
      label: 'IVA',
      render: (value: number) => `${value?.toFixed(2)} €`,
    },
    {
      key: 'cash_difference',
      label: 'Dif. Caja',
      render: (value: number, row: DailyClosure) => {
        const diff = value || 0;
        return (
          <span className={diff !== 0 ? (diff > 0 ? 'text-green-600' : 'text-red-600') : ''}>
            {diff.toFixed(2)} €
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Estado',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_: any, row: DailyClosure) => {
        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewClosure(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {row.status === 'draft' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedClosure(row);
                    setShowForm(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setClosureToValidate(row.id)}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setClosureToDelete(row.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            {row.status === 'validated_manager' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setClosureToPost(row.id)}
              >
                <Lock className="h-4 w-4" />
              </Button>
            )}
            {row.accounting_entry_id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`/accounting/entries?entry=${row.accounting_entry_id}`, '_blank')}
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Contabilidad', href: '/accounting' },
          { label: 'Cierre Diario' }
        ]}
        title="Cierre Diario de Ventas"
        subtitle="Gestión de cierres diarios por centro"
        actions={
          <Button onClick={() => { setSelectedClosure(undefined); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cierre
          </Button>
        }
      />

      <DataTablePro
        columns={columns}
        data={closures}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedClosure ? 'Editar' : 'Nuevo'} Cierre Diario
            </DialogTitle>
          </DialogHeader>
          <DailyClosureForm
            centroCode={centroCode}
            closure={selectedClosure}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setSelectedClosure(undefined);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewClosure} onOpenChange={() => setViewClosure(undefined)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle del Cierre</DialogTitle>
          </DialogHeader>
          {viewClosure && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Información General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Fecha</div>
                      <div className="font-medium">
                        {format(new Date(viewClosure.closure_date), 'dd/MM/yyyy', { locale: es })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Estado</div>
                      <div>{getStatusBadge(viewClosure.status)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Ventas</div>
                      <div className="font-medium text-lg">{viewClosure.total_sales?.toFixed(2)} €</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total IVA</div>
                      <div className="font-medium text-lg">{viewClosure.total_tax?.toFixed(2)} €</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ventas por Canal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Mostrador</div>
                      <div className="font-medium">{viewClosure.sales_in_store?.toFixed(2)} €</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Drive-Thru</div>
                      <div className="font-medium">{viewClosure.sales_drive_thru?.toFixed(2)} €</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Delivery</div>
                      <div className="font-medium">{viewClosure.sales_delivery?.toFixed(2)} €</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Kiosko</div>
                      <div className="font-medium">{viewClosure.sales_kiosk?.toFixed(2)} €</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Arqueo de Caja</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Esperado</div>
                      <div className="font-medium">{viewClosure.expected_cash?.toFixed(2)} €</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Real</div>
                      <div className="font-medium">{viewClosure.actual_cash?.toFixed(2)} €</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Diferencia</div>
                      <div className={`font-medium ${viewClosure.cash_difference > 0 ? 'text-green-600' : viewClosure.cash_difference < 0 ? 'text-red-600' : ''}`}>
                        {viewClosure.cash_difference?.toFixed(2)} €
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {viewClosure.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{viewClosure.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!closureToValidate} onOpenChange={() => setClosureToValidate(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validar Cierre</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas que quieres validar este cierre como gerente? Esta acción cambiará el estado a "Validado".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleValidate}>Validar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!closureToPost} onOpenChange={() => setClosureToPost(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contabilizar Cierre</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas que quieres contabilizar este cierre? Se generará automáticamente el asiento contable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePost}>Contabilizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!closureToDelete} onOpenChange={() => setClosureToDelete(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Cierre</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar este cierre? Esta acción no se puede deshacer.
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
