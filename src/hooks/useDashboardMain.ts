import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

export interface DashboardMainData {
  dailySales: number;
  laborCost: number;
  netMarginPercent: number;
  salesByChannel: {
    inStore: number;
    driveThru: number;
    delivery: number;
    kiosk: number;
  };
  bankBalance: number;
  cashAudit: {
    expected: number;
    actual: number;
    difference: number;
    percentDiff: number;
  } | null;
  incidents: {
    overdueInvoices: number;
    pendingClosures: number;
    auditDifferences: number;
    unreconciledTransactions: number;
    pendingApprovals: number;
  };
  ivaSummary: {
    repercutido: number;
    soportado: number;
    toPay: number;
  };
}

export function useDashboardMain(selectedView: { type: 'all' | 'company' | 'centre'; id: string; code?: string; name: string } | null) {
  return useQuery({
    queryKey: ['dashboard-main', selectedView],
    queryFn: async (): Promise<DashboardMainData> => {
      if (!selectedView) {
        throw new Error("No view selected");
      }

      const today = new Date();
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      
      let centroCodes: string[] = [];

      if (selectedView.type === 'all') {
        const { data: centres } = await supabase
          .from('centres')
          .select('codigo');
        centroCodes = centres?.map(c => c.codigo) || [];
      } else if (selectedView.type === 'company' && selectedView.id) {
        const { data: centres } = await supabase
          .from('centres')
          .select('codigo')
          .eq('company_id', selectedView.id);
        centroCodes = centres?.map(c => c.codigo) || [];
      } else if (selectedView.code) {
        centroCodes = [selectedView.code];
      }

      if (centroCodes.length === 0) {
        throw new Error("No centres found");
      }

      // Daily sales from today's closure
      const { data: todayClosure } = await supabase
        .from('daily_closures')
        .select('*')
        .in('centro_code', centroCodes)
        .eq('closure_date', format(today, 'yyyy-MM-dd'))
        .maybeSingle();

      const dailySales = todayClosure?.total_sales || 0;
      const salesByChannel = {
        inStore: todayClosure?.sales_in_store || 0,
        driveThru: todayClosure?.sales_drive_thru || 0,
        delivery: todayClosure?.sales_delivery || 0,
        kiosk: todayClosure?.sales_kiosk || 0,
      };

      // Cash audit from today
      const cashAudit = todayClosure ? {
        expected: todayClosure.expected_cash || 0,
        actual: todayClosure.actual_cash || 0,
        difference: todayClosure.cash_difference || 0,
        percentDiff: todayClosure.expected_cash > 0 
          ? ((todayClosure.cash_difference || 0) / todayClosure.expected_cash) * 100 
          : 0,
      } : null;

      // Labor cost (estimate 15% of monthly sales)
      const { data: monthClosures } = await supabase
        .from('daily_closures')
        .select('total_sales')
        .in('centro_code', centroCodes)
        .gte('closure_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('closure_date', format(monthEnd, 'yyyy-MM-dd'));

      const monthlySales = monthClosures?.reduce((sum, c) => sum + (c.total_sales || 0), 0) || 0;
      const laborCost = monthlySales * 0.15;

      // Net margin (simplified: sales - 30% food - 15% labor)
      const foodCost = monthlySales * 0.30;
      const netMargin = monthlySales - foodCost - laborCost;
      const netMarginPercent = monthlySales > 0 ? (netMargin / monthlySales) * 100 : 0;

      // Bank balance
      const { data: bankAccounts } = await supabase
        .from('bank_accounts')
        .select('current_balance')
        .in('centro_code', centroCodes)
        .eq('active', true);

      const bankBalance = bankAccounts?.reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0;

      // Incidents
      const { data: overdueInvoices } = await supabase
        .from('invoices_received')
        .select('id')
        .in('centro_code', centroCodes)
        .eq('status', 'pending')
        .lt('due_date', format(today, 'yyyy-MM-dd'));

      const { data: pendingClosures } = await supabase
        .from('daily_closures')
        .select('id')
        .in('centro_code', centroCodes)
        .eq('status', 'draft')
        .lt('closure_date', format(today, 'yyyy-MM-dd'));

      const { data: unreconciledTxs } = await supabase
        .from('bank_transactions')
        .select('id')
        .eq('status', 'pending')
        .in('bank_account_id', 
          (await supabase
            .from('bank_accounts')
            .select('id')
            .in('centro_code', centroCodes)
            .then(r => r.data?.map(b => b.id) || [])
          )
        );

      const { data: pendingApprovals } = await supabase
        .from('invoices_received')
        .select('id')
        .in('centro_code', centroCodes)
        .eq('approval_status', 'pending');

      const incidents = {
        overdueInvoices: overdueInvoices?.length || 0,
        pendingClosures: pendingClosures?.length || 0,
        auditDifferences: cashAudit && Math.abs(cashAudit.percentDiff) > 2 ? 1 : 0,
        unreconciledTransactions: unreconciledTxs?.length || 0,
        pendingApprovals: pendingApprovals?.length || 0,
      };

      // IVA Summary
      const { data: issuedInvoices } = await supabase
        .from('invoices_issued')
        .select('tax_total')
        .in('centro_code', centroCodes)
        .gte('invoice_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('invoice_date', format(monthEnd, 'yyyy-MM-dd'));

      const { data: receivedInvoices } = await supabase
        .from('invoices_received')
        .select('tax_total')
        .in('centro_code', centroCodes)
        .gte('invoice_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('invoice_date', format(monthEnd, 'yyyy-MM-dd'));

      const repercutido = issuedInvoices?.reduce((sum, inv) => sum + (inv.tax_total || 0), 0) || 0;
      const soportado = receivedInvoices?.reduce((sum, inv) => sum + (inv.tax_total || 0), 0) || 0;
      const toPay = repercutido - soportado;

      return {
        dailySales,
        laborCost,
        netMarginPercent,
        salesByChannel,
        bankBalance,
        cashAudit,
        incidents,
        ivaSummary: {
          repercutido,
          soportado,
          toPay,
        },
      };
    },
    enabled: !!selectedView,
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000, // Solo cada 2 min si tiene foco
  });
}
