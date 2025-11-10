import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';

interface InboxStatusBadgeProps {
  status: string;
  hasEntry?: boolean;
  className?: string;
}

export function InboxStatusBadge({ status, hasEntry, className }: InboxStatusBadgeProps) {
  // Si tiene entry_id, siempre es contabilizado (verde)
  if (hasEntry) {
    return (
      <Badge 
        variant="outline"
        className={`border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300 ${className}`}
      >
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Contabilizado
      </Badge>
    );
  }

  // Mapeo de estados
  const statusConfig = {
    draft: {
      label: 'Pendiente',
      className: 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300',
      icon: Clock,
    },
    pending_approval: {
      label: 'Pendiente',
      className: 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300',
      icon: Clock,
    },
    processing: {
      label: 'Procesando',
      className: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300',
      icon: Loader2,
    },
    needs_review: {
      label: 'Requiere Revisión',
      className: 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-300',
      icon: AlertTriangle,
    },
    processed_ok: {
      label: 'Procesado',
      className: 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300',
      icon: CheckCircle2,
    },
    approved_manager: {
      label: 'En Revisión',
      className: 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
      icon: AlertCircle,
    },
    review: {
      label: 'En Revisión',
      className: 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
      icon: AlertCircle,
    },
    approved_accounting: {
      label: 'Aprobado',
      className: 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300',
      icon: CheckCircle2,
    },
    rejected: {
      label: 'Rechazado',
      className: 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300',
      icon: XCircle,
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  const Icon = config.icon;

  // Add spin animation for processing state
  const iconClassName = status === 'processing' ? 'w-3 h-3 mr-1 animate-spin' : 'w-3 h-3 mr-1';

  return (
    <Badge variant="outline" className={`${config.className} ${className}`}>
      <Icon className={iconClassName} />
      {config.label}
    </Badge>
  );
}
