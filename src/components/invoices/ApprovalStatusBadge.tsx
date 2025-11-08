import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  UserCheck,
  FileCheck
} from 'lucide-react';

interface ApprovalStatusBadgeProps {
  status: string;
  className?: string;
}

export function ApprovalStatusBadge({ status, className }: ApprovalStatusBadgeProps) {
  const statusConfig = {
    draft: {
      label: 'Borrador',
      variant: 'secondary' as const,
      icon: Clock,
    },
    pending_approval: {
      label: 'Pendiente Aprobación',
      variant: 'default' as const,
      icon: AlertCircle,
    },
    approved_manager: {
      label: 'Aprobado Gerente',
      variant: 'default' as const,
      icon: UserCheck,
    },
    approved_accounting: {
      label: 'Aprobado Contabilidad',
      variant: 'default' as const,
      icon: CheckCircle2,
    },
    posted: {
      label: 'Contabilizado',
      variant: 'default' as const,
      icon: FileCheck,
    },
    paid: {
      label: 'Pagado',
      variant: 'default' as const,
      icon: CheckCircle2,
    },
    rejected: {
      label: 'Rechazado',
      variant: 'destructive' as const,
      icon: XCircle,
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}
