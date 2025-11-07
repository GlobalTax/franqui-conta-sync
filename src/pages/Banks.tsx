import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

const Banks = () => {
  const mockTransactions = [
    {
      id: "1",
      date: "2024-01-17",
      description: "TRANSFERENCIA PROVEEDOR A",
      amount: -1234.56,
      balance: 45678.90,
    },
    {
      id: "2",
      date: "2024-01-16",
      description: "INGRESO VENTAS",
      amount: 3456.78,
      balance: 46913.46,
    },
    {
      id: "3",
      date: "2024-01-15",
      description: "DOMICILIACION SERVICIOS",
      amount: -567.89,
      balance: 43456.68,
    },
    {
      id: "4",
      date: "2024-01-14",
      description: "INGRESO TPV",
      amount: 2345.67,
      balance: 44024.57,
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Transacciones Bancarias
            </h1>
            <p className="text-muted-foreground mt-2">
              Gestión de movimientos bancarios
            </p>
          </div>
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Balance Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45,678.90€</div>
              <p className="text-xs text-muted-foreground mt-1">
                Actualizado hoy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Ingresos del Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                +5,802.45€
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                12 transacciones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Gastos del Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                -1,802.45€
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                8 transacciones
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Movimientos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        transaction.amount > 0
                          ? "bg-success-light"
                          : "bg-destructive/10"
                      }`}
                    >
                      {transaction.amount > 0 ? (
                        <ArrowDownToLine className="h-5 w-5 text-success" />
                      ) : (
                        <ArrowUpFromLine className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p
                        className={`font-medium ${
                          transaction.amount > 0
                            ? "text-success"
                            : "text-destructive"
                        }`}
                      >
                        {transaction.amount > 0 ? "+" : ""}
                        {transaction.amount.toFixed(2)}€
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Balance: {transaction.balance.toFixed(2)}€
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      Ver Detalles
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Banks;