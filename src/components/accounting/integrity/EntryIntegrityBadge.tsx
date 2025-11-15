// ============================================================================
// ENTRY INTEGRITY BADGE - Indicador visual de integridad contable
// ============================================================================

import { Shield, ShieldCheck, ShieldAlert, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EntryIntegrityBadgeProps {
  entryHash?: string | null;
  chainValidated?: boolean | null;
  lockedAt?: string | null;
  status: 'draft' | 'posted' | 'closed';
}

export function EntryIntegrityBadge({
  entryHash,
  chainValidated,
  lockedAt,
  status
}: EntryIntegrityBadgeProps) {
  if (status === 'draft') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Borrador
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Los borradores no tienen hash de integridad</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (lockedAt) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="default" className="gap-1 bg-blue-600">
              <Lock className="h-3 w-3" />
              Bloqueado
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Asiento inmutable desde {new Date(lockedAt).toLocaleDateString()}</p>
            <p className="text-xs text-muted-foreground">Cumplimiento RD 1007/2023</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!entryHash) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
              <ShieldAlert className="h-3 w-3" />
              Sin hash
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Este asiento aún no tiene firma digital</p>
            <p className="text-xs text-muted-foreground">Recomendado recalcular hash</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (chainValidated === false) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="gap-1">
              <ShieldAlert className="h-3 w-3" />
              Cadena rota
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>La cadena de integridad está rota</p>
            <p className="text-xs text-muted-foreground">Requiere revisión inmediata</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
            <ShieldCheck className="h-3 w-3" />
            Integridad OK
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Hash: {entryHash?.substring(0, 16)}...</p>
          <p className="text-xs text-muted-foreground">Asiento verificado e íntegro</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
