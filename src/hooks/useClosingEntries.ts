import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export interface ClosingEntry {
  entry_type: string;
  account_code: string;
  account_name: string;
  movement_type: string;
  amount: number;
}

export interface OpeningBalance {
  account_code: string;
  account_name: string;
  balance: number;
  movement_type: string;
}

export const useGenerateClosingEntries = (
  centroCode: string | undefined,
  fiscalYearId: string | undefined,
  closingDate: string | undefined
) => {
  return useQuery({
    queryKey: ["closing-entries", centroCode, fiscalYearId, closingDate],
    queryFn: async () => {
      if (!centroCode || !fiscalYearId || !closingDate) {
        return [];
      }

      const { data, error } = await supabase.rpc("generate_closing_entries", {
        p_centro_code: centroCode,
        p_fiscal_year_id: fiscalYearId,
        p_closing_date: closingDate,
      });

      if (error) throw error;
      return (data || []) as ClosingEntry[];
    },
    enabled: !!centroCode && !!fiscalYearId && !!closingDate,
  });
};

export const useGetOpeningBalances = (
  centroCode: string | undefined,
  fiscalYearId: string | undefined
) => {
  return useQuery({
    queryKey: ["opening-balances", centroCode, fiscalYearId],
    queryFn: async () => {
      if (!centroCode || !fiscalYearId) {
        return [];
      }

      const { data, error } = await supabase.rpc("get_opening_balances", {
        p_centro_code: centroCode,
        p_fiscal_year_id: fiscalYearId,
      });

      if (error) throw error;
      return (data || []) as OpeningBalance[];
    },
    enabled: !!centroCode && !!fiscalYearId,
  });
};

export const useCloseFiscalYear = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fiscalYearId,
      closingDate,
    }: {
      fiscalYearId: string;
      closingDate: string;
    }) => {
      // Update fiscal year status to closed
      const { error } = await supabase
        .from("fiscal_years" as any)
        .update({
          status: "closed",
          closing_date: closingDate,
          closed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", fiscalYearId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-years"] });
      toast({
        title: "Ejercicio cerrado",
        description: "El ejercicio fiscal ha sido cerrado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al cerrar ejercicio",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
