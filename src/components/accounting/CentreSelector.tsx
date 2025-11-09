import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCentres } from "@/hooks/useCentres";
import { useCompanies } from "@/hooks/useCompanies";
import { AlertCircle, Building2, Store, RefreshCw, Briefcase } from "lucide-react";
import { ViewSelection } from "@/contexts/ViewContext";
import { useEffect } from "react";

interface CentreSelectorProps {
  franchiseeId: string;
  value: ViewSelection | null;
  onChange: (value: ViewSelection) => void;
}

export const CentreSelector = ({ franchiseeId, value, onChange }: CentreSelectorProps) => {
  const { data: centres, isLoading: centresLoading, error: centresError, isError: centresIsError, refetch: refetchCentres } = useCentres(franchiseeId);
  const { data: companies, isLoading: companiesLoading } = useCompanies(franchiseeId);

  const isLoading = centresLoading || companiesLoading;
  const isError = centresIsError;
  const error = centresError;

  // Auto-select "all" (consolidated view) when data loads and no view is selected
  useEffect(() => {
    if (!isLoading && !value && (centres?.length || companies?.length)) {
      onChange({
        type: 'all',
        id: franchiseeId,
        name: 'Consolidado General'
      });
    }
  }, [centres, companies, value, onChange, franchiseeId, isLoading]);

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

  if (!centres || centres.length === 0) {
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
            id: franchiseeId, 
            name: 'Consolidado General' 
          });
        } else if (type === 'company') {
          const company = companies?.find(c => c.id === id);
          if (company) {
            onChange({ 
              type: 'company', 
              id, 
              name: company.razon_social
            });
          }
        } else {
          const centre = centres?.find(c => c.id === id);
          if (centre) {
            onChange({ 
              type: 'centre', 
              id, 
              name: `${centre.codigo} - ${centre.nombre}` 
            });
          }
        }
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Seleccionar vista..." />
      </SelectTrigger>
      <SelectContent>
        {/* Opción consolidada general */}
        <SelectItem value={`all:${franchiseeId}`} className="font-semibold bg-primary/5">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span>📊 Consolidado General</span>
          </div>
        </SelectItem>
        
        {/* Sociedades mercantiles */}
        {companies && companies.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Sociedades Mercantiles
            </div>
            {companies.map((company) => (
              <SelectItem 
                key={company.id} 
                value={`company:${company.id}`}
                className="pl-6"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-500" />
                  <span>{company.razon_social}</span>
                  <span className="text-xs text-muted-foreground">({company.cif})</span>
                </div>
              </SelectItem>
            ))}
          </>
        )}
        
        {/* Centros individuales */}
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1">
          Centros
        </div>
        {centres?.map((centre) => (
          <SelectItem 
            key={centre.id} 
            value={`centre:${centre.id}`}
            className="pl-6"
          >
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-success" />
              <span>{centre.codigo} - {centre.nombre}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
