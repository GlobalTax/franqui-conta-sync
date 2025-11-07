import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Star, Pencil, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getCentreCompanies,
  addCentreCompany,
  updateCentreCompany,
  setPrincipalCompany,
  deleteCentreCompany,
} from "@/lib/supabase-queries";

interface Centre {
  id: string;
  codigo: string;
  nombre: string;
}

interface Props {
  centre: Centre | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

interface Company {
  id: string;
  cif: string;
  razon_social: string;
  tipo_sociedad: string;
  es_principal: boolean;
}

export function ManageRestaurantCompaniesDialog({ centre, open, onOpenChange, onUpdate }: Props) {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formCif, setFormCif] = useState("");
  const [formRazonSocial, setFormRazonSocial] = useState("");
  const [formTipo, setFormTipo] = useState("SL");
  const [formEsPrincipal, setFormEsPrincipal] = useState(false);

  useEffect(() => {
    if (open && centre) {
      loadCompanies();
    }
  }, [open, centre]);

  const loadCompanies = async () => {
    if (!centre) return;
    
    setLoading(true);
    try {
      const data = await getCentreCompanies(centre.id);
      setCompanies(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormCif("");
    setFormRazonSocial("");
    setFormTipo("SL");
    setFormEsPrincipal(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!centre || !formCif || !formRazonSocial) return;

    setLoading(true);
    try {
      await addCentreCompany(centre.id, formCif, formRazonSocial, formTipo, formEsPrincipal);
      toast({
        title: "Sociedad añadida",
        description: "La sociedad ha sido registrada correctamente",
      });
      resetForm();
      loadCompanies();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingId(company.id);
    setFormCif(company.cif);
    setFormRazonSocial(company.razon_social);
    setFormTipo(company.tipo_sociedad);
    setFormEsPrincipal(company.es_principal);
  };

  const handleUpdate = async () => {
    if (!editingId || !formCif || !formRazonSocial) return;

    setLoading(true);
    try {
      await updateCentreCompany(editingId, formCif, formRazonSocial, formTipo);
      toast({
        title: "Sociedad actualizada",
        description: "Los datos han sido actualizados correctamente",
      });
      resetForm();
      loadCompanies();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrincipal = async (companyId: string) => {
    if (!centre) return;

    setLoading(true);
    try {
      await setPrincipalCompany(centre.id, companyId);
      toast({
        title: "Sociedad principal actualizada",
        description: "Esta sociedad es ahora la principal",
      });
      loadCompanies();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (companyId: string) => {
    if (companies.length === 1) {
      toast({
        title: "No se puede eliminar",
        description: "Debe haber al menos una sociedad",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await deleteCentreCompany(companyId);
      toast({
        title: "Sociedad eliminada",
        description: "La sociedad ha sido eliminada correctamente",
      });
      loadCompanies();
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!centre) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            🏢 Sociedades: {centre.nombre}
            <div className="text-sm font-normal text-muted-foreground">
              Código: {centre.codigo}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Companies */}
          <div>
            <h4 className="font-medium mb-3">Sociedades Actuales ({companies.length})</h4>
            {companies.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay sociedades registradas</p>
            ) : (
              <div className="space-y-2">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className={`p-3 border rounded-lg ${
                      company.es_principal ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {company.es_principal && (
                          <Badge variant="default" className="mb-2">
                            <Star className="h-3 w-3 mr-1" />
                            Principal
                          </Badge>
                        )}
                        <div className="font-medium">CIF: {company.cif}</div>
                        <div className="text-sm">{company.razon_social}</div>
                        <div className="text-xs text-muted-foreground">
                          Tipo: {company.tipo_sociedad}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!company.es_principal && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSetPrincipal(company.id)}
                            disabled={loading}
                            title="Marcar como principal"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(company)}
                          disabled={loading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(company.id)}
                          disabled={loading || companies.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add/Edit Form */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">
              {editingId ? "Editar Sociedad" : "Añadir Nueva Sociedad"}
            </h4>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cif">CIF</Label>
                <Input
                  id="cif"
                  value={formCif}
                  onChange={(e) => setFormCif(e.target.value.toUpperCase())}
                  placeholder="B12345678"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="razon">Razón Social</Label>
                <Input
                  id="razon"
                  value={formRazonSocial}
                  onChange={(e) => setFormRazonSocial(e.target.value)}
                  placeholder="EMPRESA EJEMPLO SL"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo de Sociedad</Label>
                <Select value={formTipo} onValueChange={setFormTipo} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SL">SL - Sociedad Limitada</SelectItem>
                    <SelectItem value="SA">SA - Sociedad Anónima</SelectItem>
                    <SelectItem value="SLU">SLU - Sociedad Limitada Unipersonal</SelectItem>
                    <SelectItem value="AUTONOMO">Autónomo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!editingId && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="principal"
                    checked={formEsPrincipal}
                    onCheckedChange={(checked) => setFormEsPrincipal(checked as boolean)}
                    disabled={loading}
                  />
                  <Label htmlFor="principal" className="cursor-pointer">
                    Marcar como principal
                  </Label>
                </div>
              )}
              <div className="flex gap-2">
                {editingId ? (
                  <>
                    <Button onClick={handleUpdate} disabled={loading || !formCif || !formRazonSocial}>
                      Actualizar
                    </Button>
                    <Button variant="outline" onClick={resetForm} disabled={loading}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleAdd} disabled={loading || !formCif || !formRazonSocial}>
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir Sociedad
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
