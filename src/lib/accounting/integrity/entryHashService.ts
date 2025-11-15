// ============================================================================
// ENTRY HASH SERVICE - Gestión de hashing e integridad
// Cumplimiento RD 1007/2023
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

/**
 * Calcula el hash SHA-256 de un asiento contable
 */
export async function calculateEntryHash(entryId: string): Promise<string> {
  const { data, error } = await supabase.rpc('calculate_entry_hash' as any, {
    entry_id: entryId
  }) as { data: string; error: any };

  if (error) throw new Error(`Error calculando hash: ${error.message}`);
  return data;
}

/**
 * Valida la cadena de hashes de un ejercicio
 */
export async function validateEntryChain(
  centroCode: string,
  fiscalYearId: string
): Promise<{
  is_valid: boolean;
  broken_at: number;
  total_entries: number;
  message: string;
}> {
  const { data, error } = await supabase.rpc('validate_entry_chain' as any, {
    centro_code_param: centroCode,
    fiscal_year_id_param: fiscalYearId
  }) as { data: any[]; error: any };

  if (error) throw new Error(`Error validando cadena: ${error.message}`);
  return data[0];
}

/**
 * Bloquea un asiento para impedir modificaciones
 */
export async function lockEntry(
  entryId: string,
  reason?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('lock_accounting_entry' as any, {
    entry_id_param: entryId,
    reason_param: reason || 'Asiento bloqueado para cumplimiento normativo'
  }) as { data: boolean; error: any };

  if (error) throw new Error(`Error bloqueando asiento: ${error.message}`);
  return data;
}

/**
 * Obtiene el log de auditoría de un asiento
 */
export async function getEntryAuditLog(entryId: string) {
  const { data, error } = await supabase
    .from('accounting_entry_audit_log' as any)
    .select('*')
    .eq('entry_id', entryId)
    .order('timestamp', { ascending: false });

  if (error) throw new Error(`Error obteniendo log: ${error.message}`);
  return data;
}

/**
 * Registra un incidente en el libro de incidencias
 */
export async function logIncident(incident: {
  incident_type: 'modification_attempt' | 'unauthorized_access' | 'data_integrity_failure' | 'backup_failure' | 'system_error' | 'manual_override' | 'regulatory_report';
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  entry_id?: string;
  technical_details?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from('accounting_incident_log' as any)
    .insert([{
      ...incident,
      user_id: (await supabase.auth.getUser()).data.user?.id
    }] as any)
    .select()
    .single();

  if (error) throw new Error(`Error registrando incidente: ${error.message}`);
  return data;
}

/**
 * Obtiene incidentes no resueltos
 */
export async function getUnresolvedIncidents() {
  const { data, error } = await supabase
    .from('accounting_incident_log' as any)
    .select('*')
    .eq('resolved', false)
    .order('incident_date', { ascending: false });

  if (error) throw new Error(`Error obteniendo incidentes: ${error.message}`);
  return data;
}
