import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

const salesData = [
  { channel: "Web", sales: 45200, growth: 12.5 },
  { channel: "Móvil", sales: 32800, growth: 18.2 },
  { channel: "Tienda", sales: 28500, growth: -3.4 },
  { channel: "Marketplace", sales: 19300, growth: 24.7 },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-lg p-4">
        <p className="font-heading font-semibold text-sm mb-2">
          {payload[0].payload.channel}
        </p>
        <p className="font-body text-xs text-muted-foreground mb-1">
          Ventas: <span className="font-semibold text-foreground">
            {payload[0].value.toLocaleString('es-ES')}€
          </span>
        </p>
        <p className="font-body text-xs text-muted-foreground">
          Crecimiento:{" "}
          <span className={`font-semibold ${
            payload[0].payload.growth > 0 ? "text-success" : "text-destructive"
          }`}>
            {payload[0].payload.growth > 0 ? "+" : ""}
            {payload[0].payload.growth}%
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export function HoldedBarChart() {
  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
          Ventas por Canal
        </h1>
        <p className="text-muted-foreground font-body">
          Análisis comparativo Q1 2024
        </p>
      </div>

      {/* Bar Chart Card */}
      <div className="holded-chart-card">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground mb-1">
              Distribución de Ventas
            </h3>
            <p className="text-sm text-muted-foreground font-body">
              Enero - Marzo 2024
            </p>
          </div>
          <div className="flex items-center gap-2 holded-badge-success">
            <TrendingUp className="h-4 w-4" strokeWidth={2} />
            <span>+15.2% Total</span>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" className="holded-chart-grid" />

            <XAxis
              dataKey="channel"
              stroke="hsl(var(--muted-foreground))"
              fontSize={13}
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight={500}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={13}
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight={500}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />

            <Legend
              wrapperStyle={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: "13px",
                fontWeight: 500,
              }}
              iconType="circle"
            />

            <Bar
              dataKey="sales"
              fill="url(#salesGradient)"
              radius={[12, 12, 0, 0]}
              name="Ventas (€)"
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>

        <div className="holded-divider"></div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {salesData.map((item) => (
            <div key={item.channel}>
              <p className="holded-header mb-2">{item.channel}</p>
              <p className="holded-value-sm text-foreground mb-1">
                {item.sales.toLocaleString('es-ES')}€
              </p>
              <p className={`text-sm font-semibold font-body ${
                item.growth > 0 ? "text-success" : "text-destructive"
              }`}>
                {item.growth > 0 ? "+" : ""}{item.growth}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Design Tokens Reference */}
      <div className="mt-8 holded-chart-card">
        <h3 className="font-heading text-lg font-semibold mb-4">
          Tokens de Diseño Aplicados
        </h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm font-body">
          <div>
            <p className="font-semibold mb-2">Colores</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Background: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">#F8FAFB</code></li>
              <li>• Primary (Amarillo): <code className="text-xs bg-muted px-1.5 py-0.5 rounded">#FCD34D</code></li>
              <li>• Border: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">#E5E7EB</code></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Tipografía</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Títulos: <span className="font-heading font-semibold">Plus Jakarta Sans</span></li>
              <li>• Contenido: <span className="font-body">Inter</span></li>
              <li>• Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Espaciado</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Card padding: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">p-6 (1.5rem)</code></li>
              <li>• Grid gap: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">gap-6</code></li>
              <li>• Section spacing: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">space-y-8</code></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Bordes y Sombras</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Radius: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">rounded-2xl (1rem)</code></li>
              <li>• Shadow: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">shadow-md</code></li>
              <li>• Hover: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">shadow-lg + translateY(-2px)</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
