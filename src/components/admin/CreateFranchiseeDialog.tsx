import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateFranchisee } from "@/hooks/useFranchisees";
import { franchiseeSchema, validateCIF, validateEmail, isEmail } from "@/lib/franchisee-validation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };
    
    if (field === "email") {
      if (!value) {
        newErrors.email = "El email es obligatorio";
      } else if (!validateEmail(value)) {
        newErrors.email = "Formato de email inválido";
      } else {
        delete newErrors.email;
      }
    }
    
    if (field === "name") {
      if (!value || value.trim() === "") {
        newErrors.name = "El nombre es obligatorio";
      } else if (value === "#N/D") {
        newErrors.name = "El nombre no puede ser '#N/D'";
      } else if (value.length > 100) {
        newErrors.name = "El nombre no puede superar 100 caracteres";
      } else {
        delete newErrors.name;
      }
    }
    
    if (field === "company_tax_id" && value) {
      if (isEmail(value)) {
        newErrors.company_tax_id = "El CIF no puede ser un email";
      } else if (!validateCIF(value)) {
        newErrors.company_tax_id = "Formato de CIF inválido (ejemplo: B12345678)";
      } else {
        delete newErrors.company_tax_id;
      }
    } else if (field === "company_tax_id" && !value) {
      delete newErrors.company_tax_id;
    }
    
    setErrors(newErrors);
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    validateField(field, formData[field as keyof typeof formData] || "");
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const result = franchiseeSchema.safeParse(formData);
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      setTouched({
        name: true,
        email: true,
        company_tax_id: true,
      });
      return;
    }
    
    createFranchisee.mutate(result.data, {
      onSuccess: () => {
        onOpenChange(false);
        setFormData({
          name: "",
          email: "",
          company_tax_id: "",
          orquest_business_id: "MCDONALDS_ES",
          orquest_api_key: "",
        });
        setErrors({});
        setTouched({});
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
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              required
              placeholder="Nombre del franchisee"
              className={errors.name && touched.name ? "border-red-500" : ""}
            />
            {errors.name && touched.name && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              required
              placeholder="email@ejemplo.com"
              className={errors.email && touched.email ? "border-red-500" : ""}
            />
            {errors.email && touched.email && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.email}
              </p>
            )}
            {!errors.email && touched.email && formData.email && (
              <p className="text-sm text-green-500 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Email válido
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_tax_id">CIF</Label>
            <Input
              id="company_tax_id"
              value={formData.company_tax_id}
              onChange={(e) => handleChange("company_tax_id", e.target.value.toUpperCase())}
              onBlur={() => handleBlur("company_tax_id")}
              placeholder="B12345678"
              maxLength={20}
              className={errors.company_tax_id && touched.company_tax_id ? "border-red-500" : ""}
            />
            {errors.company_tax_id && touched.company_tax_id && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.company_tax_id}
              </p>
            )}
            {!errors.company_tax_id && touched.company_tax_id && formData.company_tax_id && (
              <p className="text-sm text-green-500 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                CIF válido
              </p>
            )}
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
