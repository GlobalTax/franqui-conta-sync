import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "./KPICard";
import { Receipt, Calendar, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ImpuestosTabProps {
  kpis: any;
}

export const ImpuestosTab = ({ kpis }: ImpuestosTabProps) => {
  return (
    <div className="space-y-6">
      {/* KPIs de Impuestos */}
      <div className="grid gap-6 md:grid-cols-3">
        <KPICard
          title="IVA a Pagar"
          subtitle="Trimestre actual"
          value={12500}
          previousValue={11800}
          icon={Receipt}
          format="currency"
        />
        
        <KPICard
          title="IRPF Retenido"
          subtitle="Mes actual"
          value={3200}
          previousValue={2950}
          icon={Receipt}
          format="currency"
        />
        
        <KPICard
          title="Días hasta Vencimiento"
          subtitle="Próxima declaración"
          value={12}
          previousValue={15}
          icon={Calendar}
          format="number"
        />
      </div>

      {/* Calendario de Obligaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">CALENDARIO DE OBLIGACIONES FISCALES</CardTitle>
          <p className="text-sm text-muted-foreground">Próximas presentaciones</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">Modelo 303 - IVA</p>
                  <p className="text-sm text-muted-foreground">4º Trimestre 2024</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="destructive">Vence: 20/01/2025</Badge>
                <p className="text-sm font-semibold mt-1">12,500€</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium">Modelo 111 - IRPF</p>
                  <p className="text-sm text-muted-foreground">Noviembre 2024</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-yellow-500/10 text-yellow-600">Vence: 20/12/2024</Badge>
                <p className="text-sm font-semibold mt-1">3,200€</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Modelo 115 - IRPF Alquileres</p>
                  <p className="text-sm text-muted-foreground">4º Trimestre 2024</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className="bg-green-500/10 text-green-600">Vence: 20/01/2025</Badge>
                <p className="text-sm font-semibold mt-1">850€</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen Fiscal */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">IVA DESGLOSADO</CardTitle>
            <p className="text-sm text-muted-foreground">4º Trimestre 2024</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-sm text-muted-foreground">IVA Repercutido</span>
                <span className="text-sm font-semibold text-green-600">+28,500€</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-sm text-muted-foreground">IVA Soportado</span>
                <span className="text-sm font-semibold text-red-600">-16,000€</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium">A Ingresar</span>
                <span className="text-base font-bold">12,500€</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">ALERTAS FISCALES</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-2 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Revisa facturas del trimestre</p>
                  <p className="text-xs text-muted-foreground">Faltan 3 facturas por registrar</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 bg-blue-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Próximo vencimiento cercano</p>
                  <p className="text-xs text-muted-foreground">Modelo 111 vence en 12 días</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
