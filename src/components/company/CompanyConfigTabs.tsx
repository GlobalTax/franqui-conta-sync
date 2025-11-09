import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CompanyDataTab } from "./CompanyDataTab";
import { CompanyWithAddresses } from "@/hooks/useCompanyConfiguration";

interface Props {
  company: CompanyWithAddresses;
  onSave: (data: any) => void;
  isLoading: boolean;
}

export function CompanyConfigTabs({ company, onSave, isLoading }: Props) {
  return (
    <Tabs defaultValue="datos-empresa">
      <TabsList className="w-full justify-start flex-wrap h-auto">
        <TabsTrigger value="datos-empresa">Datos Empresa</TabsTrigger>
        <TabsTrigger value="actividades">Actividades</TabsTrigger>
        <TabsTrigger value="contabilidad">Def. Contabilidad</TabsTrigger>
        <TabsTrigger value="ccc">CCC</TabsTrigger>
        <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
        <TabsTrigger value="avanzada">Avanzada</TabsTrigger>
      </TabsList>

      <TabsContent value="datos-empresa" className="mt-6">
        <ScrollArea className="h-[600px] pr-4">
          <CompanyDataTab 
            company={company}
            onSave={onSave}
            isLoading={isLoading}
          />
        </ScrollArea>
      </TabsContent>

      <TabsContent value="actividades">
        <div className="py-10 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">Gestión de Actividades</p>
          <p className="text-sm">Configura las actividades económicas (CNAE) de la empresa</p>
        </div>
      </TabsContent>

      <TabsContent value="contabilidad">
        <div className="py-10 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">Parámetros Contables</p>
          <p className="text-sm">PGC, series de asientos, cuentas por defecto</p>
        </div>
      </TabsContent>

      <TabsContent value="ccc">
        <div className="py-10 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">Cuentas de Cotización</p>
          <p className="text-sm">Códigos CCC de la Seguridad Social</p>
        </div>
      </TabsContent>

      <TabsContent value="usuarios">
        <div className="py-10 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">Usuarios y Permisos</p>
          <p className="text-sm">Gestiona el acceso de usuarios a esta empresa</p>
        </div>
      </TabsContent>

      <TabsContent value="avanzada">
        <div className="py-10 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">Configuración Avanzada</p>
          <p className="text-sm">Conectores, APIs, integraciones</p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
