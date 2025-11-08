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

      // Use the optimized materialized view with all data pre-joined
      // Filter manually since materialized views don't support RLS
      const { data, error } = await supabase
        .from("v_user_memberships" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("active", true);

      if (error) throw error;

      // Map the flat view data to our Membership type
      const membershipsWithData: Membership[] = (data || []).map((row: any) => ({
        id: row.membership_id,
        user_id: row.user_id,
        organization_id: row.organization_id,
        restaurant_id: row.restaurant_id,
        role: row.role,
        active: row.active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: null, // Not stored in view
        organization: row.organization_id ? {
          id: row.organization_id,
          name: row.organization_name,
          email: row.organization_email,
          company_tax_id: row.organization_tax_id,
          cif: null,
          orquest_business_id: null,
          orquest_api_key: null,
          created_at: row.created_at,
          updated_at: row.updated_at,
        } as Organization : null,
        restaurant: row.restaurant_id ? {
          id: row.restaurant_id,
          codigo: row.restaurant_code,
          nombre: row.restaurant_name,
          direccion: row.restaurant_address,
          ciudad: row.restaurant_city,
          activo: row.restaurant_active,
          franchisee_id: row.organization_id,
          site_number: null,
          pais: null,
          state: null,
          postal_code: null,
          cost_center_code: null,
          seating_capacity: null,
          square_meters: null,
          opening_date: null,
          created_at: row.created_at,
          updated_at: row.updated_at,
        } as Restaurant : null,
      }));

      setMemberships(membershipsWithData);
      setCurrentMembership(membershipsWithData[0] || null);
    } catch (error: any) {
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
