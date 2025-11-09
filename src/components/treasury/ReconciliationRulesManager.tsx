import { useState } from 'react';
import { Plus, Edit2, Trash2, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ReconciliationRuleForm } from './ReconciliationRuleForm';
import { useReconciliationRules, useDeleteReconciliationRule, useToggleRuleActive } from '@/hooks/useReconciliationRules';
import { ReconciliationRule } from '@/hooks/useBankReconciliation';

interface ReconciliationRulesManagerProps {
  centroCode: string;
  bankAccountId?: string;
}

export function ReconciliationRulesManager({ centroCode, bankAccountId }: ReconciliationRulesManagerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ReconciliationRule | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  const { data: rules = [], isLoading } = useReconciliationRules(centroCode, bankAccountId);
  const deleteRule = useDeleteReconciliationRule();
  const toggleActive = useToggleRuleActive();

  const handleCreate = () => {
    setEditingRule(null);
    setIsFormOpen(true);
  };

  const handleEdit = (rule: ReconciliationRule) => {
    setEditingRule(rule);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRuleId) return;
    await deleteRule.mutateAsync(deletingRuleId);
    setDeletingRuleId(null);
  };

  const handleToggleActive = async (ruleId: string, currentActive: boolean) => {
    await toggleActive.mutateAsync({ id: ruleId, active: !currentActive });
  };

  const getMatchTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      daily_closure: 'Cierre Diario',
      invoice_received: 'Factura Recibida',
      invoice_issued: 'Factura Emitida',
      entry: 'Asiento Manual',
      royalty: 'Royalty',
      commission: 'Comisión',
      manual: 'Manual',
    };
    return labels[type] || type;
  };

  const getTransactionTypeLabel = (type: string | null) => {
    if (!type) return 'Ambos';
    return type === 'debit' ? 'Débito' : 'Crédito';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reglas de Conciliación</CardTitle>
              <CardDescription>
                Configura reglas para conciliación automática de transacciones bancarias
              </CardDescription>
            </div>
            <Button onClick={handleCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Regla
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando reglas...</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No hay reglas configuradas</p>
              <Button onClick={handleCreate} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Crear primera regla
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <Card key={rule.id} className={!rule.active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{rule.rule_name}</h4>
                          {!rule.active && (
                            <Badge variant="secondary">Inactiva</Badge>
                          )}
                          <Badge variant="outline">
                            Prioridad: {rule.priority}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Tipo: </span>
                            <Badge variant="default">
                              {getMatchTypeLabel(rule.auto_match_type)}
                            </Badge>
                          </div>
                          
                          <div>
                            <span className="text-muted-foreground">Transacción: </span>
                            {getTransactionTypeLabel(rule.transaction_type)}
                          </div>
                          
                          {rule.description_pattern && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Patrón: </span>
                              <code className="bg-muted px-2 py-1 rounded text-xs">
                                {rule.description_pattern}
                              </code>
                            </div>
                          )}
                          
                          {(rule.amount_min || rule.amount_max) && (
                            <div>
                              <span className="text-muted-foreground">Importe: </span>
                              {rule.amount_min && `≥${rule.amount_min}€`}
                              {rule.amount_min && rule.amount_max && ' - '}
                              {rule.amount_max && `≤${rule.amount_max}€`}
                            </div>
                          )}
                          
                          <div>
                            <span className="text-muted-foreground">Confianza: </span>
                            {(rule.confidence_threshold * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(rule.id, rule.active)}
                          title={rule.active ? 'Desactivar' : 'Activar'}
                        >
                          <Power className={`h-4 w-4 ${rule.active ? 'text-success' : 'text-muted-foreground'}`} />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(rule)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingRuleId(rule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Editar Regla' : 'Nueva Regla de Conciliación'}
            </DialogTitle>
          </DialogHeader>
          <ReconciliationRuleForm
            centroCode={centroCode}
            bankAccountId={bankAccountId}
            rule={editingRule || undefined}
            onSubmit={() => setIsFormOpen(false)}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingRuleId} onOpenChange={() => setDeletingRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar regla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La regla será eliminada permanentemente.
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
    </>
  );
}
