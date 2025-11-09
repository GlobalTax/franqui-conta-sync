import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UnmappedAccount } from "@/types/profit-loss";

interface UseUnmappedAccountsParams {
  templateCode: string;
  companyId?: string;
  centroCode?: string;
  periodMonth?: string;
}

/**
 * Hook para detectar cuentas PGC sin mapear a rubros
 * Útil para validación y auditoría del sistema de reglas
 */
export const useUnmappedAccounts = ({
  templateCode,
  companyId,
  centroCode,
  periodMonth,
}: UseUnmappedAccountsParams) => {
  return useQuery({
    queryKey: ["unmapped-accounts", templateCode, companyId, centroCode, periodMonth],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("unmapped_accounts", {
        p_template_code: templateCode,
        p_company_id: companyId || null,
        p_centro_code: centroCode || null,
        p_period_month: periodMonth || null,
      });

      if (error) throw error;
      return (data || []) as UnmappedAccount[];
    },
    enabled: !!templateCode && (!!companyId || !!centroCode),
  });
};

/**
 * Hook para obtener estadísticas de cuentas sin mapear
 */
export const useUnmappedAccountsStats = ({
  templateCode,
  companyId,
  centroCode,
  periodMonth,
}: UseUnmappedAccountsParams) => {
  const { data: unmappedAccounts, ...query } = useUnmappedAccounts({
    templateCode,
    companyId,
    centroCode,
    periodMonth,
  });

  const stats = {
    totalAccounts: unmappedAccounts?.length || 0,
    totalAmount: unmappedAccounts?.reduce((sum, acc) => sum + Math.abs(acc.amount), 0) || 0,
    debitAccounts: unmappedAccounts?.filter((acc) => acc.amount > 0).length || 0,
    creditAccounts: unmappedAccounts?.filter((acc) => acc.amount < 0).length || 0,
  };

  return {
    ...query,
    data: unmappedAccounts,
    stats,
  };
};
