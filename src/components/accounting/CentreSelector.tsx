import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCentres } from "@/hooks/useCentres";
import { AlertCircle, Building2, Store, RefreshCw } from "lucide-react";
import { ViewSelection } from "@/contexts/ViewContext";
import { useEffect } from "react";

interface CentreSelectorProps {
  franchiseeId: string;
  value: ViewSelection | null;
  onChange: (value: ViewSelection) => void;
}

export const CentreSelector = ({ franchiseeId, value, onChange }: CentreSelectorProps) => {
  const { data: centres, isLoading, error, isError, refetch } = useCentres(franchiseeId);

  // Auto-select "all" (consolidated view) when centres load and no view is selected
  useEffect(() => {
    if (centres && centres.length > 0 && !value) {
      onChange({
        type: 'all',
        id: franchiseeId,
        name: 'Todos los Centros'
      });
    }
  }, [centres, value, onChange, franchiseeId]);

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
        <AlertTitle>Error al cargar centros</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>No se pudieron cargar los centros. Por favor, intenta de nuevo.</p>
            {error?.message && (
              <p className="text-xs opacity-70">{error.message}</p>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
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
            name: 'Todos los Centros' 
          });
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
        <SelectValue placeholder="Seleccionar centro..." />
      </SelectTrigger>
      <SelectContent>
        {/* Opción consolidada */}
        <SelectItem value={`all:${franchiseeId}`} className="font-semibold">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span>📊 Todos los Centros (Consolidado)</span>
          </div>
        </SelectItem>
        
        {/* Centros individuales */}
        {centres?.map((centre) => (
          <SelectItem 
            key={centre.id} 
            value={`centre:${centre.id}`}
            className="pl-8"
          >
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span>{centre.codigo} - {centre.nombre}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
