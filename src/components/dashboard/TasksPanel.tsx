import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePendingTasks } from '@/hooks/usePendingTasks';
import { 
  FileText, 
  TrendingUp, 
  Banknote,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useState } from 'react';
import { InvoiceApprovalDialog } from '@/components/invoices/InvoiceApprovalDialog';
import { useNavigate } from 'react-router-dom';

export function TasksPanel() {
  const { data: tasks, isLoading } = usePendingTasks();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [approvalLevel, setApprovalLevel] = useState<'manager' | 'accounting'>('accounting');
  const navigate = useNavigate();

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'invoice_approval':
        return FileText;
      case 'daily_closure':
        return TrendingUp;
      case 'bank_reconciliation':
        return Banknote;
      default:
        return AlertCircle;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleTaskClick = (task: any) => {
    if (task.type === 'invoice_approval') {
      setSelectedInvoice(task.metadata.invoice);
      setApprovalLevel(task.metadata.level === 'gerente' ? 'manager' : 'accounting');
    } else if (task.type === 'daily_closure') {
      navigate('/cierre-diario');
    } else if (task.type === 'bank_reconciliation') {
      navigate('/bancos');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tareas Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tareas Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No hay tareas pendientes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tareas Pendientes</span>
            <Badge variant="secondary">{tasks.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tasks.slice(0, 10).map((task) => {
              const Icon = getTaskIcon(task.type);
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer group"
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      <Badge 
                        variant={getPriorityColor(task.priority) as any}
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {task.description}
                    </p>
                    {task.centro_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.centro_name}
                      </p>
                    )}
                  </div>

                  {task.amount && (
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        €{Math.abs(task.amount).toFixed(2)}
                      </p>
                    </div>
                  )}

                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <InvoiceApprovalDialog
        open={!!selectedInvoice}
        onOpenChange={(open) => !open && setSelectedInvoice(null)}
        invoice={selectedInvoice}
        approvalLevel={approvalLevel}
      />
    </>
  );
}
