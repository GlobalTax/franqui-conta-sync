import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAllUserCentres } from "@/hooks/useAllUserCentres";
import { useAllUserCompanies } from "@/hooks/useAllUserCompanies";
import { AlertCircle, Building2, Store, RefreshCw, Briefcase, Users } from "lucide-react";
import { ViewSelection } from "@/contexts/ViewContext";
import { useEffect } from "react";

interface CentreSelectorProps {
  value: ViewSelection | null;
  onChange: (value: ViewSelection) => void;
}

export const CentreSelector = ({ value, onChange }: CentreSelectorProps) => {
  const { data: franchiseesWithCentres, isLoading: centresLoading, error: centresError, isError: centresIsError, refetch: refetchCentres } = useAllUserCentres();
  const { data: franchiseesWithCompanies, isLoading: companiesLoading, refetch: refetchCompanies } = useAllUserCompanies();

  const isLoading = centresLoading || companiesLoading;
  const isError = centresIsError;
  const error = centresError;

  // Auto-select "all" (consolidated view) when data loads and no view is selected
  useEffect(() => {
    if (!isLoading && !value && (franchiseesWithCentres?.length || franchiseesWithCompanies?.length)) {
      onChange({
        type: 'all',
        id: 'all',
        name: 'Consolidado General - Todos los Franquiciados'
      });
    }
  }, [franchiseesWithCentres, franchiseesWithCompanies, value, onChange, isLoading]);

  if (isLoading) {
    return (
      <div className="w-full h-10 border border-input rounded-md flex items-center gap-2 px-3 bg-background">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 flex-1" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="w-full">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error al cargar datos</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>No se pudieron cargar las sociedades y centros. Por favor, intenta de nuevo.</p>
            {error?.message && (
              <p className="text-xs opacity-70">{error.message}</p>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetchCentres()}
              className="mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Reintentar
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!franchiseesWithCentres?.length && !franchiseesWithCompanies?.length) {
    return null;
  }

  return (
    <Select
      value={value ? `${value.type}:${value.id}` : undefined}
      onValueChange={(val) => {
        const [type, id] = val.split(':');
        
        if (type === 'all') {
          onChange({ 
            type: 'all', 
            id: 'all', 
            name: 'Consolidado General - Todos los Franquiciados' 
          });
        } else if (type === 'company') {
          // Find company across all franchisees
          let foundCompany = null;
          for (const franchisee of franchiseesWithCompanies || []) {
            foundCompany = franchisee.companies.find(c => c.id === id);
            if (foundCompany) break;
          }
          if (foundCompany) {
            onChange({ 
              type: 'company', 
              id, 
              name: foundCompany.razon_social
            });
          }
        } else if (type === 'centre') {
          // Find centre across all franchisees
          let foundCentre = null;
          for (const franchisee of franchiseesWithCentres || []) {
            foundCentre = franchisee.centres.find(c => c.id === id);
            if (foundCentre) break;
          }
          if (foundCentre) {
            onChange({ 
              type: 'centre', 
              id, 
              name: `${foundCentre.codigo} - ${foundCentre.nombre}` 
            });
          }
        }
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Seleccionar vista..." />
      </SelectTrigger>
      <SelectContent className="max-h-[500px]">
        {/* Opción consolidada general */}
        <SelectItem value="all:all" className="font-semibold bg-primary/5 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span>📊 Consolidado General - Todos</span>
          </div>
        </SelectItem>
        
        {/* Sociedades mercantiles agrupadas por franquiciado */}
        {franchiseesWithCompanies && franchiseesWithCompanies.length > 0 && (
          <>
            <div className="px-2 py-2 text-xs font-bold text-foreground bg-muted/50 sticky top-10 z-10">
              💼 Sociedades Mercantiles
            </div>
            {franchiseesWithCompanies.map((franchisee) => (
              <div key={`company-franchisee-${franchisee.id}`}>
                {/* Franchisee header */}
                <div className="px-3 py-1.5 text-xs font-semibold text-primary flex items-center gap-2 bg-primary/5">
                  <Users className="h-3 w-3" />
                  {franchisee.name}
                </div>
                {/* Companies for this franchisee */}
                {franchisee.companies.map((company) => (
                  <div key={company.id}>
                    <SelectItem 
                      value={`company:${company.id}`}
                      className="pl-8"
                    >
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-blue-500" />
                        <span>{company.razon_social}</span>
                        <span className="text-xs text-muted-foreground">({company.cif})</span>
                      </div>
                    </SelectItem>
                    
                    {/* Nested centres if company has 2+ centres */}
                    {company.centres && company.centres.length >= 2 && (
                      <div className="bg-muted/20">
                        {company.centres.map((centre) => (
                          <SelectItem 
                            key={centre.id} 
                            value={`centre:${centre.id}`}
                            className="pl-12"
                          >
                            <div className="flex items-center gap-2">
                              <Store className="h-3 w-3 text-success" />
                              <span className="text-sm">{centre.codigo} - {centre.nombre}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
};
