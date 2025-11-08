import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "./KPICard";
import { ProgressTable } from "./ProgressTable";
import { Users, FileText, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CarteraTabProps {
  kpis: any;
}

export const CarteraTab = ({ kpis }: CarteraTabProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* KPIs de Cartera */}
      <div className="grid gap-6 md:grid-cols-3">
        <KPICard
          title="Facturas Emitidas Pendientes"
          subtitle="Por cobrar"
          value={kpis?.invoicesIssuedPending || 0}
          previousValue={Math.round((kpis?.invoicesIssuedPending || 0) * 1.2)}
          icon={FileText}
          format="number"
        />
        
        <KPICard
          title="Facturas Recibidas Pendientes"
          subtitle="Por pagar"
          value={kpis?.invoicesReceivedPending || 0}
          previousValue={Math.round((kpis?.invoicesReceivedPending || 0) * 1.15)}
          icon={FileText}
          format="number"
        />
        
        <KPICard
          title="Días Promedio de Cobro"
          subtitle="DSO"
          value={45}
          previousValue={52}
          icon={Clock}
          format="number"
        />
      </div>

      {/* Detalles de Cartera */}
      <div className="grid gap-6 md:grid-cols-2">
        <ProgressTable
          title="POR CLIENTE"
          subtitle="Facturas Emitidas Pendientes"
          items={[
            { name: "CLIENTE A", amount: 45000, count: 12 },
            { name: "CLIENTE B", amount: 32000, count: 8 },
            { name: "CLIENTE C", amount: 28000, count: 15 },
            { name: "CLIENTE D", amount: 18000, count: 6 },
          ]}
          onViewDetails={() => navigate("/invoices/issued")}
        />

        <ProgressTable
          title="POR PROVEEDOR"
          subtitle="Facturas Recibidas Pendientes"
          items={[
            { name: "PROVEEDOR A", amount: 25000, count: 5 },
            { name: "PROVEEDOR B", amount: 18000, count: 8 },
            { name: "PROVEEDOR C", amount: 12000, count: 3 },
            { name: "PROVEEDOR D", amount: 8000, count: 2 },
          ]}
          onViewDetails={() => navigate("/invoices")}
        />
      </div>

      {/* Facturas por Vencimiento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">FACTURAS POR VENCIMIENTO</CardTitle>
          <p className="text-sm text-muted-foreground">Estado de cobros</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">No vencidas</span>
                <span className="text-sm font-semibold text-green-600">15</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: '60%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vencidas 1-30 días</span>
                <span className="text-sm font-semibold text-yellow-600">8</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full bg-yellow-500" style={{ width: '32%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vencidas +30 días</span>
                <span className="text-sm font-semibold text-red-600">2</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full bg-red-500" style={{ width: '8%' }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
