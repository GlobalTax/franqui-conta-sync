import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Save, AlertCircle, RefreshCw } from "lucide-react";
import { validateCIF } from "@/lib/franchisee-validation";
import { useFranchisees } from "@/hooks/useFranchisees";
import { useCompanyDetail, CompanyDetailData } from "@/hooks/useCompanyDetail";
import { Switch } from "@/components/ui/switch";

interface Props {
  company: CompanyDetailData;
}

const CompanyDataForm = ({ company }: Props) => {
  const { data: franchisees } = useFranchisees();
  const { updateCompany, isUpdating } = useCompanyDetail(company.id);
  const [formData, setFormData] = useState({
    cif: company.cif,
    razon_social: company.razon_social,
    tipo_sociedad: company.tipo_sociedad,
    franchisee_id: company.franchisee_id,
    activo: company.activo,
  });
  const [cifValidation, setCifValidation] = useState(validateCIF(company.cif));

  useEffect(() => {
    setCifValidation(validateCIF(formData.cif));
  }, [formData.cif]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompany(formData);
  };

  const handleAutoCorrect = () => {
    // If CIF looks like a name, suggest moving it to razon_social
    if (!cifValidation.isValid && formData.cif.length > 15) {
      setFormData(prev => ({
        ...prev,
        razon_social: prev.cif,
        cif: "",
      }));
    }
  };

  const hasNameInCIF = !cifValidation.isValid && formData.cif.length > 15;

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Data quality warnings */}
        {!cifValidation.isValid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p><strong>CIF Inválido:</strong> {cifValidation.error}</p>
                {hasNameInCIF && (
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-sm">Parece que el campo CIF contiene un nombre. ¿Quieres moverlo a "Razón Social"?</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAutoCorrect}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Corregir
                    </Button>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Franchisee */}
        <div>
          <Label htmlFor="franchisee_id">Franquiciado *</Label>
          <Select
            value={formData.franchisee_id}
            onValueChange={(value) => setFormData({ ...formData, franchisee_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar franquiciado" />
            </SelectTrigger>
            <SelectContent>
              {franchisees?.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name} ({f.company_tax_id || "Sin CIF"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">
            Franquiciado actual: {company.franchisee?.name}
          </p>
        </div>

        {/* CIF */}
        <div>
          <Label htmlFor="cif">CIF / NIF *</Label>
          <div className="flex items-center gap-2">
            <Input
              id="cif"
              value={formData.cif}
              onChange={(e) => setFormData({ ...formData, cif: e.target.value.toUpperCase() })}
              placeholder="A12345678 o 12345678Z"
              className={!cifValidation.isValid ? "border-destructive" : ""}
            />
            {cifValidation.isValid && (
              <Badge variant="outline" className="whitespace-nowrap">
                ✓ Válido
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Formato: CIF español (A12345678) o europeo (ESA12345678)
          </p>
        </div>

        {/* Razón Social */}
        <div>
          <Label htmlFor="razon_social">Razón Social *</Label>
          <Input
            id="razon_social"
            value={formData.razon_social}
            onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
            placeholder="Mi Empresa S.L."
          />
        </div>

        {/* Tipo Sociedad */}
        <div>
          <Label htmlFor="tipo_sociedad">Tipo de Sociedad *</Label>
          <Select
            value={formData.tipo_sociedad}
            onValueChange={(value) => setFormData({ ...formData, tipo_sociedad: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SL">SL - Sociedad Limitada</SelectItem>
              <SelectItem value="SA">SA - Sociedad Anónima</SelectItem>
              <SelectItem value="SLU">SLU - Sociedad Limitada Unipersonal</SelectItem>
              <SelectItem value="AUTONOMO">Autónomo</SelectItem>
              <SelectItem value="SOCIEDAD CIVIL">Sociedad Civil</SelectItem>
              <SelectItem value="COOPERATIVA">Cooperativa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Status */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="activo">Estado</Label>
            <p className="text-sm text-muted-foreground">
              Controla si la sociedad está activa o inactiva
            </p>
          </div>
          <Switch
            id="activo"
            checked={formData.activo}
            onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
          />
        </div>

        {/* Metadata */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Creada:</span>{" "}
              {new Date(company.created_at).toLocaleDateString("es-ES")}
            </div>
            <div>
              <span className="font-medium">Actualizada:</span>{" "}
              {new Date(company.updated_at).toLocaleDateString("es-ES")}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isUpdating || !cifValidation.isValid}>
            <Save className="h-4 w-4 mr-2" />
            {isUpdating ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default CompanyDataForm;
