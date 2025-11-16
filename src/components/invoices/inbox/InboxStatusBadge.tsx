import { Badge } from '@/components/ui/badge';
import { INVOICE_STATES, getInvoiceState, type InvoiceStatus } from '@/lib/invoice-states';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';

interface InboxStatusBadgeProps {
  status: string;
  hasEntry?: boolean;
  ocrEngine?: string | null;
  ocrConfidence?: number | null;
  approvalStatus?: string;
  className?: string;
  showIcon?: boolean;
  mindeeConfidence?: number | null;
  ocrFallbackUsed?: boolean;
  showTooltip?: boolean;
}

export function InboxStatusBadge({ 
  status, 
  hasEntry, 
  ocrEngine,
  ocrConfidence,
  approvalStatus,
  className,
  showIcon = true,
  mindeeConfidence,
  ocrFallbackUsed = false,
  showTooltip = true
}: InboxStatusBadgeProps) {
  const computedState = getInvoiceState({
    status,
    ocr_engine: ocrEngine,
    ocr_confidence: ocrConfidence,
    accounting_entry_id: hasEntry ? 'dummy' : null,
    approval_status: approvalStatus,
    mindee_confidence: mindeeConfidence,
    ocr_fallback_used: ocrFallbackUsed
  });
  
  const config = INVOICE_STATES[computedState];
  const Icon = config.icon;
  
  const isProcessing = computedState === 'processing';
  const iconClassName = isProcessing ? 'w-3 h-3 mr-1 animate-spin' : 'w-3 h-3 mr-1';
  
  const badgeContent = (
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
      {ocrFallbackUsed && (
        <AlertTriangle className="w-3 h-3 ml-1 text-orange-500" />
      )}
    </Badge>
  );
  
  // Si hay métricas de Mindee, mostrar tooltip
  if (showTooltip && (mindeeConfidence !== null && mindeeConfidence !== undefined || ocrFallbackUsed)) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-sm">
              {mindeeConfidence !== null && mindeeConfidence !== undefined && (
                <p>Confianza: {Math.round(mindeeConfidence)}%</p>
              )}
              {ocrFallbackUsed && (
                <p className="text-orange-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Parsers de respaldo usados
                </p>
              )}
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return badgeContent;
}
