import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VerifactuLog {
  id: string;
  invoice_type: 'issued' | 'received';
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  hash_sha256: string;
  previous_hash: string | null;
  signature: string | null;
  signature_algorithm: string;
  signature_timestamp: string;
  chain_position: number;
  verified: boolean;
  verification_date: string | null;
  metadata: any;
  created_at: string;
}

export function useVerifactuLogs(centroCode?: string, invoiceType?: 'issued' | 'received') {
  return useQuery({
    queryKey: ['verifactu-logs', centroCode, invoiceType],
    queryFn: async () => {
      let query = supabase
        .from('verifactu_logs')
        .select('*')
        .order('chain_position', { ascending: true });

      if (invoiceType) {
        query = query.eq('invoice_type', invoiceType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VerifactuLog[];
    },
  });
}

export function useGenerateInvoiceHash() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      invoice_id: string;
      invoice_type: 'issued' | 'received';
      invoice_number: string;
      invoice_date: string;
      total: number;
    }) => {
      // Get previous hash from the last entry
      const { data: lastLog } = await supabase
        .from('verifactu_logs')
        .select('hash_sha256, chain_position')
        .eq('invoice_type', params.invoice_type)
        .order('chain_position', { ascending: false })
        .limit(1)
        .single();

      const previousHash = lastLog?.hash_sha256 || null;
      const chainPosition = (lastLog?.chain_position || 0) + 1;

      // Generate hash using database function
      const { data: hashData, error: hashError } = await supabase
        .rpc('generate_invoice_hash', {
          p_invoice_type: params.invoice_type,
          p_invoice_number: params.invoice_number,
          p_invoice_date: params.invoice_date,
          p_total: params.total,
          p_previous_hash: previousHash,
        });

      if (hashError) throw hashError;

      // Store hash in verifactu_logs
      const { data: logData, error: logError } = await supabase
        .from('verifactu_logs')
        .insert({
          invoice_type: params.invoice_type,
          invoice_id: params.invoice_id,
          invoice_number: params.invoice_number,
          invoice_date: params.invoice_date,
          hash_sha256: hashData,
          previous_hash: previousHash,
          chain_position: chainPosition,
        })
        .select()
        .single();

      if (logError) throw logError;

      // Update invoice with hash
      const invoiceTable = params.invoice_type === 'issued' ? 'invoices_issued' : 'invoices_received';
      const { error: updateError } = await supabase
        .from(invoiceTable)
        .update({ verifactu_hash: hashData })
        .eq('id', params.invoice_id);

      if (updateError) throw updateError;

      return { hash: hashData, log: logData };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['verifactu-logs'] });
      queryClient.invalidateQueries({ 
        queryKey: variables.invoice_type === 'issued' ? ['invoices_issued'] : ['invoices_received'] 
      });
      toast.success('Hash Verifactu generado correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error generando hash: ${error.message}`);
    },
  });
}

export function useVerifyHashChain() {
  return useMutation({
    mutationFn: async (params: {
      centro_code: string;
      invoice_type: 'issued' | 'received';
    }) => {
      const { data, error } = await supabase
        .rpc('verify_hash_chain', {
          p_centro_code: params.centro_code,
          p_invoice_type: params.invoice_type,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.[0]?.is_valid) {
        toast.success('Cadena de integridad verificada correctamente');
      } else {
        toast.error(`Cadena rota en posición ${data?.[0]?.broken_at}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Error verificando cadena: ${error.message}`);
    },
  });
}

export function useGenerateFacturaeXML() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      invoice_id: string;
      invoice_type: 'issued' | 'received';
    }) => {
      // Get invoice data
      const invoiceTable = params.invoice_type === 'issued' ? 'invoices_issued' : 'invoices_received';
      const { data: invoice, error: invoiceError } = await supabase
        .from(invoiceTable)
        .select('*')
        .eq('id', params.invoice_id)
        .single();

      if (invoiceError) throw invoiceError;

      // Generate XML (simplified version - would need full Facturae 3.2.2 implementation)
      const xml = generateFacturaeXML(invoice, params.invoice_type);

      // Store XML
      const { data: xmlData, error: xmlError } = await supabase
        .from('facturae_xml_files')
        .insert({
          invoice_type: params.invoice_type,
          invoice_id: params.invoice_id,
          xml_version: '3.2.2',
          xml_content: xml,
        })
        .select()
        .single();

      if (xmlError) throw xmlError;

      return xmlData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturae-xml'] });
      toast.success('XML Facturae generado correctamente');
    },
    onError: (error: Error) => {
      toast.error(`Error generando XML: ${error.message}`);
    },
  });
}

// Helper function to generate Facturae XML (simplified)
function generateFacturaeXML(invoice: any, type: 'issued' | 'received'): string {
  const now = new Date().toISOString();
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<fe:Facturae xmlns:fe="http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml">
  <FileHeader>
    <SchemaVersion>3.2.2</SchemaVersion>
    <Modality>I</Modality>
    <InvoiceIssuerType>EM</InvoiceIssuerType>
    <Batch>
      <BatchIdentifier>${invoice.invoice_number}</BatchIdentifier>
      <InvoicesCount>1</InvoicesCount>
      <TotalInvoicesAmount>
        <TotalAmount>${invoice.total}</TotalAmount>
      </TotalInvoicesAmount>
      <TotalOutstandingAmount>
        <TotalAmount>${invoice.total}</TotalAmount>
      </TotalOutstandingAmount>
      <InvoiceCurrencyCode>EUR</InvoiceCurrencyCode>
    </Batch>
  </FileHeader>
  <Parties>
    <!-- Simplified party information -->
  </Parties>
  <Invoices>
    <Invoice>
      <InvoiceHeader>
        <InvoiceNumber>${invoice.invoice_number}</InvoiceNumber>
        <InvoiceDocumentType>FC</InvoiceDocumentType>
        <InvoiceClass>OO</InvoiceClass>
      </InvoiceHeader>
      <InvoiceIssueData>
        <IssueDate>${invoice.invoice_date}</IssueDate>
        <InvoiceCurrencyCode>EUR</InvoiceCurrencyCode>
        <TaxCurrencyCode>EUR</TaxCurrencyCode>
        <LanguageName>es</LanguageName>
      </InvoiceIssueData>
      <TaxesOutputs>
        <Tax>
          <TaxTypeCode>01</TaxTypeCode>
          <TaxRate>${invoice.tax_rate || 21}</TaxRate>
          <TaxableBase>
            <TotalAmount>${invoice.subtotal || 0}</TotalAmount>
          </TaxableBase>
          <TaxAmount>
            <TotalAmount>${invoice.total_tax || 0}</TotalAmount>
          </TaxAmount>
        </Tax>
      </TaxesOutputs>
      <InvoiceTotals>
        <TotalGrossAmount>${invoice.total}</TotalGrossAmount>
        <TotalGeneralDiscounts>0.00</TotalGeneralDiscounts>
        <TotalGrossAmountBeforeTaxes>${invoice.subtotal || 0}</TotalGrossAmountBeforeTaxes>
        <TotalTaxOutputs>${invoice.total_tax || 0}</TotalTaxOutputs>
        <InvoiceTotal>${invoice.total}</InvoiceTotal>
        <TotalOutstandingAmount>${invoice.total}</TotalOutstandingAmount>
      </InvoiceTotals>
    </Invoice>
  </Invoices>
</fe:Facturae>`;
}
