import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// Cache configuration
const CACHE_PREFIX = 'company_enrichment_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedData {
  data: EnrichedCompanyData;
  timestamp: number;
}

export interface EnrichedCompanyData {
  razon_social: string;
  tipo_sociedad: "SL" | "SA" | "SLU" | "SC" | "SLL" | "COOP" | "Otros";
  direccion_fiscal?: {
    via_completa: string;
    tipo_via?: string;
    nombre_via: string;
    numero?: string;
    escalera?: string;
    piso?: string;
    puerta?: string;
    codigo_postal: string;
    poblacion: string;
    provincia: string;
    pais_codigo: string;
  };
  contacto?: {
    telefono?: string;
    email?: string;
    web?: string;
  };
  confidence: "high" | "medium" | "low";
  sources?: string[];
}

// Helper functions for localStorage cache
const getFromLocalCache = (cif: string): EnrichedCompanyData | null => {
  try {
    const cacheKey = CACHE_PREFIX + cif.toUpperCase();
    const cachedString = localStorage.getItem(cacheKey);
    
    if (!cachedString) {
      return null;
    }

    const cached: CachedData = JSON.parse(cachedString);
    const now = Date.now();

    // Check if cache is expired
    if (now - cached.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    logger.info('CompanyEnrichment', `✅ Cache hit for ${cif}`);
    return cached.data;
  } catch (error) {
    console.error('Error reading from localStorage cache:', error);
    return null;
  }
};

const saveToLocalCache = (cif: string, data: EnrichedCompanyData): void => {
  try {
    const cacheKey = CACHE_PREFIX + cif.toUpperCase();
    const cached: CachedData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(cached));
    logger.info('CompanyEnrichment', `✅ Saved to cache: ${cif}`);
  } catch (error) {
    console.error('Error saving to localStorage cache:', error);
  }
};

export const clearLocalCache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('✅ Local cache cleared');
    toast.success('Caché local limpiada');
  } catch (error) {
    console.error('Error clearing local cache:', error);
  }
};

export function useCompanyEnrichment() {
  const [isSearching, setIsSearching] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichedCompanyData | null>(null);

  const searchCompanyData = async (cif: string): Promise<EnrichedCompanyData | null> => {
    if (!cif || cif.trim().length === 0) {
      toast.error('CIF requerido');
      return null;
    }

    const normalizedCIF = cif.trim().toUpperCase();

    // 1. Check localStorage cache first (instant)
    const cachedLocal = getFromLocalCache(normalizedCIF);
    if (cachedLocal) {
      setEnrichedData(cachedLocal);
      
      // Show different toast based on data completeness
      if (cachedLocal.direccion_fiscal && cachedLocal.contacto) {
        toast.success(`⚡ Datos cargados desde caché local (empresa + dirección + contacto)`);
      } else if (cachedLocal.direccion_fiscal) {
        toast.success(`⚡ Datos cargados desde caché local (empresa + dirección)`);
      } else {
        toast.success(`⚡ Datos cargados desde caché local`);
      }
      
      return cachedLocal;
    }

    setIsSearching(true);
    setEnrichedData(null);

    try {
      // 2. Call edge function (will check Supabase cache or call AI)
      const { data, error } = await supabase.functions.invoke('search-company-data', {
        body: { cif: normalizedCIF }
      });

      if (error) {
        console.error('Error al buscar empresa:', error);
        toast.error('Error al buscar información de la empresa');
        return null;
      }

      if (!data || !data.success) {
        toast.error(data?.error || 'No se encontró información para este CIF');
        return null;
      }

      const companyData = data.data as EnrichedCompanyData;
      const isCached = data.cached === true;
      const cacheHits = data.cache_hits;
      
      setEnrichedData(companyData);
      
      // 3. Save to localStorage for future instant access
      saveToLocalCache(normalizedCIF, companyData);
      
      // Show message based on data source and completeness
      let sourcePrefix = '';
      if (isCached) {
        sourcePrefix = cacheHits > 5 ? '🔥' : '💾';
        sourcePrefix += ' Desde caché del servidor';
      } else {
        sourcePrefix = '🤖 Búsqueda con IA';
      }
      
      const confidenceText = companyData.confidence === 'high' ? 'alta' : 
                             companyData.confidence === 'medium' ? 'media' : 'baja';
      
      if (companyData.direccion_fiscal && companyData.contacto) {
        toast.success(`${sourcePrefix}: Empresa + dirección + contacto (confianza: ${confidenceText})`);
      } else if (companyData.direccion_fiscal) {
        toast.success(`${sourcePrefix}: Empresa + dirección (confianza: ${confidenceText})`);
      } else if (companyData.confidence === 'high') {
        toast.success(`${sourcePrefix}: Información básica (confianza: ${confidenceText})`);
      } else if (companyData.confidence === 'medium') {
        toast.success(`${sourcePrefix}: Información encontrada - Verifica los datos (confianza: ${confidenceText})`);
      } else {
        toast.warning(`${sourcePrefix}: Información con baja confianza - Verifica cuidadosamente`);
      }

      return companyData;
    } catch (error) {
      console.error('Error al buscar empresa:', error);
      toast.error('Error al buscar información de la empresa');
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  const clearEnrichedData = () => {
    setEnrichedData(null);
  };

  return {
    isSearching,
    enrichedData,
    searchCompanyData,
    clearEnrichedData
  };
}
