import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EnrichedCompanyData } from './useCompanyEnrichment';

export interface CIFSuggestion {
  cif: string;
  razon_social: string;
  tipo_sociedad: "SL" | "SA" | "SLU" | "SC" | "SLL" | "COOP" | "Otros";
  confidence: "high" | "medium" | "low";
  search_count: number;
  location?: string;
  enriched_data: EnrichedCompanyData;
}

// Client-side cache to avoid repeated queries during the session
const suggestionCache = new Map<string, {
  results: CIFSuggestion[];
  timestamp: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MIN_SEARCH_LENGTH = 3;
const DEBOUNCE_MS = 300;

export function useCIFAutocomplete(searchPattern: string) {
  const [suggestions, setSuggestions] = useState<CIFSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Reset suggestions if pattern is too short
    if (searchPattern.length < MIN_SEARCH_LENGTH) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const normalizedPattern = searchPattern.trim().toUpperCase();

    // Check client-side cache first
    const cached = suggestionCache.get(normalizedPattern);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setSuggestions(cached.results);
      setIsSearching(false);
      return;
    }

    // Debounce the search
    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('company_enrichment_cache')
          .select('cif, enriched_data, confidence, search_count, last_accessed_at')
          .ilike('cif', `${normalizedPattern}%`)
          .gt('expires_at', new Date().toISOString())
          .order('search_count', { ascending: false })
          .order('last_accessed_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error searching CIF cache:', error);
          setSuggestions([]);
          setIsSearching(false);
          return;
        }

        if (!data || data.length === 0) {
          setSuggestions([]);
          setIsSearching(false);
          return;
        }

        // Transform results
        const results: CIFSuggestion[] = data.map(row => {
          const enrichedData = row.enriched_data as unknown as EnrichedCompanyData;
          return {
            cif: row.cif,
            razon_social: enrichedData.razon_social,
            tipo_sociedad: enrichedData.tipo_sociedad,
            confidence: row.confidence as "high" | "medium" | "low",
            search_count: row.search_count || 0,
            location: enrichedData.direccion_fiscal?.poblacion && enrichedData.direccion_fiscal?.provincia
              ? `${enrichedData.direccion_fiscal.poblacion}, ${enrichedData.direccion_fiscal.provincia}`
              : undefined,
            enriched_data: enrichedData
          };
        });

        // Save to client cache
        suggestionCache.set(normalizedPattern, {
          results,
          timestamp: Date.now()
        });

        setSuggestions(results);
        setIsSearching(false);
      } catch (error) {
        console.error('Error in useCIFAutocomplete:', error);
        setSuggestions([]);
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchPattern]);

  return {
    suggestions,
    isSearching
  };
}
