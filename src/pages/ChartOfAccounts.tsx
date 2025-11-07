import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ChartOfAccounts = () => {
  const accounts = [
    { code: "100", name: "Capital Social", type: "PN", balance: 50000.0 },
    { code: "170", name: "Deudas a largo plazo", type: "P", balance: 25000.0 },
    { code: "210", name: "Construcciones", type: "A", balance: 120000.0 },
    { code: "430", name: "Clientes", type: "A", balance: 15234.56 },
    { code: "400", name: "Proveedores", type: "P", balance: 8765.43 },
    { code: "472", name: "HP IVA Soportado", type: "A", balance: 3456.78 },
    { code: "477", name: "HP IVA Repercutido", type: "P", balance: 5678.90 },
    { code: "572", name: "Bancos c/c", type: "A", balance: 45678.90 },
    { code: "600", name: "Compras de mercaderías", type: "GAS", balance: 23456.78 },
    { code: "621", name: "Arrendamientos", type: "GAS", balance: 12000.0 },
    { code: "640", name: "Sueldos y salarios", type: "GAS", balance: 34567.89 },
    { code: "642", name: "Seguridad Social", type: "GAS", balance: 8765.43 },
    { code: "700", name: "Ventas de mercaderías", type: "ING", balance: 89012.34 },
  ];

  const getAccountTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: string }> = {
      A: { label: "Activo", variant: "default" },
      P: { label: "Pasivo", variant: "secondary" },
      PN: { label: "Patrimonio", variant: "outline" },
      ING: { label: "Ingreso", variant: "success" },
      GAS: { label: "Gasto", variant: "destructive" },
    };

    const config = types[type] || { label: type, variant: "default" };

    return (
      <Badge
        className={
          config.variant === "success"
            ? "bg-success-light text-success hover:bg-success-light"
            : config.variant === "destructive"
            ? "bg-destructive/10 text-destructive hover:bg-destructive/10"
            : ""
        }
        variant={
          config.variant === "success" || config.variant === "destructive"
            ? "outline"
            : (config.variant as any)
        }
      >
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Plan de Cuentas
            </h1>
            <p className="text-muted-foreground mt-2">
              Plan General Contable Español (PGC)
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Cuenta
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Activo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">180,913€</div>
              <p className="text-xs text-muted-foreground mt-1">Total activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pasivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">39,444€</div>
              <p className="text-xs text-muted-foreground mt-1">Total pasivos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Patrimonio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">50,000€</div>
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
              <div className="text-2xl font-bold text-success">89,012€</div>
              <p className="text-xs text-muted-foreground mt-1">Este periodo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">78,790€</div>
              <p className="text-xs text-muted-foreground mt-1">Este periodo</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cuentas Contables</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cuenta..."
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Código</TableHead>
                  <TableHead>Nombre de Cuenta</TableHead>
                  <TableHead className="w-32">Tipo</TableHead>
                  <TableHead className="text-right w-40">Saldo</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.code}>
                    <TableCell className="font-mono font-medium">
                      {account.code}
                    </TableCell>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>{getAccountTypeBadge(account.type)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {account.balance.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      €
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Ver Movimientos
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChartOfAccounts;