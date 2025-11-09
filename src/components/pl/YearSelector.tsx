import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface YearSelectorProps {
  selectedYears: number[];
  onChange: (years: number[]) => void;
  availableYears?: number[];
}

export const YearSelector = ({ 
  selectedYears, 
  onChange,
  availableYears = [2024, 2023, 2022, 2021, 2020]
}: YearSelectorProps) => {
  const handleYearToggle = (year: number) => {
    if (selectedYears.includes(year)) {
      onChange(selectedYears.filter(y => y !== year));
    } else {
      onChange([...selectedYears, year].sort((a, b) => b - a));
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Años a comparar</Label>
          <div className="flex items-center gap-6">
            {availableYears.map((year) => (
              <div key={year} className="flex items-center space-x-2">
                <Checkbox
                  id={`year-${year}`}
                  checked={selectedYears.includes(year)}
                  onCheckedChange={() => handleYearToggle(year)}
                />
                <Label
                  htmlFor={`year-${year}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {year}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
