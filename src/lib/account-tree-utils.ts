import { Account, JournalLine } from "@/types/accounting";

export interface AccountNode extends Account {
  children: AccountNode[];
  balance: number;
  isExpanded: boolean;
}

export interface AccountBalance {
  accountId: string;
  balance: number;
}

/**
 * Construye un árbol jerárquico a partir de una lista plana de cuentas
 */
export function buildAccountTree(
  accounts: Account[],
  balances: Map<string, number> = new Map()
): AccountNode[] {
  const accountMap = new Map<string, AccountNode>();
  const rootNodes: AccountNode[] = [];

  // Convertir cuentas a nodos
  accounts.forEach((account) => {
    accountMap.set(account.id, {
      ...account,
      children: [],
      balance: balances.get(account.id) || 0,
      isExpanded: false,
    });
  });

  // Construir árbol
  accounts.forEach((account) => {
    const node = accountMap.get(account.id)!;

    if (account.parent_account_id) {
      const parent = accountMap.get(account.parent_account_id);
      if (parent) {
        parent.children.push(node);
      } else {
        // Si no encuentra padre, agregarlo como raíz
        rootNodes.push(node);
      }
    } else {
      rootNodes.push(node);
    }
  });

  // Ordenar por código
  const sortByCode = (a: AccountNode, b: AccountNode) =>
    a.code.localeCompare(b.code, undefined, { numeric: true });

  rootNodes.sort(sortByCode);
  accountMap.forEach((node) => {
    node.children.sort(sortByCode);
  });

  return rootNodes;
}

/**
 * Calcula saldos de cuentas desde journal_lines
 */
export function calculateAccountBalances(
  journalLines: Array<{ account_id: string; debit: number; credit: number }>
): Map<string, number> {
  const balances = new Map<string, number>();

  journalLines.forEach((line) => {
    const currentBalance = balances.get(line.account_id) || 0;
    const debit = line.debit || 0;
    const credit = line.credit || 0;
    balances.set(line.account_id, currentBalance + debit - credit);
  });

  return balances;
}

/**
 * Agrega saldos de cuentas hijas a cuentas padres (recursivo)
 */
export function aggregateParentBalances(nodes: AccountNode[]): void {
  nodes.forEach((node) => {
    if (node.children.length > 0) {
      // Primero agregar saldos en los hijos
      aggregateParentBalances(node.children);

      // Si no es cuenta de detalle, sumar saldos de hijos
      if (!node.is_detail) {
        node.balance = node.children.reduce(
          (sum, child) => sum + child.balance,
          0
        );
      }
    }
  });
}

/**
 * Aplana el árbol a una lista (manteniendo el orden jerárquico)
 */
export function flattenTree(
  nodes: AccountNode[],
  level: number = 0
): Array<{ node: AccountNode; level: number }> {
  const result: Array<{ node: AccountNode; level: number }> = [];

  nodes.forEach((node) => {
    result.push({ node, level });
    if (node.isExpanded && node.children.length > 0) {
      result.push(...flattenTree(node.children, level + 1));
    }
  });

  return result;
}

/**
 * Filtra el árbol por término de búsqueda (mantiene jerarquía)
 */
export function filterAccountTree(
  nodes: AccountNode[],
  searchTerm: string
): AccountNode[] {
  const term = searchTerm.toLowerCase();

  return nodes
    .map((node) => {
      const matchesSearch =
        node.code.toLowerCase().includes(term) ||
        node.name.toLowerCase().includes(term);

      const filteredChildren = filterAccountTree(node.children, searchTerm);

      // Incluir nodo si coincide o si tiene hijos que coinciden
      if (matchesSearch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
          isExpanded: filteredChildren.length > 0, // Auto-expandir si hay hijos
        };
      }

      return null;
    })
    .filter((node): node is AccountNode => node !== null);
}

/**
 * Expande todos los nodos del árbol
 */
export function expandAll(nodes: AccountNode[]): AccountNode[] {
  return nodes.map((node) => ({
    ...node,
    isExpanded: true,
    children: expandAll(node.children),
  }));
}

/**
 * Colapsa todos los nodos del árbol
 */
export function collapseAll(nodes: AccountNode[]): AccountNode[] {
  return nodes.map((node) => ({
    ...node,
    isExpanded: false,
    children: collapseAll(node.children),
  }));
}

/**
 * Alterna el estado expandido de un nodo específico
 */
export function toggleNode(
  nodes: AccountNode[],
  nodeId: string
): AccountNode[] {
  return nodes.map((node) => {
    if (node.id === nodeId) {
      return {
        ...node,
        isExpanded: !node.isExpanded,
      };
    }

    if (node.children.length > 0) {
      return {
        ...node,
        children: toggleNode(node.children, nodeId),
      };
    }

    return node;
  });
}

/**
 * Filtra nodos por tipo de cuenta
 */
export function filterByAccountType(
  nodes: AccountNode[],
  accountType: string
): AccountNode[] {
  if (accountType === "all") return nodes;

  return nodes
    .map((node) => {
      const matchesType = node.account_type === accountType;
      const filteredChildren = filterByAccountType(node.children, accountType);

      if (matchesType || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    })
    .filter((node): node is AccountNode => node !== null);
}
