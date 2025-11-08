import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, addMonths, subMonths, addQuarters, subQuarters, addYears, subYears } from "date-fns";
import { es } from "date-fns/locale";

type PeriodView = "month" | "quarter" | "year";

interface PeriodSelectorProps {
  value?: Date;
  onChange?: (date: Date) => void;
  defaultView?: PeriodView;
}

export const PeriodSelector = ({ 
  value = new Date(), 
  onChange,
  defaultView = "month" 
}: PeriodSelectorProps) => {
  const [view, setView] = useState<PeriodView>(defaultView);
  const [currentDate, setCurrentDate] = useState(value);

  const handlePrevious = () => {
    let newDate: Date;
    switch (view) {
      case "month":
        newDate = subMonths(currentDate, 1);
        break;
      case "quarter":
        newDate = subQuarters(currentDate, 1);
        break;
      case "year":
        newDate = subYears(currentDate, 1);
        break;
    }
    setCurrentDate(newDate);
    onChange?.(newDate);
  };

  const handleNext = () => {
    let newDate: Date;
    switch (view) {
      case "month":
        newDate = addMonths(currentDate, 1);
        break;
      case "quarter":
        newDate = addQuarters(currentDate, 1);
        break;
      case "year":
        newDate = addYears(currentDate, 1);
        break;
    }
    setCurrentDate(newDate);
    onChange?.(newDate);
  };

  const formatPeriod = (date: Date) => {
    switch (view) {
      case "month":
        return format(date, "MMMM yyyy", { locale: es });
      case "quarter":
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `T${quarter} ${format(date, "yyyy")}`;
      case "year":
        return format(date, "yyyy");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Selector de tipo de vista */}
      <Select value={view} onValueChange={(v) => setView(v as PeriodView)}>
        <SelectTrigger className="w-32">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="month">Mensual</SelectItem>
          <SelectItem value="quarter">Trimestral</SelectItem>
          <SelectItem value="year">Anual</SelectItem>
        </SelectContent>
      </Select>

      {/* Navegación de periodo */}
      <div className="flex items-center gap-1 border rounded-md bg-background">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handlePrevious}
          className="h-9 px-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="px-4 py-1 min-w-[180px] text-center font-medium capitalize">
          {formatPeriod(currentDate)}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleNext}
          className="h-9 px-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
