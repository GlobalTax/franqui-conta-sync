import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/hooks/useOrganization";
import { Account, AccountType } from "@/types/accounting";
import {
  getAccounts,
  getAccountingTransactionsForBalances,
  createAccount,
  updateAccount,
} from "@/lib/supabase-queries";
import {
  buildAccountTree,
  calculateAccountBalances,
  aggregateParentBalances,
  toggleNode,
  expandAll,
  collapseAll,
  filterAccountTree,
  filterByAccountType,
  AccountNode,
} from "@/lib/account-tree-utils";
import { AccountTreeTable } from "@/components/accounts/AccountTreeTable";
import { AccountFormDialog } from "@/components/accounts/AccountFormDialog";
import { toast } from "sonner";
import { useLoadPGCTemplate } from "@/hooks/useAccountTemplates";
import { useView } from "@/contexts/ViewContext";

const ChartOfAccounts = () => {
  const { currentMembership } = useOrganization();
  const { selectedView } = useView();
  const loadPGCTemplate = useLoadPGCTemplate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountTree, setAccountTree] = useState<AccountNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountType | "all">("all");
  const [showInactive, setShowInactive] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const canEdit = currentMembership?.role === "admin";
  
  // Get centro_code and company_id from selectedView
  const centroCode = selectedView?.type === 'centre' 
    ? (selectedView.id.includes(' - ') ? selectedView.id.split(' - ')[0] : selectedView.id)
    : undefined;
  const companyId = selectedView?.type === 'company' ? selectedView.id : undefined;

  // Cargar cuentas
  useEffect(() => {
    if (!centroCode) return;

    const loadAccounts = async () => {
      setLoading(true);
      try {
        // 1. Cargar cuentas
        const { data: accountsData, error: accountsError } = await getAccounts(
          centroCode,
          companyId,
          !showInactive
        );

        if (accountsError) throw accountsError;
        if (!accountsData) {
          setAccounts([]);
          setAccountTree([]);
          return;
        }

        // 2. Cargar accounting_transactions para calcular saldos
        const { data: txnsData } = await getAccountingTransactionsForBalances(
          centroCode
        );

        // 3. Calcular saldos por cuenta
        const balances = calculateAccountBalances(txnsData || [], accountsData);

        // 4. Construir árbol
        const tree = buildAccountTree(accountsData, balances);

        // 5. Agregar saldos a padres
        aggregateParentBalances(tree);

        setAccounts(accountsData);
        setAccountTree(tree);
      } catch (error: any) {
        toast.error("Error al cargar cuentas: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, [centroCode, companyId, showInactive]);

  // Filtrar árbol
  const filteredTree = useMemo(() => {
    let tree = accountTree;

    // Filtro por búsqueda
    if (searchTerm) {
      tree = filterAccountTree(tree, searchTerm);
    }

    // Filtro por tipo
    if (typeFilter !== "all") {
      tree = filterByAccountType(tree, typeFilter);
    }

    return tree;
  }, [accountTree, searchTerm, typeFilter]);

  // Calcular totales por tipo
  const totals = useMemo(() => {
    const calculateTotal = (type: AccountType) => {
      return accounts
        .filter((acc) => acc.account_type === type && acc.is_detail)
        .reduce((sum, acc) => {
          // Buscar saldo en el árbol
          const findBalance = (nodes: AccountNode[]): number => {
            for (const node of nodes) {
              if (node.id === acc.id) return node.balance;
              const childBalance = findBalance(node.children);
              if (childBalance !== 0) return childBalance;
            }
            return 0;
          };
          return sum + findBalance(accountTree);
        }, 0);
    };

    return {
      activo: calculateTotal("A"),
      pasivo: calculateTotal("P"),
      patrimonio: calculateTotal("PN"),
      ingresos: calculateTotal("ING"),
      gastos: calculateTotal("GAS"),
    };
  }, [accounts, accountTree]);

  // Handlers
  const handleToggle = (accountId: string) => {
    setAccountTree((prev) => toggleNode(prev, accountId));
  };

  const handleExpandAll = () => {
    setAccountTree((prev) => expandAll(prev));
  };

  const handleCollapseAll = () => {
    setAccountTree((prev) => collapseAll(prev));
  };

  const handleEdit = (account: AccountNode) => {
    setEditingAccount(account);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingAccount(null);
    setIsDialogOpen(true);
  };

  const handleSave = async (data: Partial<Account>) => {
    if (!centroCode) return;

    try {
      if (editingAccount) {
        // Actualizar
        await updateAccount(editingAccount.id, data);
      } else {
        // Crear
        await createAccount(data as Omit<Account, "id" | "created_at" | "updated_at">);
      }

      // Recargar cuentas
      const { data: accountsData } = await getAccounts(centroCode, companyId, !showInactive);
      const { data: txnsData } = await getAccountingTransactionsForBalances(centroCode);
      const balances = calculateAccountBalances(txnsData || [], accountsData || []);
      const tree = buildAccountTree(accountsData || [], balances);
      aggregateParentBalances(tree);

      setAccounts(accountsData || []);
      setAccountTree(tree);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (!centroCode) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-muted-foreground">
          Selecciona un centro para ver el plan de cuentas
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Plan de Cuentas
            </h1>
            <p className="text-muted-foreground mt-2">
              Gestión del Plan General Contable
            </p>
          </div>
          <div className="flex gap-2">
            {canEdit && accounts.length === 0 && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  if (!selectedView) {
                    toast.error("Seleccione una vista primero");
                    return;
                  }
                  const centroCode = selectedView.type === 'centre' ? selectedView.id : undefined;
                  const companyId = selectedView.type === 'company' ? selectedView.id : undefined;
                  
                  if (!centroCode) {
                    toast.error("Debe seleccionar un centro para cargar la plantilla");
                    return;
                  }
                  
                  loadPGCTemplate.mutate({ centroCode, companyId });
                }}
                disabled={loadPGCTemplate.isPending}
              >
                <FileSpreadsheet className="h-4 w-4" />
                {loadPGCTemplate.isPending ? "Cargando..." : "Cargar Plantilla PGC"}
              </Button>
            )}
            {canEdit && (
              <Button className="gap-2" onClick={handleCreate}>
                <Plus className="h-4 w-4" />
                Nueva Cuenta
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-5">
            <div className="p-6 bg-card rounded-2xl">
              <p className="text-sm text-muted-foreground mb-2">Activo</p>
              <div className="text-3xl font-bold mb-1">
                {formatCurrency(totals.activo)}€
              </div>
              <p className="text-xs text-muted-foreground">Total activos</p>
            </div>

            <div className="p-6 bg-card rounded-2xl">
              <p className="text-sm text-muted-foreground mb-2">Pasivo</p>
              <div className="text-3xl font-bold mb-1">
                {formatCurrency(totals.pasivo)}€
              </div>
              <p className="text-xs text-muted-foreground">Total pasivos</p>
            </div>

            <div className="p-6 bg-card rounded-2xl">
              <p className="text-sm text-muted-foreground mb-2">Patrimonio</p>
              <div className="text-3xl font-bold mb-1">
                {formatCurrency(totals.patrimonio)}€
              </div>
              <p className="text-xs text-muted-foreground">Capital y reservas</p>
            </div>

            <div className="p-6 bg-card rounded-2xl">
              <p className="text-sm text-muted-foreground mb-2">Ingresos</p>
              <div className="text-3xl font-bold text-success mb-1">
                {formatCurrency(totals.ingresos)}€
              </div>
              <p className="text-xs text-muted-foreground">Este periodo</p>
            </div>

            <div className="p-6 bg-card rounded-2xl">
              <p className="text-sm text-muted-foreground mb-2">Gastos</p>
              <div className="text-3xl font-bold text-destructive mb-1">
                {formatCurrency(totals.gastos)}€
              </div>
              <p className="text-xs text-muted-foreground">Este periodo</p>
            </div>
          </div>
        )}

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Cuentas Contables</h2>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cuenta..."
                    className="pl-9 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Select
                  value={typeFilter}
                  onValueChange={(value) =>
                    setTypeFilter(value as AccountType | "all")
                  }
                >
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="A">Activo</SelectItem>
                    <SelectItem value="P">Pasivo</SelectItem>
                    <SelectItem value="PN">Patrimonio</SelectItem>
                    <SelectItem value="ING">Ingreso</SelectItem>
                    <SelectItem value="GAS">Gasto</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-inactive"
                    checked={showInactive}
                    onCheckedChange={setShowInactive}
                  />
                  <Label htmlFor="show-inactive" className="text-sm">
                    Mostrar inactivas
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <AccountTreeTable
                tree={filteredTree}
                onToggle={handleToggle}
                onEdit={canEdit ? handleEdit : undefined}
                onExpandAll={handleExpandAll}
                onCollapseAll={handleCollapseAll}
                canEdit={canEdit}
              />
            )}
          </div>
        </div>
      </div>

      <AccountFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        account={editingAccount}
        accounts={accounts}
        centroCode={centroCode}
        companyId={companyId}
        onSave={handleSave}
      />
    </div>
  );
};

export default ChartOfAccounts;