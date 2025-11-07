import { AccountNode } from "@/lib/account-tree-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountTreeRow } from "./AccountTreeRow";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

interface AccountTreeTableProps {
  tree: AccountNode[];
  onToggle: (accountId: string) => void;
  onEdit?: (account: AccountNode) => void;
  onViewMovements?: (account: AccountNode) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  canEdit: boolean;
}

export function AccountTreeTable({
  tree,
  onToggle,
  onEdit,
  onViewMovements,
  onExpandAll,
  onCollapseAll,
  canEdit,
}: AccountTreeTableProps) {
  const renderTreeNodes = (
    nodes: AccountNode[],
    level: number = 0
  ): JSX.Element[] => {
    const elements: JSX.Element[] = [];

    nodes.forEach((node) => {
      elements.push(
        <AccountTreeRow
          key={node.id}
          account={node}
          level={level}
          onToggle={onToggle}
          onEdit={onEdit}
          onViewMovements={onViewMovements}
          canEdit={canEdit}
        />
      );

      if (node.isExpanded && node.children.length > 0) {
        elements.push(...renderTreeNodes(node.children, level + 1));
      }
    });

    return elements;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onExpandAll}>
          <ChevronDown className="h-4 w-4 mr-1" />
          Expandir Todo
        </Button>
        <Button variant="outline" size="sm" onClick={onCollapseAll}>
          <ChevronRight className="h-4 w-4 mr-1" />
          Colapsar Todo
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Código</TableHead>
              <TableHead>Nombre de Cuenta</TableHead>
              <TableHead className="w-[150px]">Tipo</TableHead>
              <TableHead className="text-right w-[150px]">Saldo</TableHead>
              <TableHead className="text-right w-[200px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tree.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No se encontraron cuentas
                </TableCell>
              </TableRow>
            ) : (
              renderTreeNodes(tree)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
