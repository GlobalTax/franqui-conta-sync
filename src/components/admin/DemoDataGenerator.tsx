import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { useCreateFranchisee } from "@/hooks/useFranchisees";
import { useCreateCompany } from "@/hooks/useCompanyMutations";
import { useCreateCentre } from "@/hooks/useCentres";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { DemoDataConfig, getDefaultDemoConfig } from "@/types/demo-config";
import { DemoDataConfigDialog } from "./DemoDataConfigDialog";

interface GenerationStep {
  name: string;
  status: "pending" | "loading" | "success" | "error";
  message?: string;
}

export default function DemoDataGenerator() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [steps, setSteps] = useState<GenerationStep[]>([]);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [demoConfig, setDemoConfig] = useState<DemoDataConfig>(getDefaultDemoConfig());
  
  const createFranchisee = useCreateFranchisee();
  const createCompany = useCreateCompany();
  const createCentre = useCreateCentre();

  const updateStep = (name: string, status: GenerationStep["status"], message?: string) => {
    setSteps(prev => {
      const existing = prev.find(s => s.name === name);
      if (existing) {
        return prev.map(s => s.name === name ? { ...s, status, message } : s);
      }
      return [...prev, { name, status, message }];
    });
  };

  const cleanDemoData = async () => {
    setIsGenerating(true);
    setSteps([]);

    try {
      // Paso 1: Eliminar fiscal_years de centros demo
      updateStep("Fiscal Years", "loading");
      const { error: fyError } = await supabase
        .from('fiscal_years')
        .delete()
        .in('centro_code', ['DEMO-001', 'DEMO-002', 'DEMO-003', 'DEMO-004']);
      
      if (fyError) throw fyError;
      updateStep("Fiscal Years", "success", "Años fiscales eliminados");
      logger.info('DemoDataGenerator', '🗑️ Fiscal years eliminados');

      // Paso 2: Eliminar accounting_entries de centros demo
      updateStep("Accounting Entries", "loading");
      const { error: aeError } = await supabase
        .from('accounting_entries')
        .delete()
        .in('centro_code', ['DEMO-001', 'DEMO-002', 'DEMO-003', 'DEMO-004']);
      
      if (aeError) throw aeError;
      updateStep("Accounting Entries", "success", "Asientos contables eliminados");
      logger.info('DemoDataGenerator', '🗑️ Accounting entries eliminados');

      // Paso 3: Eliminar user_roles de centros demo
      updateStep("User Roles", "loading");
      const { error: urError } = await supabase
        .from('user_roles')
        .delete()
        .in('centro', ['DEMO-001', 'DEMO-002', 'DEMO-003', 'DEMO-004']);
      
      if (urError) throw urError;
      updateStep("User Roles", "success", "Roles de usuario eliminados");
      logger.info('DemoDataGenerator', '🗑️ User roles eliminados');

      // Paso 4: Eliminar centres demo
      updateStep("Centres", "loading");
      const { error: centresError } = await supabase
        .from('centres')
        .delete()
        .in('codigo', ['DEMO-001', 'DEMO-002', 'DEMO-003', 'DEMO-004']);
      
      if (centresError) throw centresError;
      updateStep("Centres", "success", "4 centros eliminados");
      logger.info('DemoDataGenerator', '🗑️ Centres eliminados');

      // Paso 5: Eliminar companies demo
      updateStep("Companies", "loading");
      const { error: companiesError } = await supabase
        .from('companies')
        .delete()
        .in('cif', ['B88888888', 'B77777777']);
      
      if (companiesError) throw companiesError;
      updateStep("Companies", "success", "2 sociedades eliminadas");
      logger.info('DemoDataGenerator', '🗑️ Companies eliminadas');

      // Paso 6: Eliminar suppliers demo
      updateStep("Suppliers", "loading");
      const { error: suppliersError } = await supabase
        .from('suppliers')
        .delete()
        .in('tax_id', ['B11111111', 'B22222222', 'B33333333']);
      
      if (suppliersError) throw suppliersError;
      updateStep("Suppliers", "success", "Proveedores eliminados");
      logger.info('DemoDataGenerator', '🗑️ Suppliers eliminados');

      // Paso 7: Eliminar franchisee demo
      updateStep("Franchisee", "loading");
      const { error: franchiseeError } = await supabase
        .from('franchisees')
        .delete()
        .eq('email', 'demo@mcdonalds-group.es');
      
      if (franchiseeError) throw franchiseeError;
      updateStep("Franchisee", "success", "Franchisee eliminado");
      logger.info('DemoDataGenerator', '🗑️ Franchisee eliminado');

      // Éxito total
      toast({
        title: "🗑️ Datos Demo Eliminados",
        description: "Todos los datos demo han sido eliminados correctamente. Ahora puedes regenerarlos.",
      });

    } catch (error: unknown) {
      logger.error('DemoDataGenerator', '❌ Error al eliminar datos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const lastStep = steps[steps.length - 1];
      if (lastStep) {
        updateStep(lastStep.name, "error", errorMessage);
      }

      toast({
        title: "Error al eliminar datos demo",
        description: errorMessage || "Ocurrió un error durante la eliminación",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDemoData = async (config: DemoDataConfig) => {
    setIsGenerating(true);
    setSteps([]);

    try {
      // Paso 1: Crear o recuperar Franchisee existente
      updateStep("Franchisee", "loading");
      const franchiseeData = {
        name: config.franchisee.name,
        company_tax_id: config.franchisee.company_tax_id,
        email: config.franchisee.email,
      };
      
      // Verificar si ya existe el franchisee demo
      const { data: existingFranchisee } = await supabase
        .from('franchisees')
        .select('*')
        .eq('email', config.franchisee.email)
        .maybeSingle();

      let franchisee;
      if (existingFranchisee) {
        franchisee = existingFranchisee;
        updateStep("Franchisee", "success", `${franchisee.name} (ya existía)`);
        logger.info('DemoDataGenerator', '♻️ Franchisee existente reutilizado:', franchisee.id);
      } else {
        franchisee = await createFranchisee.mutateAsync(franchiseeData);
        updateStep("Franchisee", "success", franchisee.name);
        logger.info('DemoDataGenerator', '✅ Franchisee creado:', franchisee.id);
      }

      // Paso 2: Crear o recuperar Companies
      updateStep("Companies", "loading");
      const companiesData = config.companies.map(company => ({
        razon_social: company.razon_social,
        cif: company.cif,
        tipo_sociedad: company.tipo_sociedad,
        franchisee_id: franchisee.id
      }));

      const companies = await Promise.all(
        companiesData.map(async (companyData) => {
          // Verificar si ya existe
          const { data: existing } = await supabase
            .from('companies')
            .select('*')
            .eq('cif', companyData.cif)
            .maybeSingle();
          
          if (existing) {
            logger.info('DemoDataGenerator', '♻️ Company existente reutilizada:', existing.id, existing.cif);
            return existing;
          }
          
          // Crear nueva
          const newCompany = await createCompany.mutateAsync(companyData);
          logger.info('DemoDataGenerator', '✅ Company creada:', newCompany.id);
          return newCompany;
        })
      );
      
      const newCount = companies.filter((c, idx) => c.cif === companiesData[idx].cif && !companies.some((comp, i) => i < idx && comp.id === c.id)).length;
      const reusedCount = companies.length - newCount;
      updateStep("Companies", "success", `${companies.length} sociedades (${reusedCount > 0 ? `${reusedCount} reutilizadas` : 'todas nuevas'})`);

      // Paso 3: Crear o recuperar Centres
      updateStep("Centres", "loading");
      const centresData = config.centres.map(centre => ({
        codigo: centre.codigo,
        nombre: centre.nombre,
        direccion: centre.direccion,
        ciudad: centre.ciudad,
        postal_code: centre.postal_code,
        state: centre.state,
        pais: centre.pais,
        franchisee_id: franchisee.id,
        company_id: companies[centre.company_index].id,
        opening_date: centre.opening_date,
        seating_capacity: centre.seating_capacity,
        square_meters: centre.square_meters,
        activo: true
      }));

      const centres = await Promise.all(
        centresData.map(async (centreData) => {
          // Verificar si ya existe
          const { data: existing } = await supabase
            .from('centres')
            .select('*')
            .eq('codigo', centreData.codigo)
            .maybeSingle();
          
          if (existing) {
            logger.info('DemoDataGenerator', '♻️ Centre existente reutilizado:', existing.id, existing.codigo);
            return existing;
          }
          
          // Crear nuevo
          const newCentre = await createCentre.mutateAsync(centreData);
          logger.info('DemoDataGenerator', '✅ Centre creado:', newCentre.id);
          return newCentre;
        })
      );
      
      const newCentresCount = centres.filter((c, idx) => c.codigo === centresData[idx].codigo && !centres.some((cen, i) => i < idx && cen.id === c.id)).length;
      const reusedCentresCount = centres.length - newCentresCount;
      updateStep("Centres", "success", `${centres.length} centros (${reusedCentresCount > 0 ? `${reusedCentresCount} reutilizados` : 'todos nuevos'})`);

      // Paso 4: Crear o recuperar año fiscal para primer centro
      updateStep("Fiscal Year", "loading");
      
      // Verificar si ya existe el año fiscal
      const { data: existingFY } = await supabase
        .from("fiscal_years")
        .select('*')
        .eq('centro_code', config.centres[0].codigo)
        .eq('year', 2025)
        .maybeSingle();

      if (!existingFY) {
        const { error: fyError } = await supabase
          .from("fiscal_years")
          .insert({
            centro_code: config.centres[0].codigo,
            year: 2025,
            start_date: "2025-01-01",
            end_date: "2025-12-31",
            is_closed: false
          });

        if (fyError) throw fyError;
        updateStep("Fiscal Year", "success", "Año fiscal 2025 creado");
        logger.info('DemoDataGenerator', '✅ Fiscal Year creado');
      } else {
        updateStep("Fiscal Year", "success", "Año fiscal 2025 (ya existía)");
        logger.info('DemoDataGenerator', '♻️ Fiscal Year existente reutilizado');
      }

      // Paso 5: Crear o recuperar suppliers
      updateStep("Suppliers", "loading");
      const suppliersData = config.suppliers;

      // Verificar cuáles suppliers ya existen
      const supplierTaxIds = config.suppliers.map(s => s.tax_id);
      const { data: existingSuppliers } = await supabase
        .from("suppliers")
        .select('*')
        .in('tax_id', supplierTaxIds);

      const existingTaxIds = new Set(existingSuppliers?.map(s => s.tax_id) || []);
      const newSuppliers = suppliersData.filter(s => !existingTaxIds.has(s.tax_id));

      if (newSuppliers.length > 0) {
        const { error: suppliersError } = await supabase
          .from("suppliers")
          .insert(newSuppliers);

        if (suppliersError) throw suppliersError;
        logger.info('DemoDataGenerator', '✅ Suppliers creados:', newSuppliers.length);
      }
      
      const reusedSuppliers = suppliersData.length - newSuppliers.length;
      updateStep("Suppliers", "success", `${suppliersData.length} proveedores (${reusedSuppliers > 0 ? `${reusedSuppliers} existentes` : 'todos nuevos'})`);

      // Éxito total
      toast({
        title: "✅ Datos Demo Generados",
        description: `Franchisee, ${companies.length} sociedades, ${centres.length} centros, año fiscal y proveedores creados exitosamente`,
      });

    } catch (error: unknown) {
      logger.error('DemoDataGenerator', '❌ Error al generar datos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const lastStep = steps[steps.length - 1];
      if (lastStep) {
        updateStep(lastStep.name, "error", errorMessage);
      }
      
      toast({
        title: "Error al generar datos demo",
        description: errorMessage || "Ocurrió un error durante la generación",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getStepIcon = (status: GenerationStep["status"]) => {
    switch (status) {
      case "loading":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generador de Datos Demo
          </CardTitle>
          <CardDescription>
            Crea un grupo completo de restaurantes McDonald's con datos de ejemplo para pruebas y demostraciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <h4 className="font-medium text-sm">Se crearán:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• 1 Franchisee: Grupo Demo McDonald's</li>
              <li>• 2 Sociedades: Madrid SL y Barcelona SL</li>
              <li>• 4 Centros: Gran Vía, Castellana, Diagonal y La Maquinista</li>
              <li>• 1 Año fiscal 2025 para DEMO-001</li>
              <li>• 3 Proveedores demo</li>
            </ul>
          </div>

          {steps.length > 0 && (
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm p-2 rounded-md bg-muted/30">
                  {getStepIcon(step.status)}
                  <span className="font-medium">{step.name}</span>
                  {step.message && (
                    <span className="text-muted-foreground ml-auto">{step.message}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={cleanDemoData}
              disabled={isGenerating}
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpiar Datos Demo
                </>
              )}
            </Button>

            <Button
              onClick={() => setShowConfigDialog(true)}
              disabled={isGenerating}
              className="flex-1"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando Datos Demo...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Configurar y Generar Demo
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <DemoDataConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        config={demoConfig}
        onGenerate={(config) => {
          setDemoConfig(config);
          setShowConfigDialog(false);
          generateDemoData(config);
        }}
      />
    </>
  );
}
