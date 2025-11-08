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
  getJournalLinesForBalances,
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

  const organizationId = currentMembership?.organization?.id;
  const canEdit = currentMembership?.role === "admin";

  // Cargar cuentas
  useEffect(() => {
    if (!organizationId) return;

    const loadAccounts = async () => {
      setLoading(true);
      try {
        // 1. Cargar cuentas
        const { data: accountsData, error: accountsError } = await getAccounts(
          organizationId,
          !showInactive
        );

        if (accountsError) throw accountsError;
        if (!accountsData) {
          setAccounts([]);
          setAccountTree([]);
          return;
        }

        // 2. Cargar journal_lines para calcular saldos
        const { data: linesData } = await getJournalLinesForBalances(
          organizationId
        );

        // 3. Calcular saldos por cuenta
        const balances = calculateAccountBalances(linesData || []);

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
  }, [organizationId, showInactive]);

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
    if (!organizationId) return;

    try {
      if (editingAccount) {
        // Actualizar
        await updateAccount(editingAccount.id, data);
      } else {
        // Crear
        await createAccount(data as Omit<Account, "id" | "created_at" | "updated_at">);
      }

      // Recargar cuentas
      const { data: accountsData } = await getAccounts(organizationId, !showInactive);
      const { data: linesData } = await getJournalLinesForBalances(organizationId);
      const balances = calculateAccountBalances(linesData || []);
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

  if (!organizationId) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-muted-foreground">
          Selecciona una organización para ver el plan de cuentas
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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Activo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totals.activo)}€
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total activos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Pasivo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totals.pasivo)}€
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total pasivos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Patrimonio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(totals.patrimonio)}€
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Capital y reservas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(totals.ingresos)}€
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Este periodo
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Gastos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(totals.gastos)}€
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Este periodo
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle>Cuentas Contables</CardTitle>
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
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      <AccountFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        account={editingAccount}
        accounts={accounts}
        organizationId={organizationId}
        onSave={handleSave}
      />
    </div>
  );
};

export default ChartOfAccounts;