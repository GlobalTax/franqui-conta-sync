-- Crear tabla de caché de enriquecimiento de empresas
CREATE TABLE IF NOT EXISTS public.company_enrichment_cache (
  cif TEXT PRIMARY KEY,
  enriched_data JSONB NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  sources JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  search_count INTEGER NOT NULL DEFAULT 1,
  last_accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_company_cache_expires ON public.company_enrichment_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_company_cache_created ON public.company_enrichment_cache(created_at);

-- Trigger para calcular expires_at automáticamente (30 días)
CREATE OR REPLACE FUNCTION public.set_cache_expiration()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := NEW.created_at + INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_cache_expiration
  BEFORE INSERT ON public.company_enrichment_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.set_cache_expiration();

-- Función para incrementar contador de búsquedas
CREATE OR REPLACE FUNCTION public.increment_cache_search_count(p_cif TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.company_enrichment_cache
  SET search_count = search_count + 1,
      last_accessed_at = NOW()
  WHERE cif = p_cif;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE public.company_enrichment_cache ENABLE ROW LEVEL SECURITY;

-- Política de lectura: todos pueden leer
CREATE POLICY "Anyone can read cache"
  ON public.company_enrichment_cache
  FOR SELECT
  USING (true);

-- Política de escritura: solo service_role (edge functions)
CREATE POLICY "Service role can write cache"
  ON public.company_enrichment_cache
  FOR ALL
  USING (auth.role() = 'service_role');

-- Comentarios para documentación
COMMENT ON TABLE public.company_enrichment_cache IS 'Caché de datos enriquecidos de empresas para reducir llamadas a APIs externas';
COMMENT ON COLUMN public.company_enrichment_cache.cif IS 'CIF de la empresa (clave primaria)';
COMMENT ON COLUMN public.company_enrichment_cache.enriched_data IS 'Datos completos enriquecidos en formato JSON';
COMMENT ON COLUMN public.company_enrichment_cache.confidence IS 'Nivel de confianza de los datos: high, medium, low';
COMMENT ON COLUMN public.company_enrichment_cache.expires_at IS 'Fecha de expiración del caché (30 días desde creación)';
COMMENT ON COLUMN public.company_enrichment_cache.search_count IS 'Contador de veces que se ha consultado este CIF';
COMMENT ON COLUMN public.company_enrichment_cache.last_accessed_at IS 'Última vez que se accedió a este registro';