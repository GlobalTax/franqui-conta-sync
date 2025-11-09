import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyDetailData } from "@/hooks/useCompanyDetail";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Props {
  company: CompanyDetailData;
}

export default function CompanyFiscalConfig({ company }: Props) {
  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Configuración Fiscal - En Desarrollo</AlertTitle>
        <AlertDescription>
          Esta funcionalidad está en desarrollo y requiere configuración adicional en la base de datos.
          Próximamente podrás gestionar:
          <ul className="mt-2 list-disc list-inside space-y-1">
            <li>Direcciones fiscales y sociales</li>
            <li>Datos de contacto</li>
            <li>Cuentas bancarias</li>
            <li>Configuración fiscal avanzada (IVA, IRPF, series de facturación)</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Datos Básicos de la Sociedad</CardTitle>
          <CardDescription>
            Información básica registrada en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Razón Social</label>
            <p className="text-sm text-muted-foreground">{company.razon_social}</p>
          </div>
          <div>
            <label className="text-sm font-medium">CIF</label>
            <p className="text-sm text-muted-foreground">{company.cif}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Tipo de Sociedad</label>
            <p className="text-sm text-muted-foreground">{company.tipo_sociedad || "SL"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
