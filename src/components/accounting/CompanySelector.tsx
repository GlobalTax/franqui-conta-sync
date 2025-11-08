import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCompanies } from "@/hooks/useCompanies";
import { AlertCircle, Building2, Store, RefreshCw } from "lucide-react";
import { ViewSelection } from "@/contexts/ViewContext";
import { useEffect } from "react";

interface CompanySelectorProps {
  franchiseeId: string;
  value: ViewSelection | null;
  onChange: (value: ViewSelection) => void;
}

export const CompanySelector = ({ franchiseeId, value, onChange }: CompanySelectorProps) => {
  const { data: companies, isLoading, error, isError, refetch } = useCompanies(franchiseeId);

  // Auto-select first consolidated view when companies load and no view is selected
  useEffect(() => {
    if (companies && companies.length > 0 && !value) {
      const firstCompany = companies[0];
      onChange({
        type: 'company',
        id: firstCompany.id,
        name: firstCompany.razon_social
      });
    }
  }, [companies, value, onChange]);

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
        <AlertTitle>Error al cargar sociedades</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>No se pudieron cargar las sociedades. Por favor, intenta de nuevo.</p>
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

  if (!companies || companies.length === 0) {
    return null;
  }

  return (
    <Select
      value={value ? `${value.type}:${value.id}` : undefined}
      onValueChange={(val) => {
        const [type, id] = val.split(':');
        const isCompany = type === 'company';
        
        if (isCompany) {
          const company = companies?.find(c => c.id === id);
          if (company) {
            onChange({ type: 'company', id, name: company.razon_social });
          }
        } else {
          const company = companies?.find(c => 
            c.centres.some((centre: any) => centre.id === id)
          );
          const centre = company?.centres.find((c: any) => c.id === id);
          if (centre) {
            onChange({ type: 'centre', id, name: `${centre.codigo} - ${centre.nombre}` });
          }
        }
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Seleccionar vista contable..." />
      </SelectTrigger>
      <SelectContent>
        {companies?.map((company) => (
          <div key={company.id}>
            {/* Opción: Vista consolidada de la sociedad */}
            <SelectItem value={`company:${company.id}`} className="font-semibold">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span>📊 {company.razon_social} (Consolidado)</span>
              </div>
            </SelectItem>
            
            {/* Opciones: Centros individuales */}
            {company.centres?.filter((c: any) => c.activo).map((centre: any) => (
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
          </div>
        ))}
      </SelectContent>
    </Select>
  );
};
