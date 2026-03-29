import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganization } from "@/hooks/useOrganization";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RestaurantFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function RestaurantFilter({ value, onChange }: RestaurantFilterProps) {
  const { currentMembership, loading } = useOrganization();

  const { data: centres = [], error } = useQuery({
    queryKey: ['centres-filter', currentMembership?.organization_id],
    queryFn: async () => {
      if (!currentMembership?.organization_id) return [];
      const { data, error } = await supabase
        .from('centres')
        .select('codigo, nombre')
        .order('nombre');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentMembership?.organization_id,
  });

  if (loading) return null;

  if (error) return (
    <div className="p-4 text-center text-destructive">
      <p>Error al cargar datos</p>
    </div>
  );

  const canViewAll = currentMembership?.role === "admin" ||
    (currentMembership?.role === "contable" && !currentMembership?.restaurant_id);

  if (!canViewAll && currentMembership?.restaurant) {
    return (
      <div className="text-sm text-muted-foreground">
        Restaurante: {currentMembership.restaurant.nombre}
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="Seleccionar restaurante" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los restaurantes</SelectItem>
        {centres.map((centre) => (
          <SelectItem key={centre.codigo} value={centre.codigo}>
            {centre.nombre || centre.codigo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
