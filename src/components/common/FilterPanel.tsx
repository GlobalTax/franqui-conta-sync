import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FilterPanelProps {
  title?: string;
  isExpanded?: boolean;
  children: React.ReactNode;
  onApply?: () => void;
  onClear?: () => void;
}

export const FilterPanel = ({ 
  title = "Filtros",
  isExpanded: defaultExpanded = true,
  children,
  onApply,
  onClear
}: FilterPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card>
      <CardContent className="p-4">
        <div 
          className="flex items-center justify-between cursor-pointer mb-4"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <span className="text-muted-foreground">☰</span>
            {title}
          </h3>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {isExpanded && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              {children}
            </div>
            
            <div className="flex items-center justify-end gap-2">
              {onClear && (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-primary hover:text-primary/80"
                  onClick={onClear}
                >
                  🔄 Limpiar filtros
                </Button>
              )}
              {onApply && (
                <Button 
                  size="sm" 
                  onClick={onApply}
                >
                  Aplicar filtros
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
