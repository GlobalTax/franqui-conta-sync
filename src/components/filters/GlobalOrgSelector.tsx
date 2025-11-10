import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useGlobalFilters } from "@/hooks/useGlobalFilters";
import { useFranchisees } from "@/hooks/useFranchisees";
import { useCompanies } from "@/hooks/useCompanies";
import { useCentres } from "@/hooks/useCentres";
import { Building2, Factory, Store } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalOrgSelector() {
  const {
    selectedFranchiseeId,
    selectedCompanyId,
    selectedCentreCode,
    setFranchiseeId,
    setCompanyId,
    setCentreCode,
  } = useGlobalFilters();

  // Fetch data
  const { data: franchisees, isLoading: loadingFranchisees } = useFranchisees();
  const { data: companies, isLoading: loadingCompanies } = useCompanies(selectedFranchiseeId || undefined);
  const { data: centres, isLoading: loadingCentres } = useCentres(selectedFranchiseeId || undefined);

  // Filter centres by company if selected
  const filteredCentres = selectedCompanyId
    ? centres?.filter(c => c.company_id === selectedCompanyId)
    : centres;

  // Auto-select first franchisee if none selected
  useEffect(() => {
    if (!selectedFranchiseeId && franchisees && franchisees.length > 0) {
      setFranchiseeId(franchisees[0].id);
    }
  }, [franchisees, selectedFranchiseeId, setFranchiseeId]);

  if (loadingFranchisees) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[200px]" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
      {/* Franchisee Selector */}
      <div className="flex items-center gap-2 min-w-[200px]">
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select
          value={selectedFranchiseeId || ""}
          onValueChange={(value) => setFranchiseeId(value || null)}
        >
          <SelectTrigger className="h-9 border-0 bg-transparent focus:ring-0">
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

      <div className="h-6 w-px bg-border" />

      {/* Company Selector */}
      <div className="flex items-center gap-2 min-w-[200px]">
        <Factory className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select
          value={selectedCompanyId || ""}
          onValueChange={(value) => setCompanyId(value || null)}
          disabled={!selectedFranchiseeId || loadingCompanies}
        >
          <SelectTrigger className="h-9 border-0 bg-transparent focus:ring-0">
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

      <div className="h-6 w-px bg-border" />

      {/* Centre Selector */}
      <div className="flex items-center gap-2 min-w-[200px]">
        <Store className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select
          value={selectedCentreCode || ""}
          onValueChange={(value) => setCentreCode(value || null)}
          disabled={!selectedFranchiseeId || loadingCentres}
        >
          <SelectTrigger className="h-9 border-0 bg-transparent focus:ring-0">
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
    </div>
  );
}
