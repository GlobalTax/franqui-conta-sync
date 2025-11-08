import { Badge } from "@/components/ui/badge";

interface InvoiceStatusBadgeProps {
  status: string;
  type?: 'received' | 'issued';
}

export function InvoiceStatusBadge({ status, type = 'received' }: InvoiceStatusBadgeProps) {
  const getStatusConfig = () => {
    if (type === 'received') {
      switch (status) {
        case 'pending':
          return { label: 'Pendiente', variant: 'secondary' as const };
        case 'approved':
          return { label: 'Aprobada', variant: 'default' as const };
        case 'posted':
          return { label: 'Contabilizada', variant: 'default' as const };
        case 'paid':
          return { label: 'Pagada', variant: 'default' as const };
        default:
          return { label: status, variant: 'secondary' as const };
      }
    } else {
      // issued
      switch (status) {
        case 'draft':
          return { label: 'Borrador', variant: 'secondary' as const };
        case 'issued':
          return { label: 'Emitida', variant: 'default' as const };
        case 'sent':
          return { label: 'Enviada', variant: 'default' as const };
        case 'paid':
          return { label: 'Cobrada', variant: 'default' as const };
        case 'cancelled':
          return { label: 'Anulada', variant: 'destructive' as const };
        default:
          return { label: status, variant: 'secondary' as const };
      }
    }
  };

  const { label, variant } = getStatusConfig();

  return (
    <Badge variant={variant}>
      {label}
    </Badge>
  );
}
