// ============================================================================
// HOOK: Entry Integrity
// Gestión de integridad y auditoría de asientos
// ============================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  calculateEntryHash, 
  validateEntryChain, 
  lockEntry, 
  getEntryAuditLog,
  logIncident,
  getUnresolvedIncidents
} from '@/lib/accounting/integrity/entryHashService';
import { toast } from 'sonner';

export function useCalculateEntryHash() {
  return useMutation({
    mutationFn: (entryId: string) => calculateEntryHash(entryId),
    onSuccess: (hash) => {
      toast.success('Hash calculado', {
        description: `Hash: ${hash.substring(0, 16)}...`
      });
    },
    onError: (error: Error) => {
      toast.error('Error calculando hash', {
        description: error.message
      });
    }
  });
}

export function useValidateEntryChain(centroCode?: string, fiscalYearId?: string) {
  return useQuery({
    queryKey: ['entry-chain', centroCode, fiscalYearId],
    queryFn: () => validateEntryChain(centroCode!, fiscalYearId!),
    enabled: !!centroCode && !!fiscalYearId
  });
}

export function useLockEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason?: string }) => 
      lockEntry(entryId, reason),
    onSuccess: (_, variables) => {
      toast.success('Asiento bloqueado', {
        description: 'El asiento es ahora inmutable'
      });
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entry', variables.entryId] });
    },
    onError: (error: Error) => {
      toast.error('Error bloqueando asiento', {
        description: error.message
      });
    }
  });
}

export function useEntryAuditLog(entryId?: string) {
  return useQuery({
    queryKey: ['entry-audit-log', entryId],
    queryFn: () => getEntryAuditLog(entryId!),
    enabled: !!entryId
  });
}

export function useLogIncident() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: logIncident,
    onSuccess: () => {
      toast.success('Incidente registrado');
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
    onError: (error: Error) => {
      toast.error('Error registrando incidente', {
        description: error.message
      });
    }
  });
}

export function useUnresolvedIncidents() {
  return useQuery({
    queryKey: ['incidents', 'unresolved'],
    queryFn: getUnresolvedIncidents
  });
}
