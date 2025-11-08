import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  useBankReconciliations, 
  useConfirmReconciliation, 
  useRejectReconciliation, 
  useAutoMatchTransactions,
  useCreateReconciliation 
} from '@/hooks/useBankReconciliation';
import { useBankTransactions } from '@/hooks/useBankTransactions';
import { Check, X, Sparkles, Link2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DataTablePro } from '@/components/common/DataTablePro';

interface BankReconciliationPanelProps {
  bankAccountId: string;
}

export function BankReconciliationPanel({ bankAccountId }: BankReconciliationPanelProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showManualMatch, setShowManualMatch] = useState(false);
  const [manualMatchType, setManualMatchType] = useState<string>('');
  const [manualMatchId, setManualMatchId] = useState('');
  const [rejectId, setRejectId] = useState<string | undefined>();
  const [rejectNotes, setRejectNotes] = useState('');

  const { data: reconciliations = [], isLoading: loadingReconciliations } = useBankReconciliations(bankAccountId);
  const { transactions = [] } = useBankTransactions({ accountId: bankAccountId });
  const confirmMutation = useConfirmReconciliation();
  const rejectMutation = useRejectReconciliation();
  const autoMatchMutation = useAutoMatchTransactions();
  const createReconciliationMutation = useCreateReconciliation();

  const handleAutoMatch = () => {
    autoMatchMutation.mutate({ bankAccountId, limit: 100 });
  };

  const handleConfirm = (reconciliationId: string) => {
    confirmMutation.mutate(reconciliationId);
  };

  const handleReject = () => {
    if (rejectId) {
      rejectMutation.mutate(
        { id: rejectId, notes: rejectNotes },
        {
          onSuccess: () => {
            setRejectId(undefined);
            setRejectNotes('');
          },
        }
      );
    }
  };

  const handleManualMatch = () => {
    if (selectedTransaction && manualMatchType && manualMatchId) {
      createReconciliationMutation.mutate(
        {
          bank_transaction_id: selectedTransaction.id,
          matched_type: manualMatchType as any,
          matched_id: manualMatchId,
          reconciliation_status: 'matched',
          confidence_score: 100,
        },
        {
          onSuccess: () => {
            setShowManualMatch(false);
            setSelectedTransaction(null);
            setManualMatchType('');
            setManualMatchId('');
          },
        }
      );
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'outline', label: 'Pendiente' },
      suggested: { variant: 'secondary', label: 'Sugerida' },
      matched: { variant: 'default', label: 'Emparejada' },
      reviewed: { variant: 'default', label: 'Revisada' },
      confirmed: { variant: 'success', label: 'Confirmada' },
      rejected: { variant: 'destructive', label: 'Rechazada' },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getMatchTypeBadge = (type: string | null) => {
    if (!type) return <Badge variant="outline">Sin emparejar</Badge>;
    
    const labels: Record<string, string> = {
      daily_closure: 'Cierre Diario',
      invoice_received: 'Factura Recibida',
      invoice_issued: 'Factura Emitida',
      entry: 'Asiento Manual',
      manual: 'Manual',
    };
    return <Badge variant="secondary">{labels[type] || type}</Badge>;
  };

  // Get unreconciled transactions
  const unreconciledTransactions = transactions.filter(
    (t: any) => !reconciliations.find((r: any) => r.bank_transaction_id === t.id)
  );

  const pendingSuggestions = reconciliations.filter(
    (r: any) => r.reconciliation_status === 'suggested' || r.reconciliation_status === 'matched'
  );

  const transactionColumns = [
    {
      key: 'transaction_date',
      label: 'Fecha',
      render: (value: string) => format(new Date(value), 'dd/MM/yyyy', { locale: es }),
    },
    {
      key: 'description',
      label: 'Descripción',
    },
    {
      key: 'amount',
      label: 'Importe',
      render: (value: number) => (
        <span className={value > 0 ? 'text-green-600' : 'text-red-600'}>
          {value.toFixed(2)} €
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (value: string) => (
        <Badge variant="outline">{value === 'pending' ? 'Sin conciliar' : value}</Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_: any, row: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedTransaction(row);
            setShowManualMatch(true);
          }}
        >
          <Link2 className="h-4 w-4 mr-2" />
          Emparejar
        </Button>
      ),
    },
  ];

  const reconciliationColumns = [
    {
      key: 'bank_transaction',
      label: 'Transacción',
      render: (value: any) => (
        <div>
          <div className="font-medium">{value?.description}</div>
          <div className="text-sm text-muted-foreground">
            {format(new Date(value?.transaction_date), 'dd/MM/yyyy', { locale: es })}
          </div>
        </div>
      ),
    },
    {
      key: 'matched_type',
      label: 'Tipo',
      render: (value: string) => getMatchTypeBadge(value),
    },
    {
      key: 'confidence_score',
      label: 'Confianza',
      render: (value: number | null) => value ? `${value}%` : '-',
    },
    {
      key: 'reconciliation_status',
      label: 'Estado',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'actions',
      label: 'Acciones',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          {(row.reconciliation_status === 'suggested' || row.reconciliation_status === 'matched') && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleConfirm(row.id)}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRejectId(row.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Conciliación Bancaria</CardTitle>
              <CardDescription>
                {unreconciledTransactions.length} transacciones sin conciliar | {' '}
                {pendingSuggestions.length} sugerencias pendientes
              </CardDescription>
            </div>
            <Button onClick={handleAutoMatch} disabled={autoMatchMutation.isPending}>
              <Sparkles className="h-4 w-4 mr-2" />
              Conciliar Automáticamente
            </Button>
          </div>
        </CardHeader>
      </Card>

      {pendingSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sugerencias de Conciliación</CardTitle>
            <CardDescription>
              Revisa y confirma las conciliaciones sugeridas automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTablePro
              columns={reconciliationColumns}
              data={pendingSuggestions}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transacciones Sin Conciliar</CardTitle>
          <CardDescription>
            {unreconciledTransactions.length} transacciones pendientes de emparejar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTablePro
            columns={transactionColumns}
            data={unreconciledTransactions}
          />
        </CardContent>
      </Card>

      <Dialog open={showManualMatch} onOpenChange={setShowManualMatch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emparejar Manualmente</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium">Transacción</div>
                <div className="text-sm text-muted-foreground">{selectedTransaction.description}</div>
                <div className="text-lg font-bold">
                  {selectedTransaction.amount.toFixed(2)} €
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Emparejamiento</label>
                <select
                  className="w-full p-2 border rounded"
                  value={manualMatchType}
                  onChange={(e) => setManualMatchType(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  <option value="daily_closure">Cierre Diario</option>
                  <option value="invoice_received">Factura Recibida</option>
                  <option value="invoice_issued">Factura Emitida</option>
                  <option value="entry">Asiento Contable</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">ID del Documento</label>
                <Input
                  value={manualMatchId}
                  onChange={(e) => setManualMatchId(e.target.value)}
                  placeholder="UUID del documento a emparejar"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualMatch(false)}>
              Cancelar
            </Button>
            <Button onClick={handleManualMatch}>
              Emparejar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!rejectId} onOpenChange={() => setRejectId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar Conciliación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Por qué rechazas esta conciliación sugerida?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Motivo del rechazo..."
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setRejectId(undefined); setRejectNotes(''); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleReject}>
              Rechazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
