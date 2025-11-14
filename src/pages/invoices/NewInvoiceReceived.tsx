import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SupplierSelector } from '@/components/invoices/SupplierSelector';
import { InvoiceLineItemsTable, type InvoiceLine } from '@/components/invoices/InvoiceLineItemsTable';
import { APMappingSuggestions } from '@/components/invoices/APMappingSuggestions';
import { useCreateInvoiceReceived } from '@/hooks/useInvoicesReceived';
import { useOrganization } from '@/hooks/useOrganization';
import { useAPMappingSuggestions } from '@/hooks/useAPMappingSuggestions';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { normalizeLite } from '@/lib/fiscal';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { APMappingResult } from '@/hooks/useInvoiceOCR';
import type { Supplier } from '@/hooks/useSuppliers';

export default function NewInvoiceReceived() {
  const navigate = useNavigate();
  const { currentMembership } = useOrganization();
  const createInvoice = useCreateInvoiceReceived();
  const getMappingSuggestions = useAPMappingSuggestions();

  const [supplierId, setSupplierId] = useState('');
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [apMapping, setApMapping] = useState<APMappingResult | null>(null);

  // Handler para cambio de proveedor - obtiene sugerencias AP
  const handleSupplierChange = async (newSupplierId: string) => {
    setSupplierId(newSupplierId);
    
    if (!newSupplierId) {
      setApMapping(null);
      setSupplier(null);
      return;
    }
    
    // Obtener datos completos del proveedor
    const { data: supplierData } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', newSupplierId)
      .single();
    
    if (!supplierData?.tax_id) {
      setSupplier(null);
      return;
    }
    
    setSupplier(supplierData as Supplier);
    
    // Obtener sugerencias AP
    if (currentMembership?.restaurant?.codigo) {
      try {
        const mapping = await getMappingSuggestions.mutateAsync({
          supplierVatId: supplierData.tax_id,
          centroCode: currentMembership.restaurant.codigo,
          lines: lines.map(l => ({
            description: l.description,
            quantity: l.quantity,
            unit_price: l.unit_price
          }))
        });
        
        setApMapping(mapping);
      } catch (error) {
        console.error('[AP Mapping] Error:', error);
        toast.error('Error al obtener sugerencias de cuentas');
      }
    }
  };

  // Handler para cambio de líneas - recalcula sugerencias
  const handleLinesChange = async (newLines: InvoiceLine[]) => {
    setLines(newLines);
    
    // Re-calcular sugerencias si hay proveedor seleccionado
    if (supplier?.tax_id && currentMembership?.restaurant?.codigo) {
      try {
        const mapping = await getMappingSuggestions.mutateAsync({
          supplierVatId: supplier.tax_id,
          centroCode: currentMembership.restaurant.codigo,
          lines: newLines.map(l => ({
            description: l.description,
            quantity: l.quantity,
            unit_price: l.unit_price
          }))
        });
        
        setApMapping(mapping);
      } catch (error) {
        console.error('[AP Mapping] Error on lines change:', error);
      }
    }
  };

  // Aceptar todas las sugerencias (factura + líneas)
  const handleAcceptAllSuggestions = () => {
    if (!apMapping) return;
    
    const updatedLines = lines.map((line, index) => {
      // Primera línea: sugerencia de factura
      if (index === 0) {
        return {
          ...line,
          account_code: apMapping.invoice_level.account_suggestion
        };
      }
      
      // Líneas siguientes: sugerencias por línea si existen
      if (apMapping.line_level && apMapping.line_level[index]) {
        return {
          ...line,
          account_code: apMapping.line_level[index].account_suggestion
        };
      }
      
      return line;
    });
    
    setLines(updatedLines);
    toast.success('Sugerencias aplicadas a todas las líneas');
  };

  // Aceptar solo sugerencia de factura
  const handleAcceptInvoiceSuggestion = () => {
    if (!apMapping || lines.length === 0) return;
    
    const updatedLines = [...lines];
    updatedLines[0] = {
      ...updatedLines[0],
      account_code: apMapping.invoice_level.account_suggestion
    };
    
    setLines(updatedLines);
    toast.success('Sugerencia de factura aplicada');
  };

  const handleQuickValidate = () => {
    const subtotalCalc = lines.reduce((sum, line) => {
      const lineTotal = line.quantity * line.unit_price;
      const discount = (lineTotal * line.discount_percentage) / 100;
      return sum + (lineTotal - discount);
    }, 0);

    const taxCalc = lines.reduce((sum, line) => {
      const lineTotal = line.quantity * line.unit_price;
      const discount = (lineTotal * line.discount_percentage) / 100;
      const subtotalAfterDiscount = lineTotal - discount;
      return sum + (subtotalAfterDiscount * line.tax_rate) / 100;
    }, 0);

    const data = {
      issuer: { vat_id: supplierId },
      invoice_number: invoiceNumber,
      issue_date: invoiceDate,
      due_date: dueDate,
      totals: {
        total: subtotalCalc + taxCalc
      }
    };
    
    const { validation } = normalizeLite(data);
    
    if (validation.ok) {
      toast.success('Validación correcta', {
        description: validation.warnings.length > 0 
          ? `${validation.warnings.length} advertencia${validation.warnings.length !== 1 ? 's' : ''}` 
          : 'Sin errores detectados',
        icon: <CheckCircle2 className="h-4 w-4" />
      });
    } else {
      toast.error('Errores de validación', {
        description: validation.errors.join(' • '),
        icon: <AlertTriangle className="h-4 w-4" />
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación de proveedor obligatorio
    if (!supplierId) {
      toast.error('Debes seleccionar un proveedor válido', {
        description: 'Usa el buscador o valida el NIF/CIF para asociar un proveedor'
      });
      return;
    }

    if (!invoiceNumber || lines.length === 0) {
      toast.error('Completa todos los campos obligatorios', {
        description: 'Número de factura y al menos una línea son requeridos'
      });
      return;
    }

    const totals = lines.reduce((acc, line) => {
      const subtotal = line.quantity * line.unit_price;
      const discountAmount = (subtotal * line.discount_percentage) / 100;
      const subtotalAfterDiscount = subtotal - discountAmount;
      const taxAmount = (subtotalAfterDiscount * line.tax_rate) / 100;
      return {
        subtotal: acc.subtotal + subtotalAfterDiscount,
        tax: acc.tax + taxAmount,
        total: acc.total + subtotalAfterDiscount + taxAmount,
      };
    }, { subtotal: 0, tax: 0, total: 0 });

    await createInvoice.mutateAsync({
      supplier_id: supplierId,
      centro_code: currentMembership?.restaurant?.codigo || '',
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate || undefined,
      subtotal: totals.subtotal,
      tax_total: totals.tax,
      total: totals.total,
      status: 'pending',
      notes: notes || undefined,
      lines: lines.map(line => ({
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_percentage: line.discount_percentage,
        tax_rate: line.tax_rate,
        account_code: line.account_code,
      })),
    });

    navigate('/facturas');
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/facturas')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nueva Factura Recibida</h1>
          <p className="text-muted-foreground mt-1">Registra una nueva factura de proveedor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la Factura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proveedor *</Label>
                <SupplierSelector value={supplierId} onValueChange={handleSupplierChange} />
              </div>
              <div className="space-y-2">
                <Label>Número de Factura *</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Fecha Factura *</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Fecha Vencimiento</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Validación Rápida</span>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleQuickValidate}
                  disabled={!supplierId || !invoiceNumber || lines.length === 0}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Validar Datos
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Valida NIF/CIF, totales y coherencia de datos antes de guardar
            </CardContent>
          </Card>

        {/* Sugerencias de cuentas AP */}
        {getMappingSuggestions.isPending && (
          <Card className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generando sugerencias de cuentas contables...</span>
            </div>
          </Card>
        )}

        {apMapping && (
          <APMappingSuggestions
            invoiceSuggestion={{
              account_suggestion: apMapping.invoice_level.account_suggestion,
              confidence_score: apMapping.invoice_level.confidence_score,
              rationale: apMapping.invoice_level.rationale,
              tax_account: apMapping.invoice_level.tax_account,
              ap_account: apMapping.invoice_level.ap_account,
              centre_id: apMapping.invoice_level.centre_id,
              matched_rule_id: apMapping.invoice_level.matched_rule_id,
              matched_rule_name: apMapping.invoice_level.matched_rule_name
            }}
            lineSuggestions={(apMapping.line_level || []).map((line) => ({
              account_suggestion: line.account_suggestion,
              confidence_score: line.confidence_score,
              rationale: line.rationale,
              tax_account: line.tax_account,
              ap_account: line.ap_account,
              centre_id: line.centre_id,
              matched_rule_id: line.matched_rule_id,
              matched_rule_name: line.matched_rule_name
            }))}
            onAcceptAll={handleAcceptAllSuggestions}
            onAcceptInvoice={handleAcceptInvoiceSuggestion}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Líneas de Factura</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceLineItemsTable lines={lines} onChange={handleLinesChange} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/facturas')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createInvoice.isPending || !supplierId || !invoiceNumber || lines.length === 0}>
            Guardar Factura
          </Button>
        </div>
      </form>
    </div>
  );
}
