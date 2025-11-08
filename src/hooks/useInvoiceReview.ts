import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AssignCentreParams {
  invoiceId: string;
  centroCode: string;
}

export function useInvoiceReview(invoiceId: string | null) {
  const queryClient = useQueryClient();

  const assignCentreMutation = useMutation({
    mutationFn: async ({ invoiceId, centroCode }: AssignCentreParams) => {
      const { error } = await supabase
        .from("invoices_received")
        .update({ centro_code: centroCode })
        .eq("id", invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices_received"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoiceId] });
      toast.success("Centro asignado correctamente");
    },
    onError: (error: any) => {
      console.error("Error assigning centre:", error);
      toast.error(`Error al asignar centro: ${error.message}`);
    },
  });

  const generateEntryMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      // Call the edge function to generate accounting entry from invoice
      const { data, error } = await supabase.functions.invoke(
        "generate-entry-from-invoice",
        {
          body: { invoiceId, invoiceType: "received" },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices_received"] });
      queryClient.invalidateQueries({ queryKey: ["accounting_entries"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoiceId] });
      toast.success("Asiento contable generado correctamente");
    },
    onError: (error: any) => {
      console.error("Error generating entry:", error);
      toast.error(
        `Error al generar asiento: ${error.message || "Error desconocido"}`
      );
    },
  });

  return {
    assignCentre: assignCentreMutation.mutate,
    generateEntry: generateEntryMutation.mutate,
    isLoading: assignCentreMutation.isPending || generateEntryMutation.isPending,
  };
}
