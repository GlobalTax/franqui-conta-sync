import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useView } from "@/contexts/ViewContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, ArrowRight, Trash2, RotateCcw, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SectionHeader } from "@/components/common/SectionHeader";

type FiscalYear = {
  id: string;
  year: number;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'closed';
  closing_date: string | null;
  centro_code: string | null;
  created_at: string;
};

export default function HistoricalYears() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedView } = useView();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [rollbackId, setRollbackId] = useState<string | null>(null);

  const { data: fiscalYears, isLoading } = useQuery({
    queryKey: ['fiscal-years', selectedView?.code],
    queryFn: async () => {
      if (!selectedView?.code) return [];

      const { data, error } = await supabase
        .from('fiscal_years')
        .select('*')
        .eq('centro_code', selectedView.code)
        .order('year', { ascending: false });

      if (error) throw error;
      return data as FiscalYear[];
    },
    enabled: !!selectedView?.code,
  });

  const { data: entryCounts } = useQuery({
    queryKey: ['fiscal-years-entry-counts', selectedView?.code],
    queryFn: async () => {
      if (!selectedView?.code) return {};

      const { data, error } = await supabase
        .from('accounting_entries')
        .select('fiscal_year_id')
        .eq('centro_code', selectedView.code);

      if (error) throw error;

      // Count entries per fiscal year
      const counts: Record<string, number> = {};
      data.forEach((entry) => {
        if (entry.fiscal_year_id) {
          counts[entry.fiscal_year_id] = (counts[entry.fiscal_year_id] || 0) + 1;
        }
      });

      return counts;
    },
    enabled: !!selectedView?.code,
  });

  const rollbackMutation = useMutation({
    mutationFn: async (fiscalYearId: string) => {
      const { data, error } = await supabase.functions.invoke('rollback-migration', {
        body: {
          fiscalYearId,
          deleteAll: false,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Migración deshecha exitosamente');
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      queryClient.invalidateQueries({ queryKey: ['fiscal-years-entry-counts'] });
      setRollbackId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al deshacer migración');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fiscalYearId: string) => {
      const { error } = await supabase
        .from('fiscal_years')
        .delete()
        .eq('id', fiscalYearId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ejercicio eliminado');
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar ejercicio');
    },
  });

  if (!selectedView?.code) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              Selecciona un centro para ver los ejercicios históricos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: FiscalYear['status']) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Borrador
          </Badge>
        );
      case 'active':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
            Activo
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="outline" className="bg-success/10 text-success">
            Cerrado
          </Badge>
        );
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          title="Ejercicios Históricos"
          subtitle="Gestiona las migraciones de ejercicios contables anteriores"
        />
        <Button onClick={() => navigate('/contabilidad/importacion-historica')}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Migración
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ejercicios Fiscales - {selectedView.name}</CardTitle>
          <CardDescription>
            Centro: {selectedView.code}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !fiscalYears || fiscalYears.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No hay ejercicios históricos registrados
              </p>
              <Button onClick={() => navigate('/contabilidad/importacion-historica')}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Migración
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Año</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Asientos</TableHead>
                  <TableHead>Fecha Cierre</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fiscalYears.map((fy) => {
                  const entryCount = entryCounts?.[fy.id] || 0;

                  return (
                    <TableRow key={fy.id}>
                      <TableCell className="font-medium">{fy.year}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(fy.start_date).toLocaleDateString('es-ES')} →{' '}
                        {new Date(fy.end_date).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell>{getStatusBadge(fy.status)}</TableCell>
                      <TableCell className="text-right">{entryCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fy.closing_date
                          ? new Date(fy.closing_date).toLocaleDateString('es-ES')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {fy.status === 'draft' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate('/contabilidad/importacion-historica')}
                              >
                                <ArrowRight className="h-4 w-4 mr-1" />
                                Continuar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteId(fy.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}

                          {fy.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRollbackId(fy.id)}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Deshacer
                            </Button>
                          )}

                          {fy.status === 'closed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                toast.info('Exportar diario: funcionalidad próximamente');
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Exportar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ejercicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el ejercicio fiscal permanentemente. Los asientos contables
              asociados también serán eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rollback Confirmation Dialog */}
      <AlertDialog open={!!rollbackId} onOpenChange={() => setRollbackId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Deshacer migración?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción revertirá la migración, eliminando todos los asientos contables y datos
              de IVA importados. El ejercicio volverá al estado de borrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rollbackId && rollbackMutation.mutate(rollbackId)}
              disabled={rollbackMutation.isPending}
            >
              {rollbackMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deshaciendo...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
