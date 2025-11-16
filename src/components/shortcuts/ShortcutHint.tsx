// ============================================================================
// SHORTCUT HINT - Visual tooltip for keyboard shortcuts
// ============================================================================

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ShortcutHintProps {
  keys: string;
  description?: string;
  children: React.ReactNode;
}

export function ShortcutHint({ keys, description, children }: ShortcutHintProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex items-center gap-2">
          {description && <span className="text-sm">{description}</span>}
          <Badge variant="secondary" className="font-mono text-xs">
            {keys}
          </Badge>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
