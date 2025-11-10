// ============================================================================
// COMPONENT: Field with Stripper Tooltip
// Wrapper que añade tooltip a campos modificados por el Stripper
// ============================================================================

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles } from 'lucide-react';
import type { NormalizationChange } from '@/lib/fiscal-normalizer';

interface FieldWithStripperTooltipProps {
  children: React.ReactNode;
  change?: NormalizationChange;
  className?: string;
}

export function FieldWithStripperTooltip({ 
  children, 
  change,
  className = ''
}: FieldWithStripperTooltipProps) {
  if (!change) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`relative ${className}`}>
            {children}
            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold text-xs text-green-600">✨ Valor normalizado</p>
            <p className="text-xs text-muted-foreground">{change.rule}</p>
            {change.before && (
              <div className="text-xs pt-1 border-t">
                <span className="text-muted-foreground">Antes: </span>
                <span className="font-mono">{String(change.before)}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
