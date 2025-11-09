import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart } from "lucide-react";

export function HoldedKPICards() {
  const kpis = [
    {
      label: "Ingresos Totales",
      value: "125.450€",
      change: "+12.5%",
      trend: "up" as const,
      icon: DollarSign,
      period: "vs mes anterior",
    },
    {
      label: "Clientes Activos",
      value: "1,243",
      change: "+8.2%",
      trend: "up" as const,
      icon: Users,
      period: "vs mes anterior",
    },
    {
      label: "Pedidos Completados",
      value: "847",
      change: "-3.1%",
      trend: "down" as const,
      icon: ShoppingCart,
      period: "vs mes anterior",
    },
  ];

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
          Holded Style Guide
        </h1>
        <p className="text-muted-foreground font-body">
          KPI Cards con rounded-2xl, shadow-md y tipografías Plus Jakarta Sans + Inter
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const isPositive = kpi.trend === "up";

          return (
            <div
              key={kpi.label}
              className="holded-kpi-card group cursor-pointer"
              role="button"
              tabIndex={0}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="holded-header">{kpi.label}</span>
                <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
              </div>

              {/* Value */}
              <div className="mb-3">
                <p className="holded-value text-foreground">{kpi.value}</p>
              </div>

              {/* Trend */}
              <div className="flex items-center justify-between">
                <div
                  className={
                    isPositive ? "holded-trend-positive" : "holded-trend-negative"
                  }
                >
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <TrendingDown className="h-4 w-4" strokeWidth={2} />
                  )}
                  <span className="font-semibold">{kpi.change}</span>
                </div>
                <span className="text-xs text-muted-foreground font-body">
                  {kpi.period}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Accessibility Notes */}
      <div className="holded-chart-card">
        <h3 className="font-heading text-lg font-semibold mb-3">
          Características de Accesibilidad
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground font-body">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">✓</span>
            <span>Contraste AA cumplido en todos los textos</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">✓</span>
            <span>Estados focus con ring-2 ring-primary para navegación por teclado</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">✓</span>
            <span>Hover states claros con elevación de shadow y translateY(-2px)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">✓</span>
            <span>Iconografía lucide-react consistente con strokeWidth=2</span>
          </li>
        </ul>
      </div>

      {/* Badge Examples */}
      <div className="holded-chart-card">
        <h3 className="font-heading text-lg font-semibold mb-4">
          Sistema de Badges
        </h3>
        <div className="flex flex-wrap gap-3">
          <span className="holded-badge-success">Activo</span>
          <span className="holded-badge-warning">Pendiente</span>
          <span className="holded-badge-destructive">Cancelado</span>
          <span className="holded-badge-neutral">Borrador</span>
        </div>
      </div>

      {/* Button Examples */}
      <div className="holded-chart-card">
        <h3 className="font-heading text-lg font-semibold mb-4">
          Botones Primarios
        </h3>
        <div className="flex flex-wrap gap-3">
          <button className="holded-button-primary">
            Guardar cambios
          </button>
          <button className="holded-button-primary" disabled>
            <span className="opacity-50">Deshabilitado</span>
          </button>
        </div>
      </div>
    </div>
  );
}
