import { Badge } from '@/components/ui/badge';
import { Brain, Cpu, GitMerge, User } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OCREngineBadgeProps {
  engine: 'openai' | 'merged' | 'manual_review' | null;
  confidence?: number;
  processingTime?: number;
  className?: string;
}

export function OCREngineBadge({
  engine,
  confidence,
  processingTime,
  className,
}: OCREngineBadgeProps) {
  if (!engine) return <Badge variant="outline" className={className}>Sin OCR</Badge>;

  const engineConfig = {
    openai: {
      label: 'OpenAI',
      icon: Brain,
      dot: 'bg-green-500',
      className: 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300',
    },
    merged: {
      label: 'Fusionado',
      icon: GitMerge,
      dot: 'bg-yellow-500',
      className: 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
    },
    manual_review: {
      label: 'Manual',
      icon: User,
      dot: 'bg-gray-400',
      className: 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300',
    },
  };

  const config = engineConfig[engine];
  const Icon = config.icon;

  const tooltipContent = (
    <div className="space-y-1 text-xs">
      <p className="font-medium">{config.label}</p>
      {confidence !== undefined && (
        <p>Confianza: {Math.round(confidence * 100)}%</p>
      )}
      {processingTime !== undefined && (
        <p>Tiempo: {(processingTime / 1000).toFixed(2)}s</p>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${config.className} ${className} gap-1.5`}>
            <span className={`w-2 h-2 rounded-full ${config.dot}`} />
            <Icon className="h-3 w-3" />
            <span className="text-xs">{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
