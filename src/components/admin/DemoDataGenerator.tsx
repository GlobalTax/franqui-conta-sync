import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { useCreateFranchisee } from "@/hooks/useFranchisees";
import { useCreateCompany } from "@/hooks/useCompanyMutations";
import { useCreateCentre } from "@/hooks/useCentres";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface GenerationStep {
  name: string;
  status: "pending" | "loading" | "success" | "error";
  message?: string;
}

export default function DemoDataGenerator() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [steps, setSteps] = useState<GenerationStep[]>([]);
  
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

  const generateDemoData = async () => {
    setIsGenerating(true);
    setSteps([]);

    try {
      // Paso 1: Crear o recuperar Franchisee existente
      updateStep("Franchisee", "loading");
      const franchiseeData = {
        name: "Grupo Demo McDonald's",
        company_tax_id: "B99999999",
        email: "demo@mcdonalds-group.es",
      };
      
      // Verificar si ya existe el franchisee demo
      const { data: existingFranchisee } = await supabase
        .from('franchisees')
        .select('*')
        .eq('email', 'demo@mcdonalds-group.es')
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

      // Paso 2: Crear Companies
      updateStep("Companies", "loading");
      const companiesData = [
        {
          razon_social: "Demo Restaurantes Madrid SL",
          cif: "B88888888",
          tipo_sociedad: "SL",
          franchisee_id: franchisee.id
        },
        {
          razon_social: "Demo Food Services Barcelona SL",
          cif: "B77777777",
          tipo_sociedad: "SL",
          franchisee_id: franchisee.id
        }
      ];

      const companies = await Promise.all(
        companiesData.map(data => createCompany.mutateAsync(data))
      );
      updateStep("Companies", "success", `${companies.length} sociedades creadas`);

      // Paso 3: Crear Centres
      updateStep("Centres", "loading");
      const centresData = [
        {
          codigo: "DEMO-001",
          nombre: "McDonald's Gran Vía",
          direccion: "Gran Vía 28",
          ciudad: "Madrid",
          postal_code: "28013",
          state: "Madrid",
          pais: "España",
          franchisee_id: franchisee.id,
          company_id: companies[0].id,
          opening_date: "2020-01-15",
          seating_capacity: 120,
          square_meters: 350,
          activo: true
        },
        {
          codigo: "DEMO-002",
          nombre: "McDonald's Castellana",
          direccion: "Paseo de la Castellana 120",
          ciudad: "Madrid",
          postal_code: "28046",
          state: "Madrid",
          pais: "España",
          franchisee_id: franchisee.id,
          company_id: companies[0].id,
          opening_date: "2019-06-20",
          seating_capacity: 80,
          square_meters: 280,
          activo: true
        },
        {
          codigo: "DEMO-003",
          nombre: "McDonald's Diagonal Barcelona",
          direccion: "Avinguda Diagonal 500",
          ciudad: "Barcelona",
          postal_code: "08006",
          state: "Barcelona",
          pais: "España",
          franchisee_id: franchisee.id,
          company_id: companies[1].id,
          opening_date: "2018-03-10",
          seating_capacity: 100,
          square_meters: 320,
          activo: true
        },
        {
          codigo: "DEMO-004",
          nombre: "McDonald's La Maquinista",
          direccion: "CC La Maquinista, Potosí 2",
          ciudad: "Barcelona",
          postal_code: "08030",
          state: "Barcelona",
          pais: "España",
          franchisee_id: franchisee.id,
          company_id: companies[1].id,
          opening_date: "2021-11-05",
          seating_capacity: 150,
          square_meters: 400,
          activo: true
        }
      ];

      const centres = await Promise.all(
        centresData.map(data => createCentre.mutateAsync(data))
      );
      updateStep("Centres", "success", `${centres.length} centros creados`);

      // Paso 4: Crear año fiscal para DEMO-001
      updateStep("Fiscal Year", "loading");
      const { error: fyError } = await supabase
        .from("fiscal_years")
        .insert({
          centro_code: "DEMO-001",
          year: 2025,
          start_date: "2025-01-01",
          end_date: "2025-12-31",
          is_closed: false
        });

      if (fyError) throw fyError;
      updateStep("Fiscal Year", "success", "Año fiscal 2025 creado");

      // Paso 5: Crear suppliers
      updateStep("Suppliers", "loading");
      const suppliersData = [
        { name: "Proveedores Demo SA", tax_id: "B11111111" },
        { name: "Distribuciones Demo SL", tax_id: "B22222222" },
        { name: "Servicios Demo Group", tax_id: "B33333333" }
      ];

      const { error: suppliersError } = await supabase
        .from("suppliers")
        .insert(suppliersData);

      if (suppliersError) throw suppliersError;
      updateStep("Suppliers", "success", `${suppliersData.length} proveedores creados`);

      // Éxito total
      toast({
        title: "✅ Datos Demo Generados",
        description: `Franchisee, ${companies.length} sociedades, ${centres.length} centros, año fiscal y proveedores creados exitosamente`,
      });

    } catch (error: any) {
      logger.error('DemoDataGenerator', '❌ Error al generar datos:', error);
      const lastStep = steps[steps.length - 1];
      if (lastStep) {
        updateStep(lastStep.name, "error", error.message);
      }
      
      toast({
        title: "Error al generar datos demo",
        description: error.message || "Ocurrió un error durante la generación",
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

        <Button
          onClick={generateDemoData}
          disabled={isGenerating}
          className="w-full"
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
              Generar Grupo Demo McDonald's
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
