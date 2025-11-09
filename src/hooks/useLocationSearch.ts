import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export interface LocationResult {
  id: string;
  type: 'postal_code' | 'municipality' | 'province';
  code: string;
  name: string;
  parent_name: string;
  country_code: string;
  similarity_score?: number;
}

export function useLocationSearch(query: string, enabled: boolean = true) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ['location-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return [];
      }

      const { data, error } = await supabase.rpc('search_locations' as any, {
        q: debouncedQuery,
        limit_results: 20,
      } as any);

      if (error) throw error;
      return (data || []) as LocationResult[];
    },
    enabled: enabled && debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
