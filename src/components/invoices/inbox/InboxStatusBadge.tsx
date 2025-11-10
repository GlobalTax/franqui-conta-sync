import { Badge } from '@/components/ui/badge';
import { INVOICE_STATES, getInvoiceState, type InvoiceStatus } from '@/lib/invoice-states';
import { cn } from '@/lib/utils';

interface InboxStatusBadgeProps {
  status: string;
  hasEntry?: boolean;
  ocrEngine?: string | null;
  ocrConfidence?: number | null;
  approvalStatus?: string;
  className?: string;
  showIcon?: boolean;
}

export function InboxStatusBadge({ 
  status, 
  hasEntry, 
  ocrEngine,
  ocrConfidence,
  approvalStatus,
  className,
  showIcon = true
}: InboxStatusBadgeProps) {
  // Determinar estado usando sistema centralizado
  const computedState = getInvoiceState({
    status,
    ocr_engine: ocrEngine,
    ocr_confidence: ocrConfidence,
    accounting_entry_id: hasEntry ? 'dummy' : null,
    approval_status: approvalStatus
  });
  
  const config = INVOICE_STATES[computedState];
  const Icon = config.icon;
  
  const isProcessing = computedState === 'processing';
  const iconClassName = isProcessing ? 'w-3 h-3 mr-1 animate-spin' : 'w-3 h-3 mr-1';
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.bgColor,
        config.borderColor,
        config.textColor,
        config.darkBgColor,
        config.darkBorderColor,
        config.darkTextColor,
        className
      )}
    >
      {showIcon && <Icon className={iconClassName} />}
      {config.label}
    </Badge>
  );
}
