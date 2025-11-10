import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMemberships } from "@/lib/supabase-queries";
import type { Membership } from "@/types/accounting";

export function useOrganization() {
  const { data: currentMembership, isLoading: loading } = useQuery<Membership | null>({
    queryKey: ["current-membership"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const result = await getMemberships(user.id);
      
      if (!result.data || result.data.length === 0) return null;

      // Return first active membership
      return result.data[0];
    },
  });

  return {
    currentMembership,
    loading,
  };
}
