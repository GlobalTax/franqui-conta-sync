import { useEffect, useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Layout from "@/components/Layout";
import { AdminRoute } from "@/components/AdminRoute";
import { registerServiceWorker } from "@/lib/register-sw";
import { ShortcutHelpDialog } from "@/components/shortcuts/ShortcutHelpDialog";
import { CommandPalette } from "@/components/command/CommandPalette";
import { GlobalShortcutsWrapper } from "@/components/shortcuts/GlobalShortcutsWrapper";

// Lazy load all page components
const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const Banks = lazy(() => import("@/pages/Banks"));
const Reconciliation = lazy(() => import("@/pages/Reconciliation"));
const BankReconciliation = lazy(() => import("@/pages/treasury/BankReconciliation"));
const JournalEntries = lazy(() => import("@/pages/JournalEntries"));
const ChartOfAccounts = lazy(() => import("@/pages/ChartOfAccounts"));
const ProfitAndLoss = lazy(() => import("@/pages/ProfitAndLoss"));
const ProfitAndLossConsolidated = lazy(() => import("@/pages/ProfitAndLossConsolidated"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Admin = lazy(() => import("@/pages/Admin"));
const CentreDetail = lazy(() => import("@/pages/admin/CentreDetail"));
const CompanyDetail = lazy(() => import("@/pages/admin/CompanyDetail"));
const FranchiseeDetail = lazy(() => import("@/pages/admin/FranchiseeDetail"));
const AdminDebug = lazy(() => import("@/pages/admin/AdminDebug"));
const PLRulesManagement = lazy(() => import("@/pages/admin/PLRulesManagement"));
const DemoData = lazy(() => import("@/pages/admin/DemoData"));
const AcceptInvite = lazy(() => import("@/pages/AcceptInvite"));
const AccountingEntries = lazy(() => import("@/pages/accounting/AccountingEntries"));
const NewAccountingEntry = lazy(() => import("@/pages/accounting/NewAccountingEntry"));
const FiscalYears = lazy(() => import("@/pages/accounting/FiscalYears"));
const CompanyConfiguration = lazy(() => import("@/pages/admin/CompanyConfiguration"));
const NewInvoiceReceived = lazy(() => import("@/pages/invoices/NewInvoiceReceived"));
const InvoicesReceivedOCR = lazy(() => import("@/pages/invoices/InvoicesReceivedOCR"));
const BulkInvoiceUpload = lazy(() => import("@/pages/invoices/BulkInvoiceUpload"));
const InvoicesIssued = lazy(() => import("@/pages/invoices/InvoicesIssued"));
const NewInvoiceIssued = lazy(() => import("@/pages/invoices/NewInvoiceIssued"));
const InvoiceDetail = lazy(() => import("@/pages/invoices/InvoiceDetail"));
const InvoicesInbox = lazy(() => import("@/pages/invoices/InvoicesInbox"));
const InvoiceDetailEditor = lazy(() => import("@/pages/invoices/InvoiceDetailEditor"));
const Suppliers = lazy(() => import("@/pages/Suppliers"));
const BalanceSheet = lazy(() => import("@/pages/reports/BalanceSheet"));
const BalanceTemplates = lazy(() => import("@/pages/reports/BalanceTemplates"));
const GeneralLedger = lazy(() => import("@/pages/reports/GeneralLedger"));
const JournalBook = lazy(() => import("@/pages/reports/JournalBook"));
const TrialBalance = lazy(() => import("@/pages/reports/TrialBalance"));
const ConsolidatedReports = lazy(() => import("@/pages/reports/ConsolidatedReports"));
const LibroIVARepercutido = lazy(() => import("@/pages/iva/LibroIVARepercutido"));
const LibroIVASoportado = lazy(() => import("@/pages/iva/LibroIVASoportado"));
const Modelo303 = lazy(() => import("@/pages/iva/Modelo303"));
const FiscalYearClosing = lazy(() => import("@/pages/accounting/FiscalYearClosing"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const StyleGuide = lazy(() => import("@/pages/examples/StyleGuide"));
const APLearningDashboard = lazy(() => import("@/pages/settings/APLearningDashboard"));
const OCRTemplates = lazy(() => import("@/pages/settings/OCRTemplates"));
const OCRTemplateMetrics = lazy(() => import("@/pages/settings/OCRTemplateMetrics"));
const OCRMetrics = lazy(() => import("@/pages/analytics/OCRMetrics"));
const OCRCacheMetrics = lazy(() => import("@/pages/analytics/OCRCacheMetrics"));
const SaltEdgeConnections = lazy(() => import("@/pages/treasury/SaltEdgeConnections"));
const OCRInbox = lazy(() => import("@/pages/digitization/OCRInbox"));
const Digitization = lazy(() => import("@/pages/Digitization"));
const OCRDetail = lazy(() => import("@/pages/digitization/OCRDetail"));
const HistoricalImport = lazy(() => import("@/pages/accounting/HistoricalImport"));
const HistoricalYears = lazy(() => import("@/pages/accounting/HistoricalYears"));
const FiscalYearDashboardPage = lazy(() => import("@/pages/accounting/FiscalYearDashboardPage"));
const FixedAssets = lazy(() => import("@/pages/accounting/FixedAssets"));
const AssetsRegister = lazy(() => import("@/pages/reports/AssetsRegister"));
const Provisions = lazy(() => import("@/pages/accounting/Provisions"));
const Accruals = lazy(() => import("@/pages/accounting/Accruals"));
const InventoryClosures = lazy(() => import("@/pages/accounting/InventoryClosures"));

/**
 * React Query Configuration
 * 
 * - refetchOnWindowFocus: true (detectar cambios al volver a la pestaña)
 * - retry: 1 (fallar rápido en errores, no esperar 3 reintentos)
 * - staleTime: 5 min (caché razonable para datos semi-estáticos)
 * - gcTime: 30 min (mantener datos en memoria para navegación rápida)
 * 
 * Los hooks individuales pueden sobrescribir estos defaults según su criticidad.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  },
});

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ✅ FASE 4.3: Registrar Service Worker en producción
  useEffect(() => {
    // Solo en producción (build final, no en dev)
    if (import.meta.env.PROD) {
      console.log('🚀 Registrando Service Worker...');
      registerServiceWorker();
    } else {
      console.log('ℹ️ Service Worker deshabilitado en desarrollo');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {/* 🔥 Activar shortcuts globales dentro del Router */}
        <GlobalShortcutsWrapper />
        
        <Suspense fallback={
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Cargando...</p>
            </div>
          </div>
        }>
          <Routes>
            <Route path="/login" element={session ? <Navigate to="/" /> : <Login />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route element={session ? <Layout /> : <Navigate to="/login" />}>
              <Route path="/" element={<Dashboard />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/received" element={<Navigate to="/invoices/inbox" replace />} />
            <Route path="/invoices/issued" element={<Navigate to="/invoices?tab=emitidas" replace />} />
            {/* === DIGITALIZACIÓN === */}
            <Route path="/digitalizacion" element={<Digitization />} />
            
            {/* Rutas legacy con redirects */}
            <Route path="/digitalizacion/inbox" element={<Navigate to="/digitalizacion?tab=inbox" replace />} />
            <Route path="/digitalizacion/depura" element={<Navigate to="/digitalizacion?tab=depura" replace />} />
            <Route path="/digitalizacion/papelera" element={<Navigate to="/digitalizacion?tab=papelera" replace />} />
            <Route path="/invoices/new-received" element={<Navigate to="/digitalizacion?tab=nueva" replace />} />
            <Route path="/invoices/bulk-upload" element={<Navigate to="/digitalizacion?tab=carga" replace />} />
            
            {/* OCR legacy routes */}
              <Route path="/digitalizacion/inbox-v2" element={<OCRInbox />} />
              <Route path="/digitalizacion/factura/:id" element={<OCRDetail />} />
            
            {/* Mantener ruta legacy por compatibilidad */}
            <Route path="/invoices/inbox" element={<Navigate to="/digitalizacion?tab=inbox" replace />} />
            <Route path="/invoices/received/:id/edit" element={<InvoiceDetailEditor />} />
            <Route path="/facturas/recibidas-ocr" element={<InvoicesReceivedOCR />} />
              <Route path="/facturas/nueva" element={<NewInvoiceReceived />} />
              <Route path="/facturas/nueva-ocr" element={<Navigate to="/invoices/new-received" replace />} />
              <Route path="/facturas/emitidas" element={<InvoicesIssued />} />
              <Route path="/facturas/emitidas/nueva" element={<NewInvoiceIssued />} />
              <Route path="/facturas/:id" element={<InvoiceDetail />} />
              <Route path="/proveedores" element={<Suppliers />} />
              <Route path="/banks" element={<Banks />} />
              <Route path="/reconciliation" element={<Reconciliation />} />
              <Route path="/treasury/reconciliation" element={<BankReconciliation />} />
              <Route path="/treasury/salt-edge-connections" element={<SaltEdgeConnections />} />
              <Route path="/journal" element={<JournalEntries />} />
              <Route path="/accounts" element={<ChartOfAccounts />} />
              <Route path="/pnl" element={<ProfitAndLoss />} />
              <Route path="/pnl/consolidado" element={<ProfitAndLossConsolidated />} />
              <Route path="/contabilidad/apuntes" element={<AccountingEntries />} />
              <Route path="/contabilidad/nuevo-asiento" element={<NewAccountingEntry />} />
              <Route path="/contabilidad/ejercicios-fiscales" element={<FiscalYears />} />
              <Route path="/contabilidad/importacion-historica" element={<HistoricalImport />} />
              <Route path="/contabilidad/ejercicios-historicos" element={<HistoricalYears />} />
              <Route path="/contabilidad/ejercicios" element={<HistoricalYears />} />
              <Route path="/contabilidad/ejercicios/:id/dashboard" element={<FiscalYearDashboardPage />} />
              <Route path="/contabilidad/activos-fijos" element={<FixedAssets />} />
              <Route path="/contabilidad/periodificaciones" element={<Accruals />} />
              <Route path="/contabilidad/provisiones" element={<Provisions />} />
              <Route path="/contabilidad/existencias" element={<InventoryClosures />} />
              <Route path="/reportes/libro-bienes" element={<AssetsRegister />} />
                <Route path="/reportes/balance" element={<BalanceSheet />} />
                <Route path="/reportes/balance-templates" element={<BalanceTemplates />} />
              <Route path="/reportes/mayor" element={<GeneralLedger />} />
              <Route path="/reportes/diario" element={<JournalBook />} />
              <Route path="/reportes/sumas-y-saldos" element={<TrialBalance />} />
              <Route path="/reportes/consolidado" element={<ConsolidatedReports />} />
              <Route path="/iva/expedidas" element={<LibroIVARepercutido />} />
              <Route path="/iva/recibidas" element={<LibroIVASoportado />} />
              <Route path="/iva/modelo-303" element={<Modelo303 />} />
              <Route path="/contabilidad/cierre-ejercicio" element={<FiscalYearClosing />} />
              <Route path="/settings" element={<Dashboard />} />
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
              <Route path="/admin/centros/:id" element={<AdminRoute><CentreDetail /></AdminRoute>} />
              <Route path="/admin/companies/:id" element={<AdminRoute><CompanyDetail /></AdminRoute>} />
              <Route path="/admin/franchisees/:id" element={<AdminRoute><FranchiseeDetail /></AdminRoute>} />
              <Route path="/admin/pl-rules" element={<AdminRoute><PLRulesManagement /></AdminRoute>} />
              <Route path="/admin/demo-data" element={<AdminRoute><DemoData /></AdminRoute>} />
              <Route path="/admin-debug" element={<AdminDebug />} />
              <Route path="/mi-empresa/mis-datos" element={<CompanyConfiguration />} />
              <Route path="/notificaciones" element={<Notifications />} />
              <Route path="/configuracion/ap-learning" element={<APLearningDashboard />} />
            <Route path="/configuracion/ocr-templates" element={<OCRTemplates />} />
            <Route path="/configuracion/ocr-templates/metrics" element={<OCRTemplateMetrics />} />
            <Route path="/analytics/ocr" element={<OCRMetrics />} />
            <Route path="/analytics/ocr-cache" element={<OCRCacheMetrics />} />
              <Route path="/style-guide" element={<StyleGuide />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        
        {/* 🔥 Sprint 3: Keyboard Shortcuts & Command Palette */}
        <ShortcutHelpDialog />
        <CommandPalette />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
