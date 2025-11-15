import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, BookCheck, XCircle, Euro } from "lucide-react";

interface InboxMetrics {
  pendingCount: number;
  approvedCount: number;
  postedCount: number;
  rejectedCount: number;
  approvedAmount: number;
}

interface InboxDashboardProps {
  metrics: InboxMetrics;
}

export function InboxDashboard({ metrics }: InboxDashboardProps) {
  const cards = [
    {
      title: "Pendientes",
      value: metrics.pendingCount,
      description: "Requieren revisión",
      icon: AlertCircle,
      colorClass: "text-orange-600 dark:text-orange-400",
    },
    {
      title: "Aprobadas",
      value: metrics.approvedCount,
      description: "Listas para contabilizar",
      icon: CheckCircle,
      colorClass: "text-green-600 dark:text-green-400",
    },
    {
      title: "Contabilizadas",
      value: metrics.postedCount,
      description: "Este mes",
      icon: BookCheck,
      colorClass: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Total importe",
      value: `${metrics.approvedAmount.toLocaleString('es-ES')}€`,
      description: "Facturas aprobadas",
      icon: Euro,
      colorClass: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.colorClass}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.colorClass}`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
