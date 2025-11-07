import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Organization {
  id: string;
  name: string;
  email: string;
  company_tax_id: string | null;
  cif: string | null;
}

export interface Restaurant {
  id: string;
  codigo: string;
  nombre: string;
  franchisee_id: string;
}

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: "admin" | "contable" | "gerente_restaurante";
  restaurant_id: string | null;
  active: boolean;
  organization: Organization | null;
  restaurant: Restaurant | null;
}

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

      // Using direct query with type assertion
      const { data, error } = await supabase
        .from("memberships" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("active", true);

      if (error) throw error;

      // Fetch related data manually
      const membershipsWithData = await Promise.all(
        (data || []).map(async (membership: any) => {
          const [orgResult, restaurantResult] = await Promise.all([
            supabase.from("franchisees" as any).select("*").eq("id", membership.organization_id).maybeSingle(),
            membership.restaurant_id
              ? supabase.from("centres" as any).select("*").eq("id", membership.restaurant_id).maybeSingle()
              : Promise.resolve({ data: null, error: null }),
          ]);

          return {
            ...membership,
            organization: orgResult.data,
            restaurant: restaurantResult.data,
          } as Membership;
        })
      );

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
