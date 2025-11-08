import { Badge } from '@/components/ui/badge';
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VerifactuBadgeProps {
  hasHash: boolean;
  isSigned?: boolean;
  sentToAEAT?: boolean;
  className?: string;
}

export function VerifactuBadge({ 
  hasHash, 
  isSigned = false, 
  sentToAEAT = false,
  className 
}: VerifactuBadgeProps) {
  const getStatus = () => {
    if (!hasHash) {
      return {
        icon: ShieldX,
        variant: 'destructive' as const,
        label: 'Sin Hash',
        description: 'No se ha generado el hash de integridad',
      };
    }
    
    if (!isSigned) {
      return {
        icon: ShieldAlert,
        variant: 'secondary' as const,
        label: 'Sin Firmar',
        description: 'Hash generado pero sin firma digital',
      };
    }
    
    if (!sentToAEAT) {
      return {
        icon: Shield,
        variant: 'default' as const,
        label: 'Firmado',
        description: 'Firmado digitalmente, pendiente de envío a AEAT',
      };
    }
    
    return {
      icon: ShieldCheck,
      variant: 'default' as const,
      label: 'Verifactu OK',
      description: 'Hash generado, firmado y enviado a AEAT',
    };
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={status.variant} className={className}>
            <Icon className="w-3 h-3 mr-1" />
            {status.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{status.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
