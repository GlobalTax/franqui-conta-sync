import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useView } from "@/contexts/ViewContext";

export interface FixedAsset {
  id: string;
  asset_code: string;
  description: string;
  account_code: string;
  acquisition_date: string;
  acquisition_value: number;
  residual_value: number | null;
  useful_life_years: number;
  depreciation_method: string;
  accumulated_depreciation: number | null;
  current_value: number | null;
  status: string;
  disposal_date: string | null;
  disposal_value: number | null;
  location: string | null;
  supplier_id: string | null;
  invoice_ref: string | null;
  notes: string | null;
  centro_code: string;
  created_at: string;
  updated_at: string;
}

export function useFixedAssets(status?: string) {
  const { selectedView } = useView();
  const centroCode = selectedView?.type === 'centre' ? selectedView.id : undefined;

  return useQuery({
    queryKey: ["fixed-assets", centroCode, status],
    queryFn: async () => {
      if (!centroCode) throw new Error("No centro seleccionado");

      let query = supabase
        .from("fixed_assets")
        .select("*")
        .eq("centro_code", centroCode)
        .order("created_at", { ascending: false });

      if (status && status !== 'all') {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as FixedAsset[];
    },
    enabled: !!centroCode,
  });
}

export function useFixedAsset(assetId?: string) {
  return useQuery({
    queryKey: ["fixed-asset", assetId],
    queryFn: async () => {
      if (!assetId) throw new Error("Asset ID requerido");

      const { data, error } = await supabase
        .from("fixed_assets")
        .select("*")
        .eq("id", assetId)
        .single();

      if (error) throw error;
      return data as FixedAsset;
    },
    enabled: !!assetId,
  });
}

export function useCreateFixedAsset() {
  const queryClient = useQueryClient();
  const { selectedView } = useView();

  return useMutation({
    mutationFn: async (asset: Omit<FixedAsset, "id" | "created_at" | "updated_at" | "accumulated_depreciation" | "current_value" | "status" | "disposal_date" | "disposal_value">) => {
      const centroCode = selectedView?.type === 'centre' ? selectedView.id : undefined;
      if (!centroCode) throw new Error("No centro seleccionado");

      // Generar código de activo
      const { data: lastAsset } = await supabase
        .from("fixed_assets")
        .select("asset_code")
        .eq("centro_code", centroCode)
        .order("asset_code", { ascending: false })
        .limit(1)
        .single();

      let nextNumber = 1;
      if (lastAsset?.asset_code) {
        const match = lastAsset.asset_code.match(/AF-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const asset_code = `AF-${nextNumber.toString().padStart(3, '0')}`;

      const { data, error } = await supabase
        .from("fixed_assets")
        .insert({
          ...asset,
          asset_code,
          centro_code: centroCode,
          status: 'active',
          accumulated_depreciation: 0,
          current_value: asset.acquisition_value,
        })
        .select()
        .single();

      if (error) throw error;
      return data as FixedAsset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      toast.success("Activo fijo creado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear activo fijo");
    },
  });
}

export function useUpdateFixedAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FixedAsset> & { id: string }) => {
      const { data, error } = await supabase
        .from("fixed_assets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as FixedAsset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      queryClient.invalidateQueries({ queryKey: ["fixed-asset"] });
      toast.success("Activo fijo actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar activo fijo");
    },
  });
}

export function useDeleteFixedAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase
        .from("fixed_assets")
        .delete()
        .eq("id", assetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      toast.success("Activo fijo eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar activo fijo");
    },
  });
}

export function useDisposeFixedAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, disposal_date, disposal_value, notes }: { id: string; disposal_date: string; disposal_value: number; notes?: string }) => {
      const { data, error } = await supabase
        .from("fixed_assets")
        .update({
          status: 'disposed',
          disposal_date,
          disposal_value,
          notes,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as FixedAsset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] });
      toast.success("Activo dado de baja correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al dar de baja el activo");
    },
  });
}
