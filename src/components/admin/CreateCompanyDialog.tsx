import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { validateCIF } from "@/lib/franchisee-validation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { CompanyDataEnrichment } from "@/components/company/CompanyDataEnrichment";
import { EnrichedCompanyData } from "@/hooks/useCompanyEnrichment";

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { razon_social: string; cif: string; tipo_sociedad: string }) => void;
  isCreating: boolean;
}

export function CreateCompanyDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating
}: CreateCompanyDialogProps) {
  const [razonSocial, setRazonSocial] = useState("");
  const [cif, setCif] = useState("");
  const [tipoSociedad, setTipoSociedad] = useState("SL");
  const [cifError, setCifError] = useState<string | null>(null);

  const handleCifChange = (value: string) => {
    setCif(value.toUpperCase());
    const validation = validateCIF(value);
    setCifError(validation.isValid ? null : validation.error || null);
  };

  const handleEnrichmentAccept = (data: EnrichedCompanyData) => {
    setRazonSocial(data.razon_social);
    setTipoSociedad(data.tipo_sociedad);
  };

  const handleSubmit = () => {
    if (!razonSocial.trim() || !cif.trim()) {
      return;
    }

    const validation = validateCIF(cif);
    if (!validation.isValid) {
      setCifError(validation.error || "CIF inválido");
      return;
    }

    onCreate({
      razon_social: razonSocial.trim(),
      cif: cif.trim().toUpperCase(),
      tipo_sociedad: tipoSociedad
    });

    // Reset form
    setRazonSocial("");
    setCif("");
    setTipoSociedad("SL");
    setCifError(null);
  };

  const handleClose = () => {
    setRazonSocial("");
    setCif("");
    setTipoSociedad("SL");
    setCifError(null);
    onOpenChange(false);
  };

  const isValid = razonSocial.trim() !== "" && cif.trim() !== "" && !cifError;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Sociedad</DialogTitle>
          <DialogDescription>
            Crea una nueva sociedad y asóciala automáticamente a este franquiciado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="razon-social">
              Razón Social <span className="text-destructive">*</span>
            </Label>
            <Input
              id="razon-social"
              placeholder="NOMBRE DE LA EMPRESA SL"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cif">
              CIF <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="cif"
                placeholder="B12345678"
                value={cif}
                onChange={(e) => handleCifChange(e.target.value)}
                disabled={isCreating}
                className={cifError ? "border-destructive" : ""}
              />
              <CompanyDataEnrichment
                cif={cif}
                disabled={isCreating || !!cifError}
                onAccept={handleEnrichmentAccept}
              />
            </div>
            {cifError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{cifError}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo-sociedad">
              Tipo de Sociedad <span className="text-destructive">*</span>
            </Label>
            <Select value={tipoSociedad} onValueChange={setTipoSociedad} disabled={isCreating}>
              <SelectTrigger id="tipo-sociedad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SL">Sociedad Limitada (SL)</SelectItem>
                <SelectItem value="SA">Sociedad Anónima (SA)</SelectItem>
                <SelectItem value="SLU">Sociedad Limitada Unipersonal (SLU)</SelectItem>
                <SelectItem value="SC">Sociedad Colectiva (SC)</SelectItem>
                <SelectItem value="SLL">Sociedad Limitada Laboral (SLL)</SelectItem>
                <SelectItem value="COOP">Cooperativa (COOP)</SelectItem>
                <SelectItem value="Otros">Otros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isCreating}>
            {isCreating ? "Creando..." : "Crear Sociedad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
