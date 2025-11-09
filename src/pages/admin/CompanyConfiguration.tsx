import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Mail, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CompanyConfigTabs } from "@/components/company/CompanyConfigTabs";
import { useView } from "@/contexts/ViewContext";
import { useCompanyConfiguration } from "@/hooks/useCompanyConfiguration";

export default function CompanyConfiguration() {
  const { selectedView } = useView();
  const companyId = selectedView?.type === 'company' ? selectedView.id : null;
  
  const { company, isLoading, updateCompany, isUpdating } = useCompanyConfiguration(companyId || undefined);

  const handleSave = () => {
    if (typeof window !== 'undefined' && (window as any).__companyFormSubmit) {
      (window as any).__companyFormSubmit();
    }
  };

  if (!selectedView || selectedView.type === 'all') {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            Selecciona una empresa específica en el selector superior para configurar sus datos
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Cargando configuración...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Configuración de Empresa</h1>
            <p className="text-sm text-muted-foreground">
              {company?.razon_social || selectedView.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Mail className="h-4 w-4" /> Configuración Emails
          </Button>
          <Button 
            size="sm" 
            className="gap-2"
            disabled={isUpdating}
            onClick={handleSave}
          >
            <Save className="h-4 w-4" /> 
            {isUpdating ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Datos de la Empresa</CardTitle>
            {company?.pgc_verified && (
              <Badge variant="secondary">PGC: VERIFICADO</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {company && (
            <CompanyConfigTabs 
              company={company}
              onSave={updateCompany}
              isLoading={isUpdating}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
