import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateFranchisee } from "@/hooks/useFranchisees";

interface EditFranchiseeDialogProps {
  franchisee: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditFranchiseeDialog = ({ franchisee, open, onOpenChange }: EditFranchiseeDialogProps) => {
  const updateFranchisee = useUpdateFranchisee();
  
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
    company_tax_id: "",
    orquest_business_id: "",
    orquest_api_key: "",
  });

  useEffect(() => {
    if (franchisee) {
      setFormData({
        id: franchisee.id,
        name: franchisee.name || "",
        email: franchisee.email || "",
        company_tax_id: franchisee.company_tax_id || "",
        orquest_business_id: franchisee.orquest_business_id || "MCDONALDS_ES",
        orquest_api_key: "", // No mostrar la API key existente por seguridad
      });
    }
  }, [franchisee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const dataToSubmit: any = {
      id: formData.id,
      name: formData.name,
      email: formData.email,
      company_tax_id: formData.company_tax_id,
      orquest_business_id: formData.orquest_business_id,
    };
    
    // Solo incluir API key si se ha cambiado
    if (formData.orquest_api_key) {
      dataToSubmit.orquest_api_key = formData.orquest_api_key;
    }
    
    updateFranchisee.mutate(dataToSubmit, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  if (!franchisee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Franchisee</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_tax_id">CIF</Label>
            <Input
              id="company_tax_id"
              value={formData.company_tax_id}
              onChange={(e) => setFormData({ ...formData, company_tax_id: e.target.value })}
              maxLength={9}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orquest_business_id">Orquest Business ID</Label>
            <Input
              id="orquest_business_id"
              value={formData.orquest_business_id}
              onChange={(e) => setFormData({ ...formData, orquest_business_id: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orquest_api_key">Cambiar Orquest API Key (dejar vacío si no desea cambiar)</Label>
            <Input
              id="orquest_api_key"
              type="password"
              value={formData.orquest_api_key}
              onChange={(e) => setFormData({ ...formData, orquest_api_key: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateFranchisee.isPending}>
              {updateFranchisee.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
