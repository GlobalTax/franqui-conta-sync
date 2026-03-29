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
import { useCentres } from "@/hooks/useCentres";
import { Building2, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CompactOrgSelector() {
  const {
    selectedFranchiseeId,
    selectedCentreCode,
    setFilters,
    reset,
  } = useGlobalFilters();

  const { data: franchisees, isLoading: loadingFranchisees } = useFranchisees();
  const { data: centres } = useCentres(selectedFranchiseeId || undefined);

  // Get display names
  const selectedFranchisee = franchisees?.find(f => f.id === selectedFranchiseeId);
  const selectedCentre = centres?.find(c => c.codigo === selectedCentreCode);

  const hasFilters = selectedFranchiseeId || selectedCentreCode;

  const handleFranchiseeChange = (value: string) => {
    const id = value === "all" ? null : value;
    setFilters({ franchiseeId: id, centreCode: null });
  };

  const handleCentreChange = (value: string) => {
    const code = value === "all" ? null : value;
    setFilters({ centreCode: code });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[250px]">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="text-sm truncate">
              {selectedCentre ? (
                `${selectedCentre.codigo} - ${selectedCentre.nombre}`
              ) : selectedFranchisee ? (
                `Todos - ${selectedFranchisee.name}`
              ) : (
                "Organización"
              )}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-4 bg-card z-50" align="start">
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
            {loadingFranchisees ? (
              <div className="text-sm text-muted-foreground p-2">Cargando...</div>
            ) : !franchisees || franchisees.length === 0 ? (
              <div className="text-sm text-destructive p-2">No hay franquiciados disponibles</div>
            ) : (
              <Select
                value={selectedFranchiseeId || ""}
                onValueChange={handleFranchiseeChange}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Seleccionar franquiciado" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Todos los franquiciados</SelectItem>
                  {franchisees.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Centre */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Restaurante</Label>
            <Select
              value={selectedCentreCode || ""}
              onValueChange={handleCentreChange}
              disabled={!selectedFranchiseeId}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Todos los restaurantes" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todos los restaurantes</SelectItem>
                {centres?.map((c) => (
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
