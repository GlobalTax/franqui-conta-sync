import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InvoiceFormProps {
  data: any;
  invoiceId: string;
}

export function InvoiceForm({ data, invoiceId }: InvoiceFormProps) {
  const [formData, setFormData] = useState(data);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('invoices_received')
        .update({
          invoice_number: formData.invoice_number,
          issue_date: formData.issue_date,
          issuer_name: formData.issuer?.name,
          issuer_vat: formData.issuer?.vat_id,
          base_10: formData.totals?.base_10,
          vat_10: formData.totals?.vat_10,
          base_21: formData.totals?.base_21,
          vat_21: formData.totals?.vat_21,
          total: formData.totals?.total,
        })
        .eq('id', invoiceId);

      if (error) throw error;
      toast.success('Cambios guardados');
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Datos de la factura
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Número</Label>
            <Input
              value={formData.invoice_number || ''}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={formData.issue_date || ''}
              onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Proveedor</Label>
          <Input
            value={formData.issuer?.name || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              issuer: { ...formData.issuer, name: e.target.value } 
            })}
          />
        </div>

        <div className="space-y-2">
          <Label>NIF/CIF</Label>
          <Input
            value={formData.issuer?.vat_id || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              issuer: { ...formData.issuer, vat_id: e.target.value } 
            })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Base 10%</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.totals?.base_10 || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                totals: { ...formData.totals, base_10: parseFloat(e.target.value) || 0 } 
              })}
            />
          </div>
          <div className="space-y-2">
            <Label>IVA 10%</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.totals?.vat_10 || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                totals: { ...formData.totals, vat_10: parseFloat(e.target.value) || 0 } 
              })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Base 21%</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.totals?.base_21 || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                totals: { ...formData.totals, base_21: parseFloat(e.target.value) || 0 } 
              })}
            />
          </div>
          <div className="space-y-2">
            <Label>IVA 21%</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.totals?.vat_21 || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                totals: { ...formData.totals, vat_21: parseFloat(e.target.value) || 0 } 
              })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Total</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.totals?.total || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              totals: { ...formData.totals, total: parseFloat(e.target.value) || 0 } 
            })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
