import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";

interface FranchiseeDataFormProps {
  franchisee: any;
  onUpdate: (data: any) => void;
  isUpdating: boolean;
}

export function FranchiseeDataForm({ franchisee, onUpdate, isUpdating }: FranchiseeDataFormProps) {
  const [initialData] = useState({
    name: franchisee?.name || "",
    email: franchisee?.email || "",
    company_tax_id: franchisee?.company_tax_id || "",
    orquest_business_id: franchisee?.orquest_business_id || "",
    orquest_api_key: franchisee?.orquest_api_key || "",
  });
  
  const [formData, setFormData] = useState({
    name: franchisee?.name || "",
    email: franchisee?.email || "",
    company_tax_id: franchisee?.company_tax_id || "",
    orquest_business_id: franchisee?.orquest_business_id || "",
    orquest_api_key: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enviar solo los campos que han cambiado
    const updates: any = {};
    
    if (formData.name !== initialData.name) {
      updates.name = formData.name;
    }
    if (formData.email !== initialData.email) {
      updates.email = formData.email;
    }
    if (formData.company_tax_id !== initialData.company_tax_id) {
      updates.company_tax_id = formData.company_tax_id;
    }
    if (formData.orquest_business_id !== initialData.orquest_business_id) {
      updates.orquest_business_id = formData.orquest_business_id;
    }
    // Solo enviar orquest_api_key si el usuario escribió algo
    if (formData.orquest_api_key && formData.orquest_api_key.trim() !== "") {
      updates.orquest_api_key = formData.orquest_api_key;
    }
    
    console.log("📝 FranchiseeDataForm - Campos modificados a enviar:", updates);
    console.log("📝 FranchiseeDataForm - Datos originales:", initialData);
    console.log("📝 FranchiseeDataForm - Datos actuales:", formData);
    
    onUpdate(updates);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos del Franquiciado</CardTitle>
        <CardDescription>
          Información básica y configuración del franquiciado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_tax_id">CIF</Label>
              <Input
                id="company_tax_id"
                value={formData.company_tax_id}
                onChange={(e) => handleChange("company_tax_id", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orquest_business_id">Orquest Business ID</Label>
              <Input
                id="orquest_business_id"
                value={formData.orquest_business_id}
                onChange={(e) => handleChange("orquest_business_id", e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="orquest_api_key">Orquest API Key</Label>
              <Input
                id="orquest_api_key"
                type="password"
                value={formData.orquest_api_key}
                onChange={(e) => handleChange("orquest_api_key", e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
