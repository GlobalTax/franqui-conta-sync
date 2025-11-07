import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ProfitAndLoss = () => {
  const plData = [
    {
      code: "I",
      name: "INGRESOS",
      isHeader: true,
      level: 0,
      amount: 89012.34,
      percentage: 100,
    },
    {
      code: "I.1",
      name: "Ventas de mercaderías",
      level: 1,
      amount: 85456.78,
      percentage: 96.0,
    },
    {
      code: "I.2",
      name: "Otros ingresos",
      level: 1,
      amount: 3555.56,
      percentage: 4.0,
    },
    {
      code: "G",
      name: "GASTOS OPERATIVOS",
      isHeader: true,
      level: 0,
      amount: -66790.11,
      percentage: -75.0,
    },
    {
      code: "G.1",
      name: "Compras y aprovisionamientos",
      level: 1,
      amount: -31234.56,
      percentage: -35.1,
    },
    {
      code: "G.2",
      name: "Gastos de personal",
      level: 1,
      amount: -28456.78,
      percentage: -32.0,
    },
    {
      code: "G.2.1",
      name: "Sueldos y salarios",
      level: 2,
      amount: -20123.45,
      percentage: -22.6,
    },
    {
      code: "G.2.2",
      name: "Seguridad Social",
      level: 2,
      amount: -8333.33,
      percentage: -9.4,
    },
    {
      code: "G.3",
      name: "Otros gastos de explotación",
      level: 1,
      amount: -7098.77,
      percentage: -8.0,
    },
    {
      code: "G.3.1",
      name: "Arrendamientos",
      level: 2,
      amount: -3000.0,
      percentage: -3.4,
    },
    {
      code: "G.3.2",
      name: "Suministros",
      level: 2,
      amount: -2567.89,
      percentage: -2.9,
    },
    {
      code: "G.3.3",
      name: "Otros servicios",
      level: 2,
      amount: -1530.88,
      percentage: -1.7,
    },
    {
      code: "EBITDA",
      name: "EBITDA",
      isHeader: true,
      level: 0,
      amount: 22222.23,
      percentage: 25.0,
      highlight: true,
    },
    {
      code: "G.4",
      name: "Amortizaciones",
      level: 1,
      amount: -2500.0,
      percentage: -2.8,
    },
    {
      code: "EBIT",
      name: "EBIT (Resultado de Explotación)",
      isHeader: true,
      level: 0,
      amount: 19722.23,
      percentage: 22.2,
      highlight: true,
    },
    {
      code: "F",
      name: "RESULTADO FINANCIERO",
      level: 0,
      amount: -500.0,
      percentage: -0.6,
    },
    {
      code: "BAI",
      name: "BAI (Resultado antes de Impuestos)",
      isHeader: true,
      level: 0,
      amount: 19222.23,
      percentage: 21.6,
      highlight: true,
    },
    {
      code: "I.T.",
      name: "Impuesto sobre Sociedades (25%)",
      level: 1,
      amount: -4805.56,
      percentage: -5.4,
    },
    {
      code: "NET",
      name: "RESULTADO NETO",
      isHeader: true,
      level: 0,
      amount: 14416.67,
      percentage: 16.2,
      highlight: true,
      final: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Cuenta de Pérdidas y Ganancias
            </h1>
            <p className="text-muted-foreground mt-2">
              Análisis de resultados por periodo
            </p>
          </div>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Select defaultValue="2024-01">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Seleccionar periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-01">Enero 2024</SelectItem>
              <SelectItem value="2023-12">Diciembre 2023</SelectItem>
              <SelectItem value="2023-11">Noviembre 2023</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Restaurante" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los restaurantes</SelectItem>
              <SelectItem value="mcd001">Madrid Centro</SelectItem>
              <SelectItem value="mcd002">Barcelona Gracia</SelectItem>
              <SelectItem value="mcd003">Valencia Puerto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Resultado Neto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">14,417€</div>
              <div className="flex items-center gap-1 text-xs text-success mt-1">
                <TrendingUp className="h-3 w-3" />
                <span>+12% vs mes anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">EBITDA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">22,222€</div>
              <p className="text-xs text-muted-foreground mt-1">
                Margen EBITDA: 25.0%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">89,012€</div>
              <div className="flex items-center gap-1 text-xs text-success mt-1">
                <TrendingUp className="h-3 w-3" />
                <span>+8% vs mes anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Gastos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">66,790€</div>
              <p className="text-xs text-muted-foreground mt-1">
                75.0% sobre ingresos
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>PyG Consolidada - Enero 2024</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {plData.map((line, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between py-3 px-4 ${
                    line.isHeader
                      ? "bg-muted/50 font-semibold"
                      : "hover:bg-accent/30"
                  } ${
                    line.final
                      ? "bg-primary/5 border-t-2 border-primary mt-2"
                      : ""
                  } ${line.highlight ? "border-l-4 border-l-primary" : ""}`}
                  style={{ paddingLeft: `${line.level * 2 + 1}rem` }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {line.code && (
                      <span className="font-mono text-xs text-muted-foreground w-16">
                        {line.code}
                      </span>
                    )}
                    <span
                      className={`${
                        line.isHeader ? "font-semibold text-foreground" : ""
                      } ${line.final ? "font-bold text-lg" : ""}`}
                    >
                      {line.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-8">
                    <span
                      className={`font-mono font-semibold text-right w-32 ${
                        line.amount >= 0 ? "text-success" : "text-foreground"
                      } ${line.final ? "text-lg" : ""}`}
                    >
                      {line.amount.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      €
                    </span>
                    <span
                      className={`text-sm text-muted-foreground text-right w-16 ${
                        line.final ? "font-semibold" : ""
                      }`}
                    >
                      {line.percentage >= 0 ? "" : ""}
                      {Math.abs(line.percentage).toFixed(1)}%
                    </span>
                    {line.isHeader && !line.final && (
                      <div className="w-6">
                        {line.amount >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Análisis por Restaurante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Madrid Centro</p>
                  <p className="text-sm text-muted-foreground">MCD-001</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-success">6,234€</p>
                  <p className="text-xs text-muted-foreground">43% del total</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Barcelona Gracia</p>
                  <p className="text-sm text-muted-foreground">MCD-002</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-success">5,012€</p>
                  <p className="text-xs text-muted-foreground">35% del total</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Valencia Puerto</p>
                  <p className="text-sm text-muted-foreground">MCD-003</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-success">3,171€</p>
                  <p className="text-xs text-muted-foreground">22% del total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Principales Gastos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Personal</span>
                  <span className="font-medium">32.0%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-destructive w-[32%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Compras</span>
                  <span className="font-medium">35.1%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-destructive w-[35.1%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Otros gastos</span>
                  <span className="font-medium">8.0%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-destructive w-[8%]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ratios Clave</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Margen Bruto
                </span>
                <span className="font-semibold text-success">64.9%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Margen Operativo
                </span>
                <span className="font-semibold text-success">22.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Margen Neto</span>
                <span className="font-semibold text-success">16.2%</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-sm text-muted-foreground">ROI mensual</span>
                <span className="font-semibold text-success">7.2%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfitAndLoss;