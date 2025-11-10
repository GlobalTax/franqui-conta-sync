import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { useFranchisees } from "@/hooks/useFranchisees";
import { useCompanies } from "@/hooks/useCompanies";
import { useCentres } from "@/hooks/useCentres";
import { Building2, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CompactOrgSelector() {
  const {
    selectedFranchiseeId,
    selectedCompanyId,
    selectedCentreCode,
    setFranchiseeId,
    setCompanyId,
    setCentreCode,
    reset,
  } = useGlobalFilters();

  const { data: franchisees } = useFranchisees();
  const { data: companies } = useCompanies(selectedFranchiseeId || undefined);
  const { data: centres } = useCentres(selectedFranchiseeId || undefined);

  const filteredCentres = selectedCompanyId
    ? centres?.filter(c => c.company_id === selectedCompanyId)
    : centres;

  // Get display names
  const selectedFranchisee = franchisees?.find(f => f.id === selectedFranchiseeId);
  const selectedCompany = companies?.find(c => c.id === selectedCompanyId);
  const selectedCentre = centres?.find(c => c.codigo === selectedCentreCode);

  // Auto-select first franchisee if none selected
  useEffect(() => {
    if (!selectedFranchiseeId && franchisees && franchisees.length > 0) {
      setFranchiseeId(franchisees[0].id);
    }
  }, [franchisees, selectedFranchiseeId, setFranchiseeId]);

  const hasFilters = selectedFranchiseeId || selectedCompanyId || selectedCentreCode;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[250px]">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="text-sm truncate">
              {selectedCentre ? (
                `${selectedCentre.codigo} - ${selectedCentre.nombre}`
              ) : selectedCompany ? (
                selectedCompany.razon_social
              ) : selectedFranchisee ? (
                selectedFranchisee.name
              ) : (
                "Organización"
              )}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filtros de Organización</h4>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="h-7 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            )}
          </div>

          {/* Franchisee */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Franquiciado</Label>
            <Select
              value={selectedFranchiseeId || ""}
              onValueChange={(value) => setFranchiseeId(value === "all" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar franquiciado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los franquiciados</SelectItem>
                {franchisees?.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Entidad Mercantil</Label>
            <Select
              value={selectedCompanyId || ""}
              onValueChange={(value) => setCompanyId(value === "all" ? null : value)}
              disabled={!selectedFranchiseeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las sociedades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sociedades</SelectItem>
                {companies?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.razon_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Centre */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Centro</Label>
            <Select
              value={selectedCentreCode || ""}
              onValueChange={(value) => setCentreCode(value === "all" ? null : value)}
              disabled={!selectedFranchiseeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los centros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los centros</SelectItem>
                {filteredCentres?.map((c) => (
                  <SelectItem key={c.id} value={c.codigo}>
                    {c.codigo} - {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {hasFilters && (
            <div className="pt-3 border-t space-y-2">
              <Label className="text-xs text-muted-foreground">Filtros activos:</Label>
              <div className="flex flex-wrap gap-2">
                {selectedFranchisee && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedFranchisee.name}
                  </Badge>
                )}
                {selectedCompany && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedCompany.razon_social}
                  </Badge>
                )}
                {selectedCentre && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedCentre.codigo}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
