// ============================================================================
// OCR FILTERS
// Panel de filtros para bandeja OCR
// ============================================================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";
import type { OCRFiltersState } from "@/pages/digitization/OCRInbox";

interface OCRFiltersProps {
  value: OCRFiltersState;
  onApply: (filters: OCRFiltersState) => void;
  invoices: any[];
}

export function OCRFilters({ value, onApply, invoices }: OCRFiltersProps) {
  
  const activeFiltersCount = 
    value.status.length +
    (value.supplierId ? 1 : 0) +
    value.centroCode.length +
    (value.minOcrConfidence > 0 ? 1 : 0) +
    (value.dateFrom ? 1 : 0) +
    (value.dateTo ? 1 : 0);

  const handleClearFilters = () => {
    onApply({
      status: [],
      supplierId: null,
      centroCode: [],
      minOcrConfidence: 0,
      dateFrom: "",
      dateTo: "",
      searchQuery: "",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <CardTitle className="text-base">Filtros</CardTitle>
          </div>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Confianza OCR */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Confianza OCR</Label>
            <span className="text-sm text-muted-foreground">
              ≥ {value.minOcrConfidence}%
            </span>
          </div>
          <Slider
            value={[value.minOcrConfidence]}
            onValueChange={(vals) =>
              onApply({ ...value, minOcrConfidence: vals[0] })
            }
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* Estado */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Estado</Label>
          <div className="flex flex-wrap gap-2">
            {['draft', 'pending_approval', 'approved', 'posted'].map((status) => (
              <Badge
                key={status}
                variant={value.status.includes(status) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  const newStatus = value.status.includes(status)
                    ? value.status.filter((s) => s !== status)
                    : [...value.status, status];
                  onApply({ ...value, status: newStatus });
                }}
              >
                {status}
              </Badge>
            ))}
          </div>
        </div>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <button
            onClick={handleClearFilters}
            className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <X className="w-4 h-4" />
            Limpiar filtros
          </button>
        )}

        {/* Stats */}
        <div className="pt-4 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total facturas:</span>
            <span className="font-medium">{invoices.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
