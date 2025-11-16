import { Button } from "@/components/ui/button";
import { Mail, Trash2, Plus, Download } from "lucide-react";
import { ShortcutHint } from "@/components/shortcuts/ShortcutHint";

interface TableActionsProps {
  selectedCount?: number;
  onEmail?: () => void;
  onDelete?: () => void;
  onNew?: () => void;
  onExport?: () => void;
  customActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: "default" | "outline" | "destructive";
  }>;
}

export const TableActions = ({ 
  selectedCount = 0,
  onEmail,
  onDelete,
  onNew,
  onExport,
  customActions = []
}: TableActionsProps) => {
  return (
    <div className="flex items-center justify-end gap-2 py-3 px-4 border-t bg-muted/20">
      {onEmail && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={onEmail}
          disabled={selectedCount === 0}
        >
          <Mail className="h-4 w-4 mr-2" />
          Env. Emails
        </Button>
      )}
      
      {onDelete && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={onDelete}
          disabled={selectedCount === 0}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </Button>
      )}

      {customActions.map((action, idx) => (
        <Button 
          key={idx}
          variant={action.variant || "outline"}
          size="sm"
          onClick={action.onClick}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}

      {onNew && (
        <ShortcutHint keys="N" description="Nuevo">
          <Button 
            size="sm"
            onClick={onNew}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo
          </Button>
        </ShortcutHint>
      )}

      {onExport && (
        <ShortcutHint keys="⌘+E" description="Exportar">
          <Button 
            size="sm"
            onClick={onExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </ShortcutHint>
      )}
    </div>
  );
};
