import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "./KPICard";
import { ProgressTable } from "./ProgressTable";
import { Wallet, TrendingUp, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TesoreriaTabProps {
  kpis: any;
}

export const TesoreriaTab = ({ kpis }: TesoreriaTabProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* KPIs de Tesorería */}
      <div className="grid gap-6 md:grid-cols-3">
        <KPICard
          title="Saldo Total Bancos"
          subtitle="Posición actual"
          value={125000}
          previousValue={118000}
          icon={Wallet}
          format="currency"
        />
        
        <KPICard
          title="Transacciones Sin Conciliar"
          subtitle="Pendientes"
          value={kpis?.unreconciledTransactions || 0}
          previousValue={Math.round((kpis?.unreconciledTransactions || 0) * 1.25)}
          icon={AlertCircle}
          format="number"
        />
        
        <KPICard
          title="Flujo de Caja Proyectado"
          subtitle="Próximos 30 días"
          value={45000}
          previousValue={38000}
          icon={TrendingUp}
          format="currency"
        />
      </div>

      {/* Detalles de Tesorería */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">SALDO POR BANCO</CardTitle>
            <p className="text-sm text-muted-foreground">Posición actual</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "BBVA - Cuenta Principal", amount: 75000 },
                { name: "Santander - Operaciones", amount: 35000 },
                { name: "CaixaBank - Nóminas", amount: 15000 },
              ].map((bank, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{bank.name}</span>
                    <span className="text-sm font-semibold">
                      {bank.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
                      style={{ width: `${(bank.amount / 75000) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">PRÓXIMOS MOVIMIENTOS</CardTitle>
            <p className="text-sm text-muted-foreground">Programados</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <p className="text-sm font-medium">Pago Nóminas</p>
                  <p className="text-xs text-muted-foreground">28/11/2025</p>
                </div>
                <span className="text-sm font-semibold text-destructive">
                  -12,500€
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <p className="text-sm font-medium">Cobro Cliente A</p>
                  <p className="text-xs text-muted-foreground">30/11/2025</p>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  +25,000€
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <p className="text-sm font-medium">Pago Proveedores</p>
                  <p className="text-xs text-muted-foreground">05/12/2025</p>
                </div>
                <span className="text-sm font-semibold text-destructive">
                  -18,000€
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProgressTable
        title="MOVIMIENTOS RECIENTES"
        subtitle="Últimas 5 transacciones"
        items={[
          { name: "Transferencia BBVA", amount: 5000 },
          { name: "Pago Domiciliado", amount: 1200 },
          { name: "Ingreso Cliente", amount: 8500 },
          { name: "Cargo Servicios", amount: 450 },
        ]}
        onViewDetails={() => navigate("/banks")}
      />
    </div>
  );
};
