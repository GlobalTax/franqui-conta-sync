import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { CompanyDetailData } from "@/hooks/useCompanyDetail";

interface Props {
  company: CompanyDetailData;
}

const CompanyFiscalConfig = ({ company }: Props) => {
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Próximamente:</strong> Configuración fiscal completa con direcciones fiscales y sociales,
          datos de contacto, información bancaria, y configuración de impuestos por defecto.
        </AlertDescription>
      </Alert>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Dirección Fiscal</h3>
            <p className="text-sm text-muted-foreground">
              La dirección fiscal se configurará en una futura actualización.
              Esta información se sincronizará con el sistema de contabilidad.
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-2">Dirección Social</h3>
            <p className="text-sm text-muted-foreground">
              La dirección social se configurará en una futura actualización.
              Puede ser diferente de la dirección fiscal.
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-2">Datos de Contacto</h3>
            <p className="text-sm text-muted-foreground">
              Email de contacto, teléfono, y persona de contacto para temas fiscales.
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-2">Configuración Bancaria</h3>
            <p className="text-sm text-muted-foreground">
              Cuentas bancarias asociadas a esta sociedad para pagos y cobros.
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-2">Configuración Fiscal Avanzada</h3>
            <p className="text-sm text-muted-foreground">
              Régimen de IVA, retenciones por defecto, serie de facturación, y otros parámetros fiscales.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CompanyFiscalConfig;
