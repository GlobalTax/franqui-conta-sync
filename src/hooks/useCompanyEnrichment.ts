import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export function useCompanyEnrichment() {
  const [isSearching, setIsSearching] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichedCompanyData | null>(null);

  const searchCompanyData = async (cif: string): Promise<EnrichedCompanyData | null> => {
    if (!cif || cif.trim().length === 0) {
      toast.error('CIF requerido');
      return null;
    }

    setIsSearching(true);
    setEnrichedData(null);

    try {
      const { data, error } = await supabase.functions.invoke('search-company-data', {
        body: { cif: cif.trim().toUpperCase() }
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
      setEnrichedData(companyData);
      
      // Mostrar mensaje según el nivel de confianza y datos encontrados
      if (companyData.direccion_fiscal && companyData.contacto) {
        toast.success(`✅ Empresa, dirección y contacto encontrados (confianza: ${companyData.confidence === 'high' ? 'alta' : companyData.confidence === 'medium' ? 'media' : 'baja'})`);
      } else if (companyData.direccion_fiscal) {
        toast.success(`✅ Empresa y dirección encontradas (confianza: ${companyData.confidence === 'high' ? 'alta' : companyData.confidence === 'medium' ? 'media' : 'baja'})`);
      } else if (companyData.confidence === 'high') {
        toast.success('✅ Información básica encontrada con alta confianza');
      } else if (companyData.confidence === 'medium') {
        toast.success('⚠️ Información encontrada - Verifica los datos');
      } else {
        toast.warning('⚠️ Información encontrada con baja confianza - Verifica cuidadosamente');
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
