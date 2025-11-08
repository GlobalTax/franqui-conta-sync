import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanies } from "@/hooks/useCompanies";
import { Building2, Store } from "lucide-react";
import { ViewSelection } from "@/contexts/ViewContext";

interface CompanySelectorProps {
  franchiseeId: string;
  value: ViewSelection | null;
  onChange: (value: ViewSelection) => void;
}

export const CompanySelector = ({ franchiseeId, value, onChange }: CompanySelectorProps) => {
  const { data: companies, isLoading } = useCompanies(franchiseeId);

  if (isLoading) {
    return (
      <div className="w-[320px] h-10 bg-muted animate-pulse rounded-md" />
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
      <SelectTrigger className="w-[320px]">
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
