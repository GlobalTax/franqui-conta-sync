import { ChevronRight, ChevronDown, Edit, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { AccountNode } from "@/lib/account-tree-utils";
import { cn } from "@/lib/utils";

interface AccountTreeRowProps {
  account: AccountNode;
  level: number;
  onToggle: (accountId: string) => void;
  onEdit?: (account: AccountNode) => void;
  onViewMovements?: (account: AccountNode) => void;
  canEdit: boolean;
}

const getAccountTypeBadge = (type: string) => {
  const types: Record<string, { label: string; className: string }> = {
    A: { label: "Activo", className: "bg-primary/10 text-primary" },
    P: { label: "Pasivo", className: "bg-secondary/10 text-secondary" },
    PN: { label: "Patrimonio", className: "bg-accent/10 text-accent" },
    ING: { label: "Ingreso", className: "bg-success/10 text-success" },
    GAS: { label: "Gasto", className: "bg-destructive/10 text-destructive" },
  };

  const config = types[type] || { label: type, className: "" };

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
};

export function AccountTreeRow({
  account,
  level,
  onToggle,
  onEdit,
  onViewMovements,
  canEdit,
}: AccountTreeRowProps) {
  const hasChildren = account.children.length > 0;
  const indent = level * 24;

  const formatBalance = (balance: number) => {
    return balance.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-success";
    if (balance < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell style={{ paddingLeft: `${indent + 16}px` }}>
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              onClick={() => onToggle(account.id)}
              className="hover:bg-muted rounded p-1 transition-colors"
            >
              {account.isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}
          <span
            className={cn(
              "font-mono",
              !account.is_detail && "font-bold text-foreground"
            )}
          >
            {account.code}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <span className={cn(!account.is_detail && "font-semibold")}>
          {account.name}
        </span>
      </TableCell>

      <TableCell>{getAccountTypeBadge(account.account_type)}</TableCell>

      <TableCell className="text-right">
        <span
          className={cn("font-mono font-semibold", getBalanceColor(account.balance))}
        >
          {formatBalance(account.balance)}€
        </span>
      </TableCell>

      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {account.is_detail && onViewMovements && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewMovements(account)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver Movimientos
            </Button>
          )}
          {canEdit && onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(account)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
