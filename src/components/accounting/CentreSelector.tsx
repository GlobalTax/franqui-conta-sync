import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAllUserCentres } from "@/hooks/useAllUserCentres";
import { AlertCircle, Store, RefreshCw, Users, LayoutGrid } from "lucide-react";
import { ViewSelection } from "@/contexts/ViewContext";
import { useEffect } from "react";

interface CentreSelectorProps {
  value: ViewSelection | null;
  onChange: (value: ViewSelection) => void;
}

export const CentreSelector = ({ value, onChange }: CentreSelectorProps) => {
  const { data: franchiseesWithCentres, isLoading, error, isError, refetch: refetchCentres } = useAllUserCentres();

  // Auto-select: if 1 centre → select it; if multiple → franchisee consolidated view
  useEffect(() => {
    if (!isLoading && !value && franchiseesWithCentres?.length) {
      const allCentres = franchiseesWithCentres.flatMap(f => f.centres);
      if (allCentres.length === 1) {
        const centre = allCentres[0];
        onChange({
          type: 'centre',
          id: centre.id,
          code: centre.codigo,
          name: `${centre.codigo} - ${centre.nombre}`
        });
      } else if (franchiseesWithCentres.length >= 1) {
        const franchisee = franchiseesWithCentres[0];
        onChange({
          type: 'all',
          id: franchisee.id,
          name: `Todos - ${franchisee.name}`
        });
      }
    }
  }, [franchiseesWithCentres, value, onChange, isLoading]);

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
            <p>No se pudieron cargar los centros.</p>
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

  if (!franchiseesWithCentres?.length) {
    return null;
  }

  return (
    <Select
      value={value ? `${value.type}:${value.id}` : undefined}
      onValueChange={(val) => {
        const [type, ...rest] = val.split(':');
        const id = rest.join(':');
        
        if (type === 'all') {
          const franchisee = franchiseesWithCentres?.find(f => f.id === id);
          if (franchisee) {
            onChange({
              type: 'all',
              id,
              name: `Todos - ${franchisee.name}`
            });
          }
        } else if (type === 'centre') {
          let foundCentre = null;
          for (const franchisee of franchiseesWithCentres || []) {
            foundCentre = franchisee.centres.find(c => c.id === id);
            if (foundCentre) break;
          }
          if (foundCentre) {
            onChange({ 
              type: 'centre', 
              id,
              code: foundCentre.codigo,
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
        {franchiseesWithCentres.map((franchisee) => (
          <div key={`franchisee-group-${franchisee.id}`}>
            {/* Franchisee header */}
            <div className="px-3 py-1.5 text-xs font-semibold text-primary flex items-center gap-2 bg-primary/5">
              <Users className="h-3 w-3" />
              {franchisee.name}
            </div>

            {/* Consolidated view for this franchisee */}
            {franchisee.centres.length > 1 && (
              <SelectItem 
                value={`all:${franchisee.id}`}
                className="pl-6"
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-primary" />
                  <span className="font-medium">Todos los restaurantes</span>
                  <span className="text-xs text-muted-foreground">({franchisee.centres.length})</span>
                </div>
              </SelectItem>
            )}

            {/* Individual centres */}
            {franchisee.centres.map((centre) => (
              <SelectItem 
                key={centre.id} 
                value={`centre:${centre.id}`}
                className="pl-10"
              >
                <div className="flex items-center gap-2">
                  <Store className="h-3 w-3 text-success" />
                  <span className="text-sm">{centre.codigo} - {centre.nombre}</span>
                </div>
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
};
