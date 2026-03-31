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
import {
  generateBankData,
  generateInvoices,
  generateAccountingEntries,
  autoReconcileTransactions,
} from "@/lib/demo/demoDataGenerators";

interface GenerationStep {
  name: string;
  status: "pending" | "loading" | "success" | "error";
  message?: string;
}

const DEMO_CENTRE_CODES = ['DEMO-001', 'DEMO-002', 'DEMO-003', 'DEMO-004'];
const DEMO_SUPPLIER_TAX_IDS = ['A11111111', 'B22222222', 'A33333333', 'B44444444', 'A55555555'];
const DEMO_SUPPLIERS_DATA = [
  { name: 'HAVI Logistics España SA', tax_id: 'A11111111' },
  { name: 'McCormick España SL', tax_id: 'B22222222' },
  { name: 'Coca-Cola European Partners SA', tax_id: 'A33333333' },
  { name: 'Ecolab Hispanoamericana SL', tax_id: 'B44444444' },
  { name: 'Endesa Energía SA', tax_id: 'A55555555' },
];

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

  // ========== LIMPIEZA ==========
  const cleanDemoData = async () => {
    setIsGenerating(true);
    setSteps([]);

    try {
      // Get IDs for cascading deletes
      const { data: bankAccounts } = await supabase.from('bank_accounts').select('id').in('centro_code', DEMO_CENTRE_CODES);
      const bankAccountIds = bankAccounts?.map(b => b.id) || [];
      const { data: entries } = await supabase.from('accounting_entries').select('id').in('centro_code', DEMO_CENTRE_CODES);
      const entryIds = entries?.map(e => e.id) || [];

      // Bank reconciliations first
      if (bankAccountIds.length > 0) {
        updateStep("Reconciliaciones", "loading");
        const { data: btIds } = await supabase.from('bank_transactions').select('id').in('bank_account_id', bankAccountIds);
        if (btIds && btIds.length > 0) {
          await supabase.from('bank_reconciliations').delete().in('bank_transaction_id', btIds.map(t => t.id));
        }
        updateStep("Reconciliaciones", "success", "Eliminadas");
      }

      // Bank transactions
      if (bankAccountIds.length > 0) {
        updateStep("Movimientos Bancarios", "loading");
        await supabase.from('bank_transactions').delete().in('bank_account_id', bankAccountIds);
        updateStep("Movimientos Bancarios", "success", "Eliminados");
      }

      // Accounting transactions
      if (entryIds.length > 0) {
        updateStep("Transacciones Contables", "loading");
        await supabase.from('accounting_transactions').delete().in('entry_id', entryIds);
        updateStep("Transacciones Contables", "success", "Eliminadas");
      }

      // Invoice lines for received invoices
      updateStep("Líneas de Factura", "loading");
      const { data: invIds } = await supabase.from('invoices_received').select('id').in('centro_code', DEMO_CENTRE_CODES);
      if (invIds && invIds.length > 0) {
        await supabase.from('invoice_lines').delete().in('invoice_id', invIds.map(i => i.id));
      }
      updateStep("Líneas de Factura", "success", "Eliminadas");

      // Sequential cleanup of remaining tables
      const cleanups = [
        { name: "Asientos Contables", table: "accounting_entries", col: "centro_code", values: DEMO_CENTRE_CODES },
        { name: "Facturas Emitidas", table: "invoices_issued", col: "centro_code", values: DEMO_CENTRE_CODES },
        { name: "Facturas Recibidas", table: "invoices_received", col: "centro_code", values: DEMO_CENTRE_CODES },
        { name: "Cuentas Bancarias", table: "bank_accounts", col: "centro_code", values: DEMO_CENTRE_CODES },
        { name: "Plan Contable", table: "accounts", col: "centro_code", values: DEMO_CENTRE_CODES },
        { name: "Años Fiscales", table: "fiscal_years", col: "centro_code", values: DEMO_CENTRE_CODES },
        { name: "Roles Usuario", table: "user_roles", col: "centro", values: DEMO_CENTRE_CODES },
        { name: "Centros", table: "centres", col: "codigo", values: DEMO_CENTRE_CODES },
        { name: "Sociedades", table: "companies", col: "cif", values: ['B88888888', 'B77777777'] },
        { name: "Proveedores", table: "suppliers", col: "tax_id", values: DEMO_SUPPLIER_TAX_IDS },
        { name: "Franchisee", table: "franchisees", col: "email", values: ['demo@mcdonalds-group.es'] },
      ];

      for (const step of cleanups) {
        updateStep(step.name, "loading");
        await supabase.from(step.table as any).delete().in(step.col, step.values);
        updateStep(step.name, "success", "Eliminado");
      }

      toast({ title: "🗑️ Datos Demo Eliminados", description: "Todos los datos demo han sido eliminados." });
    } catch (error: unknown) {
      logger.error('DemoClean', '❌ Error:', error);
      toast({ title: "Error al eliminar", description: error instanceof Error ? error.message : 'Error', variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // ========== GENERACIÓN ==========
  const generateDemoData = async (config: DemoDataConfig) => {
    setIsGenerating(true);
    setSteps([]);
    const advanced = config.advanced || getDefaultDemoConfig().advanced!;
    const year = advanced.yearRange.from;
    const volume = advanced.dataVolume;

    try {
      // ── 1. Franchisee ──
      updateStep("Franchisee", "loading");
      const { data: existingFranchisee } = await supabase.from('franchisees').select('*').eq('email', config.franchisee.email).maybeSingle();
      let franchisee = existingFranchisee;
      if (!franchisee) {
        franchisee = await createFranchisee.mutateAsync({ name: config.franchisee.name, company_tax_id: config.franchisee.company_tax_id, email: config.franchisee.email });
      }
      updateStep("Franchisee", "success", franchisee.name);

      // ── 2. Companies ──
      updateStep("Sociedades", "loading");
      const companies = await Promise.all(
        config.companies.map(async (c) => {
          const { data: existing } = await supabase.from('companies').select('*').eq('cif', c.cif).maybeSingle();
          if (existing) return existing;
          return createCompany.mutateAsync({ razon_social: c.razon_social, cif: c.cif, tipo_sociedad: c.tipo_sociedad, franchisee_id: franchisee!.id });
        })
      );
      updateStep("Sociedades", "success", `${companies.length} sociedades`);

      // ── 3. Centres ──
      updateStep("Centros", "loading");
      const centres = await Promise.all(
        config.centres.map(async (c) => {
          const { data: existing } = await supabase.from('centres').select('*').eq('codigo', c.codigo).maybeSingle();
          if (existing) return existing;
          return createCentre.mutateAsync({
            codigo: c.codigo, nombre: c.nombre, direccion: c.direccion, ciudad: c.ciudad,
            postal_code: c.postal_code, state: c.state, pais: c.pais,
            franchisee_id: franchisee!.id, company_id: companies[c.company_index].id,
            opening_date: c.opening_date, seating_capacity: c.seating_capacity, square_meters: c.square_meters, activo: true,
          });
        })
      );
      updateStep("Centros", "success", `${centres.length} centros`);

      // ── 4. Fiscal Years ──
      updateStep("Años Fiscales", "loading");
      let fiscalYearId: string | null = null;
      for (const centre of centres) {
        const { data: existing } = await supabase.from('fiscal_years').select('*').eq('centro_code', centre.codigo).eq('year', year).maybeSingle();
        if (existing) {
          if (!fiscalYearId) fiscalYearId = existing.id;
        } else {
          const { data: fy, error } = await supabase.from('fiscal_years').insert({
            centro_code: centre.codigo, year, start_date: `${year}-01-01`, end_date: `${year}-12-31`, is_closed: false,
          }).select().single();
          if (error) throw error;
          if (!fiscalYearId) fiscalYearId = fy.id;
        }
      }
      updateStep("Años Fiscales", "success", `Año ${year}`);

      // ── 5. Plan Contable (cuentas PGC) ──
      if (advanced.generateEntries) {
        updateStep("Plan Contable", "loading");
        const pgcAccounts = [
          { code: '4000000', name: 'Proveedores', account_type: 'liability', level: 3 },
          { code: '4100000', name: 'Acreedores por prestaciones', account_type: 'liability', level: 3 },
          { code: '4300000', name: 'Clientes', account_type: 'asset', level: 3 },
          { code: '4650000', name: 'Remuneraciones pendientes de pago', account_type: 'liability', level: 3 },
          { code: '4720000', name: 'H.P. IVA soportado', account_type: 'asset', level: 4 },
          { code: '4750000', name: 'H.P. acreedora por IVA', account_type: 'liability', level: 4 },
          { code: '5720000', name: 'Bancos c/c', account_type: 'asset', level: 3 },
          { code: '6000000', name: 'Compras de mercaderías', account_type: 'expense', level: 3 },
          { code: '6060000', name: 'Envases y embalajes (Paper)', account_type: 'expense', level: 3 },
          { code: '6210000', name: 'Arrendamientos y cánones', account_type: 'expense', level: 3 },
          { code: '6220000', name: 'Reparaciones y conservación', account_type: 'expense', level: 3 },
          { code: '6260000', name: 'Royalties McDonald\'s', account_type: 'expense', level: 3 },
          { code: '6270000', name: 'Publicidad y propaganda', account_type: 'expense', level: 3 },
          { code: '6280000', name: 'Suministros', account_type: 'expense', level: 3 },
          { code: '6290000', name: 'Otros servicios', account_type: 'expense', level: 3 },
          { code: '6400000', name: 'Sueldos y salarios', account_type: 'expense', level: 3 },
          { code: '6420000', name: 'Seguridad Social empresa', account_type: 'expense', level: 3 },
          { code: '6810000', name: 'Amortización inmovilizado', account_type: 'expense', level: 3 },
          { code: '7000000', name: 'Ventas de mercaderías', account_type: 'income', level: 3 },
          { code: '7520000', name: 'Ingresos por arrendamientos', account_type: 'income', level: 3 },
        ];

        const accountInserts: any[] = [];
        for (const centre of centres) {
          for (const acct of pgcAccounts) {
            accountInserts.push({
              code: acct.code,
              name: acct.name,
              account_type: acct.account_type,
              level: acct.level,
              centro_code: centre.codigo,
              company_id: centre.company_id,
              active: true,
              is_detail: acct.level >= 4,
              parent_code: null,
            });
          }
        }
        // Upsert to avoid conflicts
        for (let i = 0; i < accountInserts.length; i += 50) {
          await supabase.from('accounts').upsert(accountInserts.slice(i, i + 50), { onConflict: 'code,centro_code', ignoreDuplicates: true });
        }
        updateStep("Plan Contable", "success", `${accountInserts.length} cuentas PGC`);
      }

      // ── 6. Suppliers ──
      updateStep("Proveedores", "loading");
      const { data: existingSuppliers } = await supabase.from('suppliers').select('*').in('tax_id', DEMO_SUPPLIER_TAX_IDS);
      const existingTaxIds = new Set(existingSuppliers?.map(s => s.tax_id) || []);
      const newSuppliers = DEMO_SUPPLIERS_DATA.filter(s => !existingTaxIds.has(s.tax_id));
      if (newSuppliers.length > 0) {
        await supabase.from('suppliers').insert(newSuppliers);
      }
      const { data: allSuppliers } = await supabase.from('suppliers').select('*').in('tax_id', DEMO_SUPPLIER_TAX_IDS);
      updateStep("Proveedores", "success", `${DEMO_SUPPLIERS_DATA.length} proveedores`);

      // ── 7. Bank Data ──
      let bankResult: Awaited<ReturnType<typeof generateBankData>> | null = null;
      if (advanced.generateBankData) {
        updateStep("Datos Bancarios", "loading");
        try {
          bankResult = await generateBankData(
            centres.map(c => ({ id: c.id, codigo: c.codigo, nombre: c.nombre, seating_capacity: c.seating_capacity || 100 })),
            year,
            volume
          );
          updateStep("Datos Bancarios", "success", `${bankResult.accounts.length} cuentas, ${bankResult.transactions.length} movimientos`);
        } catch (e: any) {
          updateStep("Datos Bancarios", "error", e.message);
          logger.error('DemoBank', e);
        }
      }

      // ── 8. Invoices ──
      let invoiceResult: Awaited<ReturnType<typeof generateInvoices>> | null = null;
      if (advanced.generateInvoices && allSuppliers && allSuppliers.length > 0) {
        updateStep("Facturas", "loading");
        try {
          invoiceResult = await generateInvoices(
            centres.map(c => ({ id: c.id, codigo: c.codigo, nombre: c.nombre, seating_capacity: c.seating_capacity || 100 })),
            allSuppliers.map(s => ({ id: s.id, name: s.name, tax_id: s.tax_id })),
            year,
            volume
          );
          updateStep("Facturas", "success", `${invoiceResult.invoicesReceived.length} recibidas, ${invoiceResult.invoicesIssued.length} emitidas`);
        } catch (e: any) {
          updateStep("Facturas", "error", e.message);
          logger.error('DemoInvoices', e);
        }
      }

      // ── 9. Accounting Entries ──
      if (advanced.generateEntries && fiscalYearId && invoiceResult) {
        updateStep("Asientos Contables", "loading");
        try {
          const entries = await generateAccountingEntries(
            centres.map(c => ({ id: c.id, codigo: c.codigo })),
            fiscalYearId,
            invoiceResult.invoicesReceived,
            year,
            volume
          );
          updateStep("Asientos Contables", "success", `${entries.length} asientos`);
        } catch (e: any) {
          updateStep("Asientos Contables", "error", e.message);
          logger.error('DemoEntries', e);
        }
      }

      // ── 10. Auto Reconciliation ──
      if (advanced.autoReconcile && bankResult && invoiceResult) {
        updateStep("Conciliación", "loading");
        try {
          const { data: bankTxns } = await supabase
            .from('bank_transactions')
            .select('id,amount,description,bank_account_id')
            .in('bank_account_id', bankResult.accounts.map(a => a.id));

          const count = await autoReconcileTransactions(
            bankResult.accounts,
            invoiceResult.invoicesReceived,
            bankTxns || []
          );
          updateStep("Conciliación", "success", `${count} conciliadas`);
        } catch (e: any) {
          updateStep("Conciliación", "error", e.message);
          logger.error('DemoReconcile', e);
        }
      }

      toast({
        title: "✅ Datos Demo Generados",
        description: "Demo completo con estructura, facturas, asientos, banco y conciliación.",
      });

    } catch (error: unknown) {
      logger.error('DemoDataGenerator', '❌ Error:', error);
      toast({ title: "Error al generar datos demo", description: error instanceof Error ? error.message : 'Error', variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const getStepIcon = (status: GenerationStep["status"]) => {
    switch (status) {
      case "loading": return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "success": return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "error": return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
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
            Crea un grupo completo de restaurantes McDonald's con datos transaccionales realistas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <h4 className="font-medium text-sm">Se crearán:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• 1 Franchisee · 2 Sociedades · 4 Centros</li>
              <li>• ~20 cuentas PGC por centro (60x, 62x, 64x, 70x…)</li>
              <li>• 5 Proveedores realistas (HAVI, McCormick, Coca-Cola, Ecolab, Endesa)</li>
              <li>• Facturas recibidas y emitidas según volumen</li>
              <li>• Asientos contables con apuntes al debe/haber</li>
              <li>• Cuentas bancarias con movimientos y conciliación automática</li>
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
            <Button onClick={cleanDemoData} disabled={isGenerating} variant="destructive" className="flex-1" size="lg">
              {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminando...</> : <><Trash2 className="mr-2 h-4 w-4" />Limpiar Datos Demo</>}
            </Button>
            <Button onClick={() => setShowConfigDialog(true)} disabled={isGenerating} className="flex-1" size="lg">
              {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generando...</> : <><Sparkles className="mr-2 h-4 w-4" />Configurar y Generar Demo</>}
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
