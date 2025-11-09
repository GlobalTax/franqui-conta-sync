import { useState } from 'react';
import { CheckCircle, XCircle, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useBulkReconciliationAction } from '@/hooks/useNorma43';

interface BulkReconciliationActionsProps {
  selectedTransactionIds: string[];
  onClearSelection: () => void;
}

export function BulkReconciliationActions({ 
  selectedTransactionIds, 
  onClearSelection 
}: BulkReconciliationActionsProps) {
  const [pendingAction, setPendingAction] = useState<'confirm' | 'reject' | 'unmatch' | null>(null);
  const bulkAction = useBulkReconciliationAction();

  const handleAction = async () => {
    if (!pendingAction) return;
    
    await bulkAction.mutateAsync({
      transactionIds: selectedTransactionIds,
      action: pendingAction,
    });
    
    setPendingAction(null);
    onClearSelection();
  };

  if (selectedTransactionIds.length === 0) {
    return null;
  }

  const actionLabels = {
    confirm: 'Confirmar',
    reject: 'Rechazar',
    unmatch: 'Desmarcar',
  };

  const actionDescriptions = {
    confirm: 'Las transacciones seleccionadas serán confirmadas y marcadas como conciliadas.',
    reject: 'Las transacciones seleccionadas serán rechazadas.',
    unmatch: 'Las conciliaciones seleccionadas serán eliminadas y las transacciones volverán a estado pendiente.',
  };

  return (
    <>
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-base px-3 py-1">
                {selectedTransactionIds.length}
              </Badge>
              <span className="font-medium">
                {selectedTransactionIds.length === 1 
                  ? 'transacción seleccionada' 
                  : 'transacciones seleccionadas'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPendingAction('confirm')}
                disabled={bulkAction.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPendingAction('reject')}
                disabled={bulkAction.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPendingAction('unmatch')}
                disabled={bulkAction.isPending}
              >
                <Unlink className="h-4 w-4 mr-2" />
                Desmarcar
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearSelection}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingAction} onOpenChange={() => setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction && actionLabels[pendingAction]} {selectedTransactionIds.length} transacciones
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction && actionDescriptions[pendingAction]}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
