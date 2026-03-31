import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFiscalYears } from '@/hooks/useFiscalYears';
import { Loader2 } from 'lucide-react';

interface FiscalYearSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  centroCode?: string;
  /** Show all years or only open ones */
  showClosed?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function FiscalYearSelector({
  value,
  onValueChange,
  centroCode,
  showClosed = true,
  className,
  triggerClassName,
}: FiscalYearSelectorProps) {
  const { data: fiscalYears, isLoading } = useFiscalYears(centroCode);

  // Deduplicate years (multiple centres may have same year)
  const uniqueYears = Array.from(
    new Map(
      (fiscalYears || []).map(fy => [fy.year, fy])
    ).values()
  )
    .filter(fy => showClosed || fy.status === 'open')
    .sort((a, b) => b.year - a.year);

  // If no fiscal years from DB, show current year as fallback
  const currentYear = new Date().getFullYear();
  const fallbackYears = Array.from({ length: 3 }, (_, i) => currentYear - i);

  // Auto-select first available year if current value is not in the list
  const availableYears = uniqueYears.length > 0
    ? uniqueYears.map(fy => fy.year)
    : fallbackYears;

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 h-9 px-3 ${className || ''}`}>
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName || 'w-full bg-card border border-input hover:border-primary/30 transition-all rounded-lg h-9'}>
        <SelectValue placeholder="Seleccionar año" />
      </SelectTrigger>
      <SelectContent>
        {availableYears.map((year) => {
          const fy = uniqueYears.find(f => f.year === year);
          return (
            <SelectItem key={year} value={year.toString()}>
              {year} {fy?.status === 'closed' ? '(cerrado)' : ''}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
