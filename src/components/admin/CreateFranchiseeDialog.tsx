import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateFranchisee } from "@/hooks/useFranchisees";

interface CreateFranchiseeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateFranchiseeDialog = ({ open, onOpenChange }: CreateFranchiseeDialogProps) => {
  const createFranchisee = useCreateFranchisee();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company_tax_id: "",
    orquest_business_id: "MCDONALDS_ES",
    orquest_api_key: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createFranchisee.mutate(formData, {
      onSuccess: () => {
        onOpenChange(false);
        setFormData({
          name: "",
          email: "",
          company_tax_id: "",
          orquest_business_id: "MCDONALDS_ES",
          orquest_api_key: "",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Franchisee</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Nombre del franchisee"
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
              placeholder="email@ejemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_tax_id">CIF</Label>
            <Input
              id="company_tax_id"
              value={formData.company_tax_id}
              onChange={(e) => setFormData({ ...formData, company_tax_id: e.target.value })}
              placeholder="B12345678"
              maxLength={9}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orquest_business_id">Orquest Business ID</Label>
            <Input
              id="orquest_business_id"
              value={formData.orquest_business_id}
              onChange={(e) => setFormData({ ...formData, orquest_business_id: e.target.value })}
              placeholder="MCDONALDS_ES"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orquest_api_key">Orquest API Key (opcional)</Label>
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
            <Button type="submit" disabled={createFranchisee.isPending}>
              {createFranchisee.isPending ? "Creando..." : "Crear Franchisee"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
