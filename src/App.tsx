import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Invoices from "@/pages/Invoices";
import Banks from "@/pages/Banks";
import Reconciliation from "@/pages/Reconciliation";
import BankReconciliation from "@/pages/treasury/BankReconciliation";
import JournalEntries from "@/pages/JournalEntries";
import ChartOfAccounts from "@/pages/ChartOfAccounts";
import ProfitAndLoss from "@/pages/ProfitAndLoss";
import NotFound from "@/pages/NotFound";
import Admin from "@/pages/Admin";
import CentreDetail from "@/pages/admin/CentreDetail";
import CompanyDetail from "@/pages/admin/CompanyDetail";
import FranchiseeDetail from "@/pages/admin/FranchiseeDetail";
import AdminDebug from "@/pages/admin/AdminDebug";
import PLRulesManagement from "@/pages/admin/PLRulesManagement";
import AcceptInvite from "@/pages/AcceptInvite";
import AccountingEntries from "@/pages/accounting/AccountingEntries";
import NewAccountingEntry from "@/pages/accounting/NewAccountingEntry";
import CompanyConfiguration from "@/pages/admin/CompanyConfiguration";
import NewInvoiceReceived from "@/pages/invoices/NewInvoiceReceived";
import InvoicesReceivedOCR from "@/pages/invoices/InvoicesReceivedOCR";
import NewInvoiceWithOCR from "@/pages/invoices/NewInvoiceWithOCR";
import InvoicesIssued from "@/pages/invoices/InvoicesIssued";
import NewInvoiceIssued from "@/pages/invoices/NewInvoiceIssued";
import InvoiceDetail from "@/pages/invoices/InvoiceDetail";
import InvoicesInbox from "@/pages/invoices/InvoicesInbox";
import Suppliers from "@/pages/Suppliers";
import BalanceSheet from "@/pages/reports/BalanceSheet";
import GeneralLedger from "@/pages/reports/GeneralLedger";
import JournalBook from "@/pages/reports/JournalBook";
import TrialBalance from "@/pages/reports/TrialBalance";
import ConsolidatedReports from "@/pages/reports/ConsolidatedReports";
import LibroIVARepercutido from "@/pages/iva/LibroIVARepercutido";
import LibroIVASoportado from "@/pages/iva/LibroIVASoportado";
import Modelo303 from "@/pages/iva/Modelo303";
import FiscalYearClosing from "@/pages/accounting/FiscalYearClosing";
import Notifications from "@/pages/Notifications";
import StyleGuide from "@/pages/examples/StyleGuide";
import { AdminRoute } from "@/components/AdminRoute";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
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
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route
            path="/login"
            element={session ? <Navigate to="/" /> : <Login />}
          />
          <Route
            path="/accept-invite"
            element={<AcceptInvite />}
          />
          <Route
            element={session ? <Layout /> : <Navigate to="/login" />}
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/inbox" element={<InvoicesInbox />} />
            <Route path="/facturas/recibidas-ocr" element={<InvoicesReceivedOCR />} />
            <Route path="/facturas/nueva" element={<NewInvoiceReceived />} />
            <Route path="/facturas/nueva-ocr" element={<NewInvoiceWithOCR />} />
            <Route path="/facturas/emitidas" element={<InvoicesIssued />} />
            <Route path="/facturas/emitidas/nueva" element={<NewInvoiceIssued />} />
            <Route path="/facturas/:id" element={<InvoiceDetail />} />
            <Route path="/proveedores" element={<Suppliers />} />
            <Route path="/banks" element={<Banks />} />
            <Route path="/reconciliation" element={<Reconciliation />} />
            <Route path="/treasury/reconciliation" element={<BankReconciliation />} />
            <Route path="/journal" element={<JournalEntries />} />
            <Route path="/accounts" element={<ChartOfAccounts />} />
            <Route path="/pnl" element={<ProfitAndLoss />} />
            <Route path="/contabilidad/apuntes" element={<AccountingEntries />} />
            <Route path="/contabilidad/nuevo-asiento" element={<NewAccountingEntry />} />
            <Route path="/reportes/balance" element={<BalanceSheet />} />
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
            <Route path="/admin-debug" element={<AdminDebug />} />
            <Route path="/mi-empresa/mis-datos" element={<CompanyConfiguration />} />
            <Route path="/notificaciones" element={<Notifications />} />
            
            {/* Style Guide */}
            <Route path="/style-guide" element={<StyleGuide />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;