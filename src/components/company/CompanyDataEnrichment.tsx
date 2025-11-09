import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCompanyEnrichment, EnrichedCompanyData } from "@/hooks/useCompanyEnrichment";
import { useState } from "react";

interface CompanyDataEnrichmentProps {
  cif: string;
  disabled?: boolean;
  onAccept: (data: EnrichedCompanyData) => void;
}

export function CompanyDataEnrichment({ cif, disabled, onAccept }: CompanyDataEnrichmentProps) {
  const { isSearching, enrichedData, searchCompanyData, clearEnrichedData } = useCompanyEnrichment();
  const [showDialog, setShowDialog] = useState(false);

  const handleSearch = async () => {
    const data = await searchCompanyData(cif);
    if (data) {
      setShowDialog(true);
    }
  };

  const handleAccept = () => {
    if (enrichedData) {
      onAccept(enrichedData);
      setShowDialog(false);
      clearEnrichedData();
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
    clearEnrichedData();
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge variant="default" className="bg-green-500">Alta Confianza</Badge>;
      case 'medium':
        return <Badge variant="secondary">Confianza Media</Badge>;
      case 'low':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Baja Confianza</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSearch}
        disabled={disabled || isSearching || !cif || cif.trim().length === 0}
        className="gap-2"
      >
        {isSearching ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Buscando...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Buscar con IA
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Información Encontrada
            </DialogTitle>
            <DialogDescription>
              IA ha encontrado información para el CIF {cif}. Revisa y confirma antes de aceptar.
            </DialogDescription>
          </DialogHeader>

          {enrichedData && (
            <div className="space-y-4 py-4">
              {/* Nivel de confianza */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confianza:</span>
                {getConfidenceBadge(enrichedData.confidence)}
              </div>

              {/* Razón Social */}
              <div className="space-y-2">
                <label className="text-sm font-medium">📋 Razón Social</label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-semibold">{enrichedData.razon_social}</p>
                </div>
              </div>

              {/* Tipo de Sociedad */}
              <div className="space-y-2">
                <label className="text-sm font-medium">🏢 Tipo de Sociedad</label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="font-semibold">
                    {enrichedData.tipo_sociedad === 'SL' && 'Sociedad Limitada (SL)'}
                    {enrichedData.tipo_sociedad === 'SA' && 'Sociedad Anónima (SA)'}
                    {enrichedData.tipo_sociedad === 'SLU' && 'Sociedad Limitada Unipersonal (SLU)'}
                    {enrichedData.tipo_sociedad === 'SC' && 'Sociedad Colectiva (SC)'}
                    {enrichedData.tipo_sociedad === 'SLL' && 'Sociedad Limitada Laboral (SLL)'}
                    {enrichedData.tipo_sociedad === 'COOP' && 'Cooperativa (COOP)'}
                    {enrichedData.tipo_sociedad === 'Otros' && 'Otros'}
                  </p>
                </div>
              </div>

              {/* Dirección Fiscal */}
              {enrichedData.direccion_fiscal && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">📍 Dirección Fiscal</label>
                  <div className="p-3 bg-muted rounded-md space-y-1">
                    <p className="font-semibold">
                      {enrichedData.direccion_fiscal.via_completa}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {enrichedData.direccion_fiscal.codigo_postal} - {enrichedData.direccion_fiscal.poblacion}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {enrichedData.direccion_fiscal.provincia}, {enrichedData.direccion_fiscal.pais_codigo}
                    </p>
                  </div>
                </div>
              )}

              {/* Contacto */}
              {enrichedData.contacto && (enrichedData.contacto.telefono || enrichedData.contacto.email || enrichedData.contacto.web) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">📞 Contacto</label>
                  <div className="p-3 bg-muted rounded-md space-y-1 text-sm">
                    {enrichedData.contacto.telefono && (
                      <p>☎️ {enrichedData.contacto.telefono}</p>
                    )}
                    {enrichedData.contacto.email && (
                      <p>📧 {enrichedData.contacto.email}</p>
                    )}
                    {enrichedData.contacto.web && (
                      <p>🌐 {enrichedData.contacto.web}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Fuentes (si disponibles) */}
              {enrichedData.sources && enrichedData.sources.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Fuentes consultadas:
                  </label>
                  <div className="text-xs text-muted-foreground">
                    {enrichedData.sources.join(', ')}
                  </div>
                </div>
              )}

              {/* Advertencia */}
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  ⚠️ Verifica siempre la información antes de aceptar. Los datos provienen de búsquedas automatizadas.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleAccept}>
              ✅ Aceptar y Rellenar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
