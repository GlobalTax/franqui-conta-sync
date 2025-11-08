import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
}

export const DateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const setPreset = (preset: string) => {
    const now = new Date();
    switch (preset) {
      case "thisMonth":
        onStartDateChange(startOfMonth(now));
        onEndDateChange(endOfMonth(now));
        break;
      case "lastMonth":
        onStartDateChange(startOfMonth(subMonths(now, 1)));
        onEndDateChange(endOfMonth(subMonths(now, 1)));
        break;
      case "thisYear":
        onStartDateChange(startOfYear(now));
        onEndDateChange(endOfYear(now));
        break;
      case "lastYear":
        onStartDateChange(startOfYear(subMonths(now, 12)));
        onEndDateChange(endOfYear(subMonths(now, 12)));
        break;
    }
    setIsOpen(false);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn(!startDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "dd/MM/yyyy") : "Fecha inicio"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={startDate} onSelect={onStartDateChange} />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn(!endDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "dd/MM/yyyy") : "Fecha fin"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={endDate} onSelect={onEndDateChange} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => setPreset("thisMonth")}>
          Este mes
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setPreset("lastMonth")}>
          Mes anterior
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setPreset("thisYear")}>
          Este año
        </Button>
      </div>
    </div>
  );
};
