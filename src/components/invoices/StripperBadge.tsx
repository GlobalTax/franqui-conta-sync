// ============================================================================
// COMPONENT: Stripper Badge
// Badge que indica que los datos han sido normalizados por el Stripper
// ============================================================================

import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StripperBadgeProps {
  changesCount: number;
  appliedAt: Date;
}

export function StripperBadge({ changesCount, appliedAt }: StripperBadgeProps) {
  const timeAgo = formatTimeAgo(appliedAt);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="gap-1 bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
            <Sparkles className="h-3 w-3" />
            Normalizado
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {changesCount} campo{changesCount !== 1 ? 's' : ''} normalizado{changesCount !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'hace unos segundos';
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)}h`;
  return `hace ${Math.floor(seconds / 86400)}d`;
}
