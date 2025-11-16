import { CheckCircle, XCircle, Building2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShortcutHint } from '@/components/shortcuts/ShortcutHint';

interface InboxBulkActionsProps {
  count: number;
  onApprove: () => void;
  onReject: () => void;
  onAssignCentre: () => void;
  onDeselect: () => void;
}

export function InboxBulkActions({
  count,
  onApprove,
  onReject,
  onAssignCentre,
  onDeselect,
}: InboxBulkActionsProps) {
  return (
    <Card className="fixed bottom-6 left-1/2 -translate-x-1/2 shadow-lg border-primary/20">
      <div className="flex items-center gap-4 px-6 py-3">
        <span className="text-sm font-medium">
          {count} factura{count > 1 ? 's' : ''} seleccionada{count > 1 ? 's' : ''}
        </span>
        
        <div className="flex items-center gap-2">
          <ShortcutHint keys="A" description="Aprobar todas">
            <Button
              size="sm"
              variant="default"
              onClick={onApprove}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Aprobar Todas
            </Button>
          </ShortcutHint>
          
          <ShortcutHint keys="R" description="Rechazar">
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Rechazar
            </Button>
          </ShortcutHint>
          
          <ShortcutHint keys="I" description="Asignar centro">
            <Button
              size="sm"
              variant="outline"
              onClick={onAssignCentre}
              className="gap-2"
            >
              <Building2 className="h-4 w-4" />
              Asignar Centro
            </Button>
          </ShortcutHint>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={onDeselect}
          className="ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
