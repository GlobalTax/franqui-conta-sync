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

      // 1) Intento con joins (si existen relaciones en el schema cache)
      const { data, error } = await supabase
        .from("memberships" as any)
        .select(`
          *,
          organization:franchisees(*),
          restaurant:centres(*)
        `)
        .eq("user_id", user.id)
        .eq("active", true);

      let membershipsWithData: Membership[] | null = null;

      if (!error && data) {
        membershipsWithData = (data as any[]).map((membership: any) => ({
          ...membership,
          organization: membership.organization as Organization | null,
          restaurant: membership.restaurant as Restaurant | null,
        })) as Membership[];
      } else {
        // 2) Fallback sin joins: cargar entidades por separado para evitar PGRST200
        console.warn("Falling back to simple select for memberships due to join error", error);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("memberships" as any)
          .select("*")
          .eq("user_id", user.id)
          .eq("active", true);

        if (fallbackError) throw fallbackError;

        const rows = (fallbackData || []) as any[];
        if (rows.length === 0) {
          setMemberships([]);
          setCurrentMembership(null);
          return;
        }

        const orgIds = Array.from(new Set(rows.map(r => r.organization_id).filter(Boolean)));
        const restIds = Array.from(new Set(rows.map(r => r.restaurant_id).filter(Boolean)));

        const [orgRes, restRes] = await Promise.all([
          orgIds.length ? supabase.from("franchisees" as any).select("*").in("id", orgIds) : Promise.resolve({ data: [], error: null }),
          restIds.length ? supabase.from("centres" as any).select("*").in("id", restIds) : Promise.resolve({ data: [], error: null })
        ]);

        if (orgRes.error) throw orgRes.error;
        if (restRes.error) throw restRes.error;

        const orgMap = new Map<string, any>();
        (orgRes.data as any[]).forEach((o: any) => orgMap.set(o.id, o));
        const restMap = new Map<string, any>();
        (restRes.data as any[]).forEach((r: any) => restMap.set(r.id, r));

        membershipsWithData = rows.map((m: any) => ({
          ...m,
          organization: (orgMap.get(m.organization_id) as Organization) || null,
          restaurant: m.restaurant_id ? ((restMap.get(m.restaurant_id) as Restaurant) || null) : null,
        })) as Membership[];
      }

      setMemberships(membershipsWithData || []);
      setCurrentMembership((membershipsWithData && membershipsWithData[0]) || null);
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
