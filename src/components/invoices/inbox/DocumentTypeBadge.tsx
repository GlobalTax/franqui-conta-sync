import { Badge } from '@/components/ui/badge';
import { FileText, Receipt, Package, RotateCcw } from 'lucide-react';

interface DocumentTypeBadgeProps {
  type: 'invoice' | 'receipt' | 'delivery_note' | 'credit_note';
  className?: string;
}

export function DocumentTypeBadge({ type, className }: DocumentTypeBadgeProps) {
  const typeConfig = {
    invoice: {
      label: 'Factura',
      icon: FileText,
      className: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300',
    },
    receipt: {
      label: 'Recibo',
      icon: Receipt,
      className: 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300',
    },
    delivery_note: {
      label: 'Albarán',
      icon: Package,
      className: 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-300',
    },
    credit_note: {
      label: 'Nota Crédito',
      icon: RotateCcw,
      className: 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-300',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} ${className} gap-1.5`}>
      <Icon className="h-3 w-3" />
      <span className="text-xs font-medium">{config.label}</span>
    </Badge>
  );
}
