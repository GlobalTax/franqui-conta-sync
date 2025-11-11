import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncOptions {
  connection_id: string;
  sync_accounts?: boolean;
  sync_transactions?: boolean;
  sync_balances?: boolean;
  transaction_days?: number;
}

export const usePontoSync = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: SyncOptions) => {
      const { data, error } = await supabase.functions.invoke("ponto-sync", {
        body: options,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ponto-connections"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      
      toast.success(
        `Sincronización completada: ${data.accounts_synced} cuentas, ${data.transactions_synced} transacciones`
      );
    },
    onError: (error) => {
      toast.error("Error en sincronización Ponto");
      console.error(error);
    },
  });
};
