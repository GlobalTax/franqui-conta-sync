// ============================================================================
// COMPONENT: Period Lock Manager
// Gestor de bloqueo de períodos contables
// ============================================================================

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useClosingPeriods, useClosePeriod } from '@/hooks/useClosingPeriods';
import { Lock, LockOpen, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function PeriodLockManager() {
  const currentYear = new Date().getFullYear();
  const { data: periods, isLoading } = useClosingPeriods(currentYear);
  const closePeriod = useClosePeriod();
  
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [validations, setValidations] = useState({
    entriesBalanced: false,
    noOpenInvoices: false,
    backupCreated: false,
  });

  const handleClosePeriod = async () => {
    if (!selectedPeriod) return;

    await closePeriod.mutateAsync({
      centroCode: selectedPeriod.centro_code,
      year: selectedPeriod.period_year,
      month: selectedPeriod.period_month,
      notes: notes || undefined,
    });

    setSelectedPeriod(null);
    setNotes('');
    setValidations({
      entriesBalanced: false,
      noOpenInvoices: false,
      backupCreated: false,
    });
  };

  const allValidationsChecked = Object.values(validations).every(v => v);

  const getPeriodLabel = (period: any) => {
    if (period.period_type === 'monthly') {
      return `${format(new Date(period.period_year, period.period_month - 1), "MMMM yyyy", { locale: es })}`;
    }
    return `Ejercicio ${period.period_year}`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Períodos Contables</CardTitle>
          <CardDescription>
            Gestión de bloqueo de períodos según Art. 29.2 Código de Comercio
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando períodos...
            </div>
          ) : !periods || periods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay períodos contables configurados
            </div>
          ) : (
            <div className="space-y-2">
              {periods.map((period) => (
                <div
                  key={period.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {period.status === 'closed' ? (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <LockOpen className="h-5 w-5 text-warning" />
                    )}
                    <div>
                      <p className="font-medium">{getPeriodLabel(period)}</p>
                      {period.closing_date && (
                        <p className="text-xs text-muted-foreground">
                          Cerrado el {format(new Date(period.closing_date), "PPP", { locale: es })}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {period.status === 'closed' ? (
                      <Badge variant="secondary">
                        <Lock className="h-3 w-3 mr-1" />
                        Cerrado
                      </Badge>
                    ) : (
                      <>
                        <Badge variant="outline" className="border-warning text-warning">
                          <LockOpen className="h-3 w-3 mr-1" />
                          Abierto
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => setSelectedPeriod(period)}
                        >
                          Cerrar Período
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedPeriod} onOpenChange={() => setSelectedPeriod(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Cerrar Período Contable</DialogTitle>
            <DialogDescription>
              {selectedPeriod && getPeriodLabel(selectedPeriod)}
            </DialogDescription>
          </DialogHeader>

          {selectedPeriod && (
            <div className="space-y-4">
              <div className="rounded-lg bg-warning/10 p-4 border border-warning/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Acción irreversible</p>
                    <p className="text-muted-foreground">
                      El cierre del período impedirá cualquier modificación posterior de los asientos
                      contables incluidos en este período. Asegúrate de que todos los datos son correctos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Validaciones previas</Label>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="balanced"
                      checked={validations.entriesBalanced}
                      onCheckedChange={(checked) =>
                        setValidations(prev => ({ ...prev, entriesBalanced: checked as boolean }))
                      }
                    />
                    <label htmlFor="balanced" className="text-sm cursor-pointer">
                      He verificado que todos los asientos están cuadrados
                    </label>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="invoices"
                      checked={validations.noOpenInvoices}
                      onCheckedChange={(checked) =>
                        setValidations(prev => ({ ...prev, noOpenInvoices: checked as boolean }))
                      }
                    />
                    <label htmlFor="invoices" className="text-sm cursor-pointer">
                      No hay facturas pendientes de contabilizar en este período
                    </label>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="backup"
                      checked={validations.backupCreated}
                      onCheckedChange={(checked) =>
                        setValidations(prev => ({ ...prev, backupCreated: checked as boolean }))
                      }
                    />
                    <label htmlFor="backup" className="text-sm cursor-pointer">
                      He realizado una copia de seguridad de los datos
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notas de cierre (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Añade cualquier observación relevante sobre el cierre de este período..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedPeriod(null)}
              disabled={closePeriod.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleClosePeriod}
              disabled={closePeriod.isPending || !allValidationsChecked}
            >
              {closePeriod.isPending ? (
                <>Cerrando período...</>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Cerrar Período
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
