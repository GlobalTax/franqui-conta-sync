import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { SupplierSelector } from '../SupplierSelector';

interface InboxTopFiltersProps {
  filters: {
    status?: string;
    supplier_id?: string;
    centro_code?: string;
    date_from?: string;
    date_to?: string;
    searchTerm?: string;
    ocr_engine?: string;
    posted?: boolean | null;
    invoice_type?: 'received' | 'issued' | null;
    data_quality?: 'with_ocr' | 'without_ocr' | 'errors' | null;
  };
  onFiltersChange: (filters: any) => void;
  onApply: () => void;
  compactView: boolean;
  onCompactViewChange: (value: boolean) => void;
}

export function InboxTopFilters({
  filters,
  onFiltersChange,
  onApply,
  compactView,
  onCompactViewChange,
}: InboxTopFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Contador de filtros activos
  const activeCount = Object.keys(filters).filter(
    (key) => {
      const value = filters[key as keyof typeof filters];
      return value !== undefined && value !== null && value !== '';
    }
  ).length;

  const handleClearAll = () => {
    onFiltersChange({});
    onApply();
  };

  return (
    <Card className="border-b rounded-none shadow-sm">
      {/* Fila 1: Filtros Principales */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-6 gap-4 items-end">
          {/* Periodo - 2 columnas */}
          <div className="col-span-2">
            <Label className="text-xs font-medium mb-2 block">Periodo</Label>
            <DateRangePicker
              startDate={filters.date_from ? new Date(filters.date_from) : undefined}
              endDate={filters.date_to ? new Date(filters.date_to) : undefined}
              onStartDateChange={(date) =>
                onFiltersChange({ ...filters, date_from: date?.toISOString().split('T')[0] })
              }
              onEndDateChange={(date) =>
                onFiltersChange({ ...filters, date_to: date?.toISOString().split('T')[0] })
              }
            />
          </div>

          {/* Contabilizado - 1 columna */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Contabilizado</Label>
            <Select
              value={
                filters.posted === true ? 'yes' : filters.posted === false ? 'no' : 'all'
              }
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  posted: value === 'yes' ? true : value === 'no' ? false : null,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="yes">
                  <span className="flex items-center gap-2">
                    ✅ Sí
                  </span>
                </SelectItem>
                <SelectItem value="no">
                  <span className="flex items-center gap-2">
                    ⏳ No
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Documento - 1 columna */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Tipo</Label>
            <Select
              value={filters.invoice_type || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  invoice_type: value === 'all' ? null : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="received">
                  <span className="flex items-center gap-2">
                    📥 Fact. Recibidas
                  </span>
                </SelectItem>
                <SelectItem value="issued">
                  <span className="flex items-center gap-2">
                    📤 Fact. Emitidas
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Motor OCR - 1 columna */}
          <div>
            <Label className="text-xs font-medium mb-2 block">Motor OCR</Label>
            <Select
              value={filters.ocr_engine || 'all'}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, ocr_engine: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="openai">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    OpenAI (Legacy)
                  </span>
                </SelectItem>
                <SelectItem value="mindee">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Mindee
                  </span>
                </SelectItem>
                <SelectItem value="merged">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Fusionado
                  </span>
                </SelectItem>
                <SelectItem value="manual_review">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    Manual
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botón Aplicar + Switch Compacto - 1 columna */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={onApply}
              className="w-full bg-primary hover:bg-primary/90"
              size="default"
            >
              Aplicar {activeCount > 0 && `(${activeCount})`}
            </Button>

            <div className="flex items-center justify-between gap-2 px-1">
              <Label
                htmlFor="compact-view"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Compacto
              </Label>
              <Switch
                id="compact-view"
                checked={compactView}
                onCheckedChange={onCompactViewChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fila 2: Filtros Avanzados (colapsable) */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <div className="border-t px-6 py-2 bg-muted/20">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between hover:bg-transparent"
            >
              <span className="flex items-center gap-2 text-sm">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros avanzados
                {activeCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeCount}
                  </Badge>
                )}
              </span>
              <span className="text-muted-foreground">{showAdvanced ? '▲' : '▼'}</span>
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="px-6 pb-4 pt-3 border-t bg-muted/30">
            <div className="grid grid-cols-6 gap-4 items-end">
              {/* Búsqueda de texto - 3 columnas */}
              <div className="col-span-3">
                <Label className="text-xs font-medium mb-2 block">Búsqueda</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar nº factura, proveedor, CIF..."
                    value={filters.searchTerm || ''}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        searchTerm: e.target.value.trim() || undefined,
                      })
                    }
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Proveedor - 2 columnas */}
              <div className="col-span-2">
                <Label className="text-xs font-medium mb-2 block">Proveedor</Label>
                <SupplierSelector
                  value={filters.supplier_id || ''}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, supplier_id: value || undefined })
                  }
                />
              </div>

              {/* Estado - 1 columna */}
              <div>
                <Label className="text-xs font-medium mb-2 block">Estado</Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, status: value === 'all' ? undefined : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="processing">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        Procesando
                      </span>
                    </SelectItem>
                    <SelectItem value="needs_review">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-400" />
                        Requiere Revisión
                      </span>
                    </SelectItem>
                    <SelectItem value="processed_ok">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        Procesado
                      </span>
                    </SelectItem>
                    <SelectItem value="draft">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                        Pendiente
                      </span>
                    </SelectItem>
                    <SelectItem value="pending_approval">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                        Pdte. Aprobación
                      </span>
                    </SelectItem>
                    <SelectItem value="approved_manager">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-400" />
                        En Revisión
                      </span>
                    </SelectItem>
                    <SelectItem value="approved_accounting">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        Aprobado
                      </span>
                    </SelectItem>
                    <SelectItem value="posted">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-600" />
                        Contabilizado
                      </span>
                    </SelectItem>
                    <SelectItem value="rejected">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        Rechazado
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botón Limpiar Filtros */}
            {activeCount > 0 && (
              <div className="mt-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpiar todos los filtros
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
