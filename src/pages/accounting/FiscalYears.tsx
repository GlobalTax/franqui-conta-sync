import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Lock, Unlock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFiscalYears, useCloseFiscalYear } from '@/hooks/useFiscalYears';
import { CreateFiscalYearDialog } from '@/components/accounting/CreateFiscalYearDialog';
import { RestaurantFilter } from '@/components/RestaurantFilter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function FiscalYears() {
  const navigate = useNavigate();
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [fiscalYearToClose, setFiscalYearToClose] = useState<string | null>(null);
  
  const { data: fiscalYears, isLoading } = useFiscalYears(selectedRestaurant || undefined);
  const closeFiscalYear = useCloseFiscalYear();

  const handleCloseFiscalYear = () => {
    if (fiscalYearToClose) {
      closeFiscalYear.mutate(fiscalYearToClose, {
        onSuccess: () => {
          setFiscalYearToClose(null);
        },
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Ejercicios Fiscales</h1>
          <p className="text-muted-foreground">
            Gestiona los períodos contables de tus centros
          </p>
        </div>
        {selectedRestaurant && (
          <CreateFiscalYearDialog centroCode={selectedRestaurant} />
        )}
      </div>

      {/* Restaurant Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Centro</CardTitle>
          <CardDescription>
            Elige el centro para ver y gestionar sus ejercicios fiscales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RestaurantFilter
            value={selectedRestaurant || ''}
            onChange={setSelectedRestaurant}
          />
        </CardContent>
      </Card>

      {/* Fiscal Years List */}
      {selectedRestaurant && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ejercicios Fiscales
            </CardTitle>
            <CardDescription>
              Lista de ejercicios fiscales para el centro seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando ejercicios fiscales...
              </div>
            ) : fiscalYears && fiscalYears.length > 0 ? (
              <div className="space-y-3">
                {fiscalYears.map((fiscalYear) => (
                  <div
                    key={fiscalYear.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        {fiscalYear.status === 'open' ? (
                          <Unlock className="h-6 w-6 text-primary" />
                        ) : (
                          <Lock className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-lg">Ejercicio {fiscalYear.year}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(fiscalYear.start_date).toLocaleDateString('es-ES')} -{' '}
                          {new Date(fiscalYear.end_date).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={fiscalYear.status === 'open' ? 'default' : 'secondary'}>
                        {fiscalYear.status === 'open' ? 'Abierto' : 'Cerrado'}
                      </Badge>
                      {fiscalYear.status === 'open' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFiscalYearToClose(fiscalYear.id)}
                        >
                          Cerrar Ejercicio
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No hay ejercicios fiscales para este centro
                </p>
                <CreateFiscalYearDialog centroCode={selectedRestaurant} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Close Fiscal Year Confirmation Dialog */}
      <AlertDialog open={!!fiscalYearToClose} onOpenChange={() => setFiscalYearToClose(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar ejercicio fiscal?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cerrará el ejercicio fiscal y no se podrán crear más asientos contables
              para este período. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseFiscalYear}>
              Cerrar Ejercicio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
