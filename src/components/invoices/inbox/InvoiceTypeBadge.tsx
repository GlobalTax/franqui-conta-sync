import { Badge } from '@/components/ui/badge';
import { Download, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvoiceTypeBadgeProps {
  type: 'received' | 'issued';
  compact?: boolean;
}

export function InvoiceTypeBadge({ type, compact = false }: InvoiceTypeBadgeProps) {
  const isReceived = type === 'received';
  
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium gap-1.5",
        isReceived 
          ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700" 
          : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700",
        compact && "text-xs py-0 px-1.5 gap-1"
      )}
    >
      {isReceived ? (
        <>
          <Download className={cn("h-3 w-3", compact && "h-2.5 w-2.5")} />
          {!compact && 'Recibida'}
        </>
      ) : (
        <>
          <Upload className={cn("h-3 w-3", compact && "h-2.5 w-2.5")} />
          {!compact && 'Emitida'}
        </>
      )}
    </Badge>
  );
}
