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
      className: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: Clock,
    },
    pending_approval: {
      label: 'Pendiente',
      variant: 'default' as const,
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      icon: AlertCircle,
    },
    approved_manager: {
      label: 'Apr. Gerente',
      variant: 'default' as const,
      className: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: UserCheck,
    },
    approved_accounting: {
      label: 'Aprobado',
      variant: 'default' as const,
      className: 'bg-green-100 text-green-700 border-green-200',
      icon: CheckCircle2,
    },
    posted: {
      label: 'Contabilizado',
      variant: 'default' as const,
      className: 'bg-primary/10 text-primary border-primary/20',
      icon: FileCheck,
    },
    paid: {
      label: 'Pagado',
      variant: 'default' as const,
      className: 'bg-green-100 text-green-700 border-green-200',
      icon: CheckCircle2,
    },
    rejected: {
      label: 'Rechazado',
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-700 border-red-200',
      icon: XCircle,
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`${config.className} ${className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}
