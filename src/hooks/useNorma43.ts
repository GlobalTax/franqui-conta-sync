import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Norma43File {
  id: string;
  centro_code: string;
  bank_account_id: string;
  file_name: string;
  file_size: number;
  import_date: string;
  date_from: string | null;
  date_to: string | null;
  initial_balance: number | null;
  final_balance: number | null;
  total_debits: number | null;
  total_credits: number | null;
  transactions_count: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
}

export function useNorma43Files(centroCode?: string, bankAccountId?: string) {
  return useQuery({
    queryKey: ['norma43-files', centroCode, bankAccountId],
    queryFn: async () => {
      let query = supabase
        .from('norma43_files' as any)
        .select('*')
        .order('import_date', { ascending: false });

      if (centroCode) {
        query = query.eq('centro_code', centroCode);
      }
      if (bankAccountId) {
        query = query.eq('bank_account_id', bankAccountId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any as Norma43File[];
    },
    enabled: !!centroCode,
  });
}

export function useParseNorma43() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      centroCode,
      bankAccountId,
      fileName,
      fileContent,
    }: {
      centroCode: string;
      bankAccountId: string;
      fileName: string;
      fileContent: string;
    }) => {
      // REFACTORED: Usar caso de uso ImportNorma43File
      const { ImportNorma43FileUseCase } = await import('@/domain/banking/use-cases/ImportNorma43File');
      const { importBankTransactions } = await import('@/infrastructure/persistence/supabase/queries/BankQueries');
      
      const useCase = new ImportNorma43FileUseCase();
      const result = useCase.execute({
        bankAccountId,
        centroCode,
        fileName,
        fileContent,
      });

      if (!result.success) {
        throw new Error(result.errors.join(', ') || 'Error al parsear archivo Norma43');
      }

      // Persistir transacciones en base de datos
      await importBankTransactions(result.transactions);

      return {
        success: true,
        transactions_count: result.transactionsImported,
        total_debits: result.totalDebits,
        total_credits: result.totalCredits,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['norma43-files'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success(
        `Archivo Norma43 importado: ${data.transactions_count} transacciones`,
        {
          description: `Débitos: ${data.total_debits}€ | Créditos: ${data.total_credits}€`,
        }
      );
    },
    onError: (error: any) => {
      toast.error('Error al importar Norma43', {
        description: error.message,
      });
    },
  });
}

export function useAutoMatchWithRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bankAccountId,
      centroCode,
      limit = 100,
    }: {
      bankAccountId: string;
      centroCode: string;
      limit?: number;
    }) => {
      const { data, error } = await supabase.rpc('auto_match_with_rules' as any, {
        p_bank_account_id: bankAccountId,
        p_centro_code: centroCode,
        p_limit: limit,
      });

      if (error) throw error;
      
      const result = data as any;
      if (!result.success) {
        throw new Error(result.error || 'Error en auto-matching');
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast.success(`${data.matches_count} transacciones conciliadas automáticamente`);
    },
    onError: (error: any) => {
      toast.error('Error en conciliación automática', {
        description: error.message,
      });
    },
  });
}

export function useBulkReconciliationAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionIds,
      action,
      notes,
    }: {
      transactionIds: string[];
      action: 'confirm' | 'reject' | 'unmatch';
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('bulk_reconciliation_action' as any, {
        p_transaction_ids: transactionIds,
        p_action: action,
        p_notes: notes,
      });

      if (error) throw error;
      
      const result = data as any;
      if (!result.success) {
        throw new Error(result.error || 'Error en acción masiva');
      }

      return result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      
      const actionText = {
        confirm: 'confirmadas',
        reject: 'rechazadas',
        unmatch: 'desmarcadas',
      }[variables.action];
      
      toast.success(`${data.affected_count} transacciones ${actionText}`);
    },
    onError: (error: any) => {
      toast.error('Error en acción masiva', {
        description: error.message,
      });
    },
  });
}
