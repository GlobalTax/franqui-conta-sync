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
          return { 
            label: 'Pendiente', 
            className: 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200' 
          };
        case 'approved':
          return { 
            label: 'Aprobada', 
            className: 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200' 
          };
        case 'posted':
          return { 
            label: 'Registrada', 
            className: 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200' 
          };
        case 'paid':
          return { 
            label: 'Pagada', 
            className: 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200' 
          };
        default:
          return { 
            label: status, 
            className: 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200' 
          };
      }
    } else {
      // issued
      switch (status) {
        case 'draft':
          return { 
            label: 'Borrador', 
            className: 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200' 
          };
        case 'pending':
          return { 
            label: 'Pendiente', 
            className: 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200' 
          };
        case 'issued':
          return { 
            label: 'Emitida', 
            className: 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200' 
          };
        case 'sent':
          return { 
            label: 'Enviada', 
            className: 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200' 
          };
        case 'paid':
          return { 
            label: 'Cobrada', 
            className: 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200' 
          };
        case 'cancelled':
          return { 
            label: 'Anulada', 
            className: 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200' 
          };
        default:
          return { 
            label: status, 
            className: 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200' 
          };
      }
    }
  };

  const { label, className } = getStatusConfig();

  return (
    <Badge className={className}>
      {label}
    </Badge>
  );
}
