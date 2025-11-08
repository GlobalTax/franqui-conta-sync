import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCentres } from "@/hooks/useCentres";
import { Filter, X } from "lucide-react";
import type { InvoiceReceived } from "@/hooks/useInvoicesReceived";

interface InvoiceFiltersPanelProps {
  filters: {
    status: string[];
    supplierId: string | null;
    centroCode: string[];
    minOcrConfidence: number;
    dateFrom: string;
    dateTo: string;
  };
  onFiltersChange: (filters: any) => void;
  invoices: InvoiceReceived[];
}

export function InvoiceFiltersPanel({
  filters,
  onFiltersChange,
  invoices,
}: InvoiceFiltersPanelProps) {
  const { data: suppliers } = useSuppliers();
  const { data: centres } = useCentres();

  const statusOptions = [
    { value: "all", label: "Todos", count: invoices.length },
    {
      value: "pending_approval",
      label: "Pendiente",
      count: invoices.filter((i) => i.approval_status === "pending_approval")
        .length,
    },
    {
      value: "approved_manager",
      label: "Apr. Gerente",
      count: invoices.filter((i) => i.approval_status === "approved_manager")
        .length,
    },
    {
      value: "approved_accounting",
      label: "Aprobado",
      count: invoices.filter((i) => i.approval_status === "approved_accounting")
        .length,
    },
    {
      value: "posted",
      label: "Contabilizado",
      count: invoices.filter((i) => i.approval_status === "posted").length,
    },
    {
      value: "rejected",
      label: "Rechazado",
      count: invoices.filter((i) => i.approval_status === "rejected").length,
    },
  ];

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value === "all" ? [] : [value],
    });
  };

  const handleCentreToggle = (centroCode: string, checked: boolean) => {
    const newCodes = checked
      ? [...filters.centroCode, centroCode]
      : filters.centroCode.filter((c) => c !== centroCode);
    onFiltersChange({ ...filters, centroCode: newCodes });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      status: [],
      supplierId: null,
      centroCode: [],
      minOcrConfidence: 0,
      dateFrom: "",
      dateTo: "",
      searchQuery: "",
    });
  };

  const activeFilterCount =
    filters.status.length +
    (filters.supplierId ? 1 : 0) +
    filters.centroCode.length +
    (filters.minOcrConfidence > 0 ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0);

  return (
    <Card className="p-4 border-border/40 shadow-sm sticky top-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Filtros</h3>
          </div>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Estado */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Estado</Label>
          <RadioGroup
            value={filters.status[0] || "all"}
            onValueChange={handleStatusChange}
          >
            {statusOptions.map((option) => (
              <div
                key={option.value}
                className="flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label
                    htmlFor={option.value}
                    className="text-sm cursor-pointer font-normal"
                  >
                    {option.label}
                  </Label>
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {option.count}
                </span>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Separator />

        {/* Proveedor */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Proveedor</Label>
          <Select
            value={filters.supplierId || "all"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                supplierId: value === "all" ? null : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los proveedores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proveedores</SelectItem>
              {suppliers?.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Centro */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Centro</Label>
          <div className="space-y-2">
            {centres?.map((centre) => {
              const count = invoices.filter(
                (i) => i.centro_code === centre.codigo
              ).length;
              return (
                <div
                  key={centre.codigo}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={centre.codigo}
                      checked={filters.centroCode.includes(centre.codigo)}
                      onCheckedChange={(checked) =>
                        handleCentreToggle(centre.codigo, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={centre.codigo}
                      className="text-sm cursor-pointer font-normal truncate max-w-[140px]"
                      title={centre.nombre}
                    >
                      {centre.codigo}
                    </Label>
                  </div>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Confianza OCR */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Confianza OCR</Label>
            <span className="text-xs font-medium text-primary">
              ≥ {filters.minOcrConfidence}%
            </span>
          </div>
          <Slider
            value={[filters.minOcrConfidence]}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, minOcrConfidence: value[0] })
            }
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        <Separator />

        {/* Rango de fechas */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Rango de Fechas</Label>
          <div className="space-y-2">
            <div>
              <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
                Desde
              </Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  onFiltersChange({ ...filters, dateFrom: e.target.value })
                }
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
                Hasta
              </Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  onFiltersChange({ ...filters, dateTo: e.target.value })
                }
                className="text-sm"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Botón limpiar */}
        {activeFilterCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Limpiar Filtros
          </Button>
        )}
      </div>
    </Card>
  );
}
