import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganization } from "@/hooks/useOrganization";

interface RestaurantFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function RestaurantFilter({ value, onChange }: RestaurantFilterProps) {
  const { currentMembership, loading } = useOrganization();

  if (loading) return null;

  // If user is admin or contable (without specific restaurant), show all restaurants
  const canViewAll = currentMembership?.role === "admin" || 
    (currentMembership?.role === "contable" && !currentMembership?.restaurant_id);

  if (!canViewAll && currentMembership?.restaurant) {
    // User can only see their restaurant
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
        {/* TODO: Fetch and display restaurants for the organization */}
      </SelectContent>
    </Select>
  );
}
