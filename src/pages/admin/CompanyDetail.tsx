import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Building2, AlertCircle } from "lucide-react";
import { useCompanyDetail } from "@/hooks/useCompanyDetail";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { validateCIF } from "@/lib/franchisee-validation";
import CompanyDataForm from "@/components/admin/CompanyDataForm";
import CompanyAssociatedCentres from "@/components/admin/CompanyAssociatedCentres";
import CompanyFiscalConfig from "@/components/admin/CompanyFiscalConfig";
import CompanyAuditLog from "@/components/admin/CompanyAuditLog";

const CompanyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { company, associatedCentres, stats, isLoading } = useCompanyDetail(id);

  const isCIFValid = company?.cif ? validateCIF(company.cif).isValid : true;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando datos de la sociedad...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No se encontró la sociedad solicitada</AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/admin")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Admin
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with breadcrumb */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate("/admin")}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Sociedades
          </Button>
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">{company.razon_social}</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-muted-foreground font-mono">{company.cif}</p>
                <Badge variant={company.activo ? "default" : "secondary"}>
                  {company.activo ? "Activa" : "Inactiva"}
                </Badge>
                {!isCIFValid && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    CIF Inválido
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Franquiciado</div>
          <div className="font-semibold">{company.franchisee?.name || "—"}</div>
        </div>
      </div>

      {/* Data quality warning */}
      {!isCIFValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Problema de calidad de datos:</strong> El CIF "{company.cif}" no tiene un formato válido.
            Es posible que contenga un nombre en lugar de un CIF real. Por favor, corrígelo en la pestaña "Datos Generales".
          </AlertDescription>
        </Alert>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Centros</div>
          <div className="text-2xl font-bold mt-1">{stats.totalCentres}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Centros Activos</div>
          <div className="text-2xl font-bold mt-1">{stats.activeCentres}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Centros Principales</div>
          <div className="text-2xl font-bold mt-1">{stats.principalCentres}</div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="data" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="data">Datos Generales</TabsTrigger>
          <TabsTrigger value="centres">Centros Asociados</TabsTrigger>
          <TabsTrigger value="fiscal">Configuración Fiscal</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="mt-6">
          <CompanyDataForm company={company} />
        </TabsContent>

        <TabsContent value="centres" className="mt-6">
          <CompanyAssociatedCentres
            centres={associatedCentres}
            companyId={id!}
          />
        </TabsContent>

        <TabsContent value="fiscal" className="mt-6">
          <CompanyFiscalConfig company={company} />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <CompanyAuditLog companyId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompanyDetail;
