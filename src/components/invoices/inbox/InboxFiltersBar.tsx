import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SupplierSelector } from '../SupplierSelector';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { Badge } from '@/components/ui/badge';

interface InboxFiltersBarProps {
  filters: {
    status?: string;
    supplier_id?: string;
    centro_code?: string;
    date_from?: string;
    date_to?: string;
    searchTerm?: string;
    ocr_engine?: string;
  };
  onChange: (filters: any) => void;
  activeCount: number;
}

export function InboxFiltersBar({ filters, onChange, activeCount }: InboxFiltersBarProps) {
  const handleClearFilters = () => {
    onChange({});
  };

  return (
    <div className="border-b bg-muted/30 px-6 py-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtros:
        </div>

        {/* Búsqueda por texto */}
        <div className="flex-1 min-w-[240px]">
          <Input
            placeholder="Buscar nº factura, proveedor, CIF..."
            value={filters.searchTerm || ''}
            onChange={(e) => onChange({ ...filters, searchTerm: e.target.value.trim() || undefined })}
            className="w-full"
          />
        </div>

        {/* Estado */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => onChange({ ...filters, status: value === 'all' ? undefined : value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
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

        {/* Motor OCR */}
        <Select
          value={filters.ocr_engine || 'all'}
          onValueChange={(value) => onChange({ ...filters, ocr_engine: value === 'all' ? undefined : value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Motor OCR" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los motores</SelectItem>
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

        {/* Proveedor */}
        <div className="w-[240px]">
          <SupplierSelector
            value={filters.supplier_id || ''}
            onValueChange={(value) => onChange({ ...filters, supplier_id: value || undefined })}
          />
        </div>

        {/* Rango de fechas */}
        <DateRangePicker
          startDate={filters.date_from ? new Date(filters.date_from) : undefined}
          endDate={filters.date_to ? new Date(filters.date_to) : undefined}
          onStartDateChange={(date) => onChange({ ...filters, date_from: date?.toISOString().split('T')[0] })}
          onEndDateChange={(date) => onChange({ ...filters, date_to: date?.toISOString().split('T')[0] })}
        />

        {/* Contador de filtros activos */}
        {activeCount > 0 && (
          <>
            <Badge variant="secondary" className="ml-2">
              {activeCount} filtro{activeCount > 1 ? 's' : ''} activo{activeCount > 1 ? 's' : ''}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8"
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
