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
  generateDemoAccounts,
  generateDemoBankAccounts,
  generateDemoInvoicesReceived,
  generateDemoAccountingEntries,
  generateDemoBankTransactions,
  generateDemoInvoicesIssued,
  getMonthsForRange,
  DEMO_SUPPLIERS,
} from "@/lib/demo/demoDataGenerators";

interface GenerationStep {
  name: string;
  status: "pending" | "loading" | "success" | "error";
  message?: string;
}

const DEMO_CENTRE_CODES = ['DEMO-001', 'DEMO-002', 'DEMO-003', 'DEMO-004'];
const DEMO_SUPPLIER_TAX_IDS = DEMO_SUPPLIERS.map(s => s.tax_id);

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
      // Orden inverso de dependencias
      const cleanSteps: { name: string; table: string; filter: { col: string; values: string[] } }[] = [
        { name: "Bank Transactions", table: "bank_transactions", filter: { col: "bank_account_id", values: [] } }, // special
        { name: "Accounting Transactions", table: "accounting_transactions", filter: { col: "entry_id", values: [] } }, // special
        { name: "Accounting Entries", table: "accounting_entries", filter: { col: "centro_code", values: DEMO_CENTRE_CODES } },
        { name: "Invoices Issued", table: "invoices_issued", filter: { col: "centro_code", values: DEMO_CENTRE_CODES } },
        { name: "Invoices Received", table: "invoices_received", filter: { col: "centro_code", values: DEMO_CENTRE_CODES } },
        { name: "Bank Accounts", table: "bank_accounts", filter: { col: "centro_code", values: DEMO_CENTRE_CODES } },
        { name: "Accounts", table: "accounts", filter: { col: "centro_code", values: DEMO_CENTRE_CODES } },
        { name: "Fiscal Years", table: "fiscal_years", filter: { col: "centro_code", values: DEMO_CENTRE_CODES } },
        { name: "User Roles", table: "user_roles", filter: { col: "centro", values: DEMO_CENTRE_CODES } },
        { name: "Centres", table: "centres", filter: { col: "codigo", values: DEMO_CENTRE_CODES } },
        { name: "Companies", table: "companies", filter: { col: "cif", values: ['B88888888', 'B77777777'] } },
        { name: "Suppliers", table: "suppliers", filter: { col: "tax_id", values: DEMO_SUPPLIER_TAX_IDS } },
        { name: "Franchisee", table: "franchisees", filter: { col: "email", values: ['demo@mcdonalds-group.es'] } },
      ];

      // Get bank_account_ids and entry_ids first for cascading deletes
      const { data: bankAccounts } = await supabase.from('bank_accounts').select('id').in('centro_code', DEMO_CENTRE_CODES);
      const bankAccountIds = bankAccounts?.map(b => b.id) || [];

      const { data: entries } = await supabase.from('accounting_entries').select('id').in('centro_code', DEMO_CENTRE_CODES);
      const entryIds = entries?.map(e => e.id) || [];

      // Bank transactions by bank_account_id
      if (bankAccountIds.length > 0) {
        updateStep("Bank Transactions", "loading");
        await supabase.from('bank_transactions').delete().in('bank_account_id', bankAccountIds);
        updateStep("Bank Transactions", "success", "Movimientos bancarios eliminados");
      }

      // Accounting transactions by entry_id
      if (entryIds.length > 0) {
        updateStep("Accounting Transactions", "loading");
        await supabase.from('accounting_transactions').delete().in('entry_id', entryIds);
        updateStep("Accounting Transactions", "success", "Transacciones contables eliminadas");
      }

      // Rest of cleanup
      for (const step of cleanSteps) {
        if (step.table === 'bank_transactions' || step.table === 'accounting_transactions') continue;
        updateStep(step.name, "loading");
        const { error } = await supabase.from(step.table as any).delete().in(step.filter.col, step.filter.values);
        if (error) {
          logger.warn('DemoClean', `⚠️ Error limpiando ${step.table}:`, error.message);
        }
        updateStep(step.name, "success", `${step.name} eliminados`);
      }

      toast({ title: "🗑️ Datos Demo Eliminados", description: "Todos los datos demo han sido eliminados correctamente." });
    } catch (error: unknown) {
      logger.error('DemoDataGenerator', '❌ Error al eliminar datos:', error);
      toast({ title: "Error al eliminar", description: error instanceof Error ? error.message : 'Error desconocido', variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // ========== GENERACIÓN ==========
  const generateDemoData = async (config: DemoDataConfig) => {
    setIsGenerating(true);
    setSteps([]);
    const advanced = config.advanced || getDefaultDemoConfig().advanced!;
    const months = getMonthsForRange(advanced.yearRange.from, advanced.yearRange.to);

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
      updateStep("Companies", "loading");
      const companies = await Promise.all(
        config.companies.map(async (c) => {
          const { data: existing } = await supabase.from('companies').select('*').eq('cif', c.cif).maybeSingle();
          if (existing) return existing;
          return createCompany.mutateAsync({ razon_social: c.razon_social, cif: c.cif, tipo_sociedad: c.tipo_sociedad, franchisee_id: franchisee!.id });
        })
      );
      updateStep("Companies", "success", `${companies.length} sociedades`);

      // ── 3. Centres ──
      updateStep("Centres", "loading");
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
      const centreCodes = centres.map(c => c.codigo);
      updateStep("Centres", "success", `${centres.length} centros`);

      // ── 4. Fiscal Years ──
      updateStep("Fiscal Years", "loading");
      const fiscalYearMap: Record<string, string> = {};
      for (const centre of centres) {
        for (let year = advanced.yearRange.from; year <= advanced.yearRange.to; year++) {
          const { data: existing } = await supabase.from('fiscal_years').select('*').eq('centro_code', centre.codigo).eq('year', year).maybeSingle();
          if (existing) {
            fiscalYearMap[centre.codigo] = existing.id;
          } else {
            const { data: fy, error } = await supabase.from('fiscal_years').insert({
              centro_code: centre.codigo, year, start_date: `${year}-01-01`, end_date: `${year}-12-31`, is_closed: false,
            }).select().single();
            if (error) throw error;
            fiscalYearMap[centre.codigo] = fy.id;
          }
        }
      }
      updateStep("Fiscal Years", "success", `Años fiscales creados`);

      // ── 5. Plan Contable ──
      if (advanced.generateEntries) {
        updateStep("Plan Contable", "loading");
        const accounts = generateDemoAccounts(centreCodes, companies.map(c => c.id));
        // Insert in batches, skip conflicts
        for (let i = 0; i < accounts.length; i += 50) {
          const batch = accounts.slice(i, i + 50);
          const { error } = await supabase.from('accounts').upsert(batch, { onConflict: 'code,centro_code', ignoreDuplicates: true });
          if (error) logger.warn('DemoAccounts', `Batch ${i} error:`, error.message);
        }
        updateStep("Plan Contable", "success", `${accounts.length} cuentas PGC`);
      }

      // ── 6. Suppliers ──
      updateStep("Suppliers", "loading");
      const suppliersToInsert = DEMO_SUPPLIERS;
      const { data: existingSuppliers } = await supabase.from('suppliers').select('*').in('tax_id', DEMO_SUPPLIER_TAX_IDS);
      const existingTaxIds = new Set(existingSuppliers?.map(s => s.tax_id) || []);
      const newSuppliers = suppliersToInsert.filter(s => !existingTaxIds.has(s.tax_id));
      if (newSuppliers.length > 0) {
        await supabase.from('suppliers').insert(newSuppliers);
      }
      // Fetch all supplier IDs
      const { data: allSuppliers } = await supabase.from('suppliers').select('*').in('tax_id', DEMO_SUPPLIER_TAX_IDS);
      const supplierIds = DEMO_SUPPLIERS.map(s => allSuppliers?.find(as => as.tax_id === s.tax_id)?.id || '');
      const supplierNames = DEMO_SUPPLIERS.map(s => s.name);
      updateStep("Suppliers", "success", `${DEMO_SUPPLIERS.length} proveedores`);

      // ── 7. Bank Accounts ──
      if (advanced.generateBankData) {
        updateStep("Bank Accounts", "loading");
        const bankAccounts = generateDemoBankAccounts(centreCodes);
        for (const ba of bankAccounts) {
          const { data: existing } = await supabase.from('bank_accounts').select('id').eq('centro_code', ba.centro_code).eq('iban', ba.iban).maybeSingle();
          if (!existing) {
            await supabase.from('bank_accounts').insert(ba);
          }
        }
        updateStep("Bank Accounts", "success", `${bankAccounts.length} cuentas bancarias`);
      }

      // ── 8. Facturas Recibidas ──
      let insertedInvoices: any[] = [];
      if (advanced.generateInvoices) {
        updateStep("Facturas Recibidas", "loading");
        const invoices = generateDemoInvoicesReceived(centreCodes, supplierIds, DEMO_SUPPLIER_TAX_IDS, supplierNames, months);
        // Batch insert
        for (let i = 0; i < invoices.length; i += 20) {
          const batch = invoices.slice(i, i + 20);
          const { data, error } = await supabase.from('invoices_received').insert(batch).select('id,centro_code,invoice_number,invoice_date,subtotal,tax_total,total,supplier_name,notes,base_imponible_21,base_imponible_10,cuota_iva_21,cuota_iva_10,due_date');
          if (error) { logger.warn('DemoInvoices', `Batch error:`, error.message); }
          else if (data) insertedInvoices.push(...data);
        }
        updateStep("Facturas Recibidas", "success", `${insertedInvoices.length} facturas`);
      }

      // ── 9. Asientos Contables ──
      if (advanced.generateEntries && insertedInvoices.length > 0) {
        updateStep("Asientos Contables", "loading");
        const { entries, transactions } = generateDemoAccountingEntries(insertedInvoices, fiscalYearMap);
        // Insert entries
        for (let i = 0; i < entries.length; i += 20) {
          const batch = entries.slice(i, i + 20);
          const { error } = await supabase.from('accounting_entries').insert(batch);
          if (error) logger.warn('DemoEntries', `Batch error:`, error.message);
        }
        // Insert transactions
        for (let i = 0; i < transactions.length; i += 50) {
          const batch = transactions.slice(i, i + 50);
          const { error } = await supabase.from('accounting_transactions').insert(batch);
          if (error) logger.warn('DemoTransactions', `Batch error:`, error.message);
        }
        updateStep("Asientos Contables", "success", `${entries.length} asientos, ${transactions.length} apuntes`);
      }

      // ── 10. Movimientos Bancarios ──
      if (advanced.generateBankData && insertedInvoices.length > 0) {
        updateStep("Movimientos Bancarios", "loading");
        const { data: bankAccts } = await supabase.from('bank_accounts').select('id,centro_code').in('centro_code', centreCodes);
        const bankAccountMap: Record<string, string> = {};
        bankAccts?.forEach(ba => { bankAccountMap[ba.centro_code] = ba.id; });

        const bankTxns = generateDemoBankTransactions(bankAccountMap, insertedInvoices, months);
        for (let i = 0; i < bankTxns.length; i += 30) {
          const batch = bankTxns.slice(i, i + 30);
          const { error } = await supabase.from('bank_transactions').insert(batch);
          if (error) logger.warn('DemoBankTxns', `Batch error:`, error.message);
        }
        updateStep("Movimientos Bancarios", "success", `${bankTxns.length} movimientos`);
      }

      // ── 11. Facturas Emitidas ──
      if (advanced.generateInvoices) {
        updateStep("Facturas Emitidas", "loading");
        const issuedInvoices = generateDemoInvoicesIssued(centreCodes, months);
        for (let i = 0; i < issuedInvoices.length; i += 20) {
          const batch = issuedInvoices.slice(i, i + 20);
          const { error } = await supabase.from('invoices_issued').insert(batch);
          if (error) logger.warn('DemoIssuedInv', `Batch error:`, error.message);
        }
        updateStep("Facturas Emitidas", "success", `${issuedInvoices.length} facturas emitidas`);
      }

      toast({
        title: "✅ Datos Demo Generados",
        description: `Demo completo con ${insertedInvoices.length} facturas, asientos, banco y más.`,
      });

    } catch (error: unknown) {
      logger.error('DemoDataGenerator', '❌ Error al generar datos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({ title: "Error al generar datos demo", description: errorMessage, variant: "destructive" });
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
              <li>• ~40 cuentas PGC por centro (60x, 62x, 64x, 70x…)</li>
              <li>• 5 Proveedores realistas (HAVI, McCormick, Coca-Cola, Ecolab, Endesa)</li>
              <li>• ~60 Facturas recibidas con IVA (Ene-Mar 2025)</li>
              <li>• ~60 Asientos contables con apuntes al debe/haber</li>
              <li>• ~36 Facturas emitidas (ventas mostrador + delivery)</li>
              <li>• 4 Cuentas bancarias con ~80 movimientos</li>
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
