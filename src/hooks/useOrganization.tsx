import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Membership, Organization, Restaurant } from "@/types/accounting";

// Re-export types for convenience
export type { Membership, Organization, Restaurant };

export function useOrganization() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentMembership, setCurrentMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMemberships();
  }, []);

  const fetchMemberships = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("memberships" as any)
        .select(`
          *,
          organization:franchisees!organization_id(
            id,
            name,
            email,
            company_tax_id,
            created_at,
            updated_at
          ),
          restaurant:centres!restaurant_id(
            id,
            codigo,
            nombre,
            direccion,
            ciudad,
            pais,
            activo,
            created_at,
            updated_at
          )
        `)
        .eq("user_id", user.id)
        .eq("active", true);

      if (error) throw error;

      const membershipsWithData = (data || []).map((membership: any) => ({
        ...membership,
        organization: membership.organization as Organization | null,
        restaurant: membership.restaurant as Restaurant | null,
      })) as Membership[];

      setMemberships(membershipsWithData);
      if (membershipsWithData.length > 0) {
        setCurrentMembership(membershipsWithData[0]);
      }
    } catch (error) {
      console.error("Error fetching memberships:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las organizaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const switchMembership = (membershipId: string) => {
    const membership = memberships.find((m) => m.id === membershipId);
    if (membership) {
      setCurrentMembership(membership);
    }
  };

  return {
    memberships,
    currentMembership,
    loading,
    switchMembership,
    refetch: fetchMemberships,
  };
}
