import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ImportModule = 'diario' | 'sumas_saldos' | 'iva_emitidas' | 'iva_recibidas' | 'norma43';
export type ImportSource = 'csv' | 'xlsx' | 'norma43' | 'api';
export type ImportStatus = 'pending' | 'staging' | 'posting' | 'completed' | 'error';

export interface ImportRun {
  id: string;
  module: ImportModule;
  source: ImportSource;
  filename: string | null;
  centro_code: string | null;
  started_at: string;
  finished_at: string | null;
  status: ImportStatus;
  stats: {
    rows_total?: number;
    rows_inserted?: number;
    rows_error?: number;
    rows_ok?: number;
    rows_skipped?: number;
    duplicates?: number;
    entries_created?: number;
    entries_updated?: number;
  };
  error_log: any;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useImportHistory(module?: ImportModule, limit = 50) {
  return useQuery({
    queryKey: ['import-runs', module],
    queryFn: async () => {
      let query = supabase
        .from('import_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (module) {
        query = query.eq('module', module);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ImportRun[];
    },
  });
}

export function useStartImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      module,
      source,
      filename,
      centroCode,
    }: {
      module: ImportModule;
      source: ImportSource;
      filename: string;
      centroCode?: string;
    }) => {
      const { data, error } = await supabase.rpc('start_import', {
        p_module: module,
        p_source: source,
        p_filename: filename,
        p_centro_code: centroCode || null,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-runs'] });
      toast.success('Importación iniciada');
    },
    onError: (error: Error) => {
      toast.error(`Error al iniciar importación: ${error.message}`);
    },
  });
}

export function useStageDiarioRows() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      importRunId,
      rows,
    }: {
      importRunId: string;
      rows: any[];
    }) => {
      const { data, error } = await supabase.rpc('stage_diario_rows', {
        p_import_run_id: importRunId,
        p_rows: rows as any,
      });

      if (error) throw error;
      return data as { rows_inserted: number; validation_errors: any[] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['import-runs'] });
      if (data.validation_errors.length > 0) {
        toast.warning(`${data.rows_inserted} filas procesadas, ${data.validation_errors.length} errores`);
      } else {
        toast.success(`${data.rows_inserted} filas validadas correctamente`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Error en staging: ${error.message}`);
    },
  });
}

export function usePostDiarioImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importRunId: string) => {
      const { data, error } = await supabase.rpc('post_diario_import', {
        p_import_run_id: importRunId,
      });

      if (error) throw error;
      return data as { entries_created: number; entries_updated: number; errors: any[] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['import-runs'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-entries'] });
      toast.success(`Importación completada: ${data.entries_created} asientos creados`);
    },
    onError: (error: Error) => {
      toast.error(`Error al contabilizar: ${error.message}`);
    },
  });
}

export function useImportRun(importRunId: string | null) {
  return useQuery({
    queryKey: ['import-run', importRunId],
    queryFn: async () => {
      if (!importRunId) return null;

      const { data, error } = await supabase
        .from('import_runs')
        .select('*')
        .eq('id', importRunId)
        .single();

      if (error) throw error;
      return data as ImportRun;
    },
    enabled: !!importRunId,
    refetchInterval: (query) => {
      // Auto-refresh while in progress
      const data = query.state.data;
      if (data && ['pending', 'staging', 'posting'].includes(data.status)) {
        return 2000;
      }
      return false;
    },
  });
}
