import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganization } from './useOrganization';

export interface ComplianceAlert {
  id: string;
  alert_type: 'missing_hash' | 'invalid_hash' | 'chain_broken' | 'unsigned_invoice' | 
               'unsent_to_aeat' | 'aeat_error' | 'duplicate_invoice';
  severity: 'low' | 'medium' | 'high' | 'critical';
  invoice_type: 'issued' | 'received';
  invoice_id: string;
  centro_code: string;
  title: string;
  description: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  metadata: any;
  created_at: string;
}

export function useComplianceAlerts(filters?: {
  centro_code?: string;
  resolved?: boolean;
  severity?: string;
}) {
  const { currentMembership } = useOrganization();

  return useQuery({
    queryKey: ['compliance-alerts', filters],
    queryFn: async () => {
      let query = supabase
        .from('compliance_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.centro_code) {
        query = query.eq('centro_code', filters.centro_code);
      }

      if (filters?.resolved !== undefined) {
        query = query.eq('resolved', filters.resolved);
      }

      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ComplianceAlert[];
    },
  });
}

export function useResolveComplianceAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      alert_id: string;
      resolution_notes: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('compliance_alerts')
        .update({
          resolved: true,
          resolved_by: userData.user.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: params.resolution_notes,
        })
        .eq('id', params.alert_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-alerts'] });
      toast.success('Alerta resuelta correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error resolviendo alerta: ${error.message}`);
    },
  });
}

export function useCreateComplianceAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      alert_type: ComplianceAlert['alert_type'];
      severity: ComplianceAlert['severity'];
      invoice_type: 'issued' | 'received';
      invoice_id: string;
      centro_code: string;
      title: string;
      description: string;
      metadata?: any;
    }) => {
      const { data, error } = await supabase
        .from('compliance_alerts')
        .insert(params)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-alerts'] });
      toast.info('Nueva alerta de cumplimiento creada');
    },
    onError: (error: Error) => {
      console.error('Error creating compliance alert:', error);
    },
  });
}

export function useCheckInvoiceCompliance() {
  const createAlert = useCreateComplianceAlert();

  return useMutation({
    mutationFn: async (params: {
      invoice_id: string;
      invoice_type: 'issued' | 'received';
      centro_code: string;
    }) => {
      const issues: string[] = [];

      // Check if invoice has hash
      const invoiceTable = params.invoice_type === 'issued' ? 'invoices_issued' : 'invoices_received';
      const { data: invoice } = await supabase
        .from(invoiceTable)
        .select('*')
        .eq('id', params.invoice_id)
        .single();

      if (!invoice?.verifactu_hash) {
        await createAlert.mutateAsync({
          alert_type: 'missing_hash',
          severity: 'high',
          invoice_type: params.invoice_type,
          invoice_id: params.invoice_id,
          centro_code: params.centro_code,
          title: 'Factura sin hash Verifactu',
          description: `La factura ${invoice?.invoice_number || params.invoice_id} no tiene hash generado`,
        });
        issues.push('missing_hash');
      }

      // Check if invoice is signed (for issued invoices only)
      if (params.invoice_type === 'issued') {
        const verifactuSigned = (invoice as any)?.verifactu_signed;
        if (!verifactuSigned) {
          await createAlert.mutateAsync({
            alert_type: 'unsigned_invoice',
            severity: 'medium',
            invoice_type: params.invoice_type,
            invoice_id: params.invoice_id,
            centro_code: params.centro_code,
            title: 'Factura sin firma digital',
            description: `La factura ${invoice?.invoice_number} no está firmada digitalmente`,
          });
          issues.push('unsigned_invoice');
        }

        // Check if sent to AEAT (for issued invoices only)
        const sentToAEAT = (invoice as any)?.verifactu_sent_to_aeat;
        if (!sentToAEAT) {
          await createAlert.mutateAsync({
            alert_type: 'unsent_to_aeat',
            severity: 'high',
            invoice_type: params.invoice_type,
            invoice_id: params.invoice_id,
            centro_code: params.centro_code,
            title: 'Factura no enviada a AEAT',
            description: `La factura ${invoice?.invoice_number} no ha sido enviada a la plataforma AEAT`,
          });
          issues.push('unsent_to_aeat');
        }
      }

      return { issues, total: issues.length };
    },
    onSuccess: (data) => {
      if (data.total === 0) {
        toast.success('Factura cumple con todos los requisitos');
      } else {
        toast.warning(`${data.total} problemas de cumplimiento detectados`);
      }
    },
  });
}
