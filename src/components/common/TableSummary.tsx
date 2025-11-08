interface SummaryItem {
  label: string;
  value: string | number;
  color?: 'default' | 'primary' | 'success' | 'destructive';
}

interface TableSummaryProps {
  items: SummaryItem[];
}

export const TableSummary = ({ items }: TableSummaryProps) => {
  const getColorClass = (color?: string) => {
    switch (color) {
      case 'primary':
        return 'text-primary';
      case 'success':
        return 'text-green-600';
      case 'destructive':
        return 'text-destructive';
      default:
        return 'text-foreground';
    }
  };

  return (
    <div className="flex items-center justify-between py-4 border-t bg-muted/30 px-4">
      {items.map((item, idx) => (
        <div key={idx} className="text-center">
          <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
          <p className={`text-lg font-bold ${getColorClass(item.color)}`}>
            {typeof item.value === 'number' 
              ? item.value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : item.value
            }
          </p>
        </div>
      ))}
    </div>
  );
};
