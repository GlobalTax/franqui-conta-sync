// ============================================================================
// OCR TEMPLATES PAGE
// Gestión de templates OCR configurables por proveedor
// ============================================================================

import { lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Plus, FileText, Eye, Edit, Trash2, Zap, BarChart3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Lazy load del template builder pesado
const TemplateBuilder = lazy(() => import('@/components/ocr/TemplateBuilder').then(m => ({ default: m.TemplateBuilder })));

export default function OCRTemplates() {
  const navigate = useNavigate();
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [samplePdfUrl, setSamplePdfUrl] = useState<string>('');

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, tax_id, name, commercial_name')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch templates
  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ['ocr-templates', selectedSupplier],
    queryFn: async () => {
      if (!selectedSupplier) return [];
      
      const { data, error } = await supabase
        .from('supplier_ocr_templates')
        .select(`
          *,
          supplier:suppliers (
            id,
            name,
            tax_id
          )
        `)
        .eq('supplier_id', selectedSupplier)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedSupplier,
  });

  // Open builder for new template
  const handleCreateTemplate = () => {
    if (!selectedSupplier) {
      toast.error('Selecciona un proveedor primero');
      return;
    }
    
    if (!samplePdfUrl) {
      toast.error('Proporciona una URL de ejemplo de PDF');
      return;
    }
    
    setSelectedTemplate(null);
    setShowBuilder(true);
  };

  // Open builder for existing template
  const handleEditTemplate = (template: any) => {
    setSelectedTemplate(template);
    // TODO: Get sample PDF from supplier's invoices
    setSamplePdfUrl('/api/sample-pdf'); // Placeholder
    setShowBuilder(true);
  };

  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('¿Eliminar este template?')) return;
    
    try {
      const { error } = await supabase
        .from('supplier_ocr_templates')
        .delete()
        .eq('id', templateId);
      
      if (error) throw error;
      
      toast.success('Template eliminado');
      refetchTemplates();
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message);
    }
  };

  const selectedSupplierData = suppliers.find(s => s.id === selectedSupplier);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Templates OCR</h1>
          <p className="text-muted-foreground">
            Configura templates para extraer datos automáticamente de facturas recurrentes
          </p>
        </div>
        <Button
          onClick={() => navigate('/configuracion/ocr-templates/metrics')}
          variant="outline"
          className="gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Ver Métricas
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Proveedor</label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un proveedor" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name} ({supplier.tax_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">PDF de ejemplo (URL)</label>
            <Input
              placeholder="https://ejemplo.com/factura.pdf"
              value={samplePdfUrl}
              onChange={(e) => setSamplePdfUrl(e.target.value)}
            />
          </div>
          
          <Button
            onClick={handleCreateTemplate}
            disabled={!selectedSupplier || !samplePdfUrl}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Template
          </Button>
        </div>
      </Card>

      {selectedSupplier && (
        <Card className="p-6">
          <h2 className="font-semibold mb-4">
            Templates de {selectedSupplierData?.name}
          </h2>
          
          {templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No hay templates creados para este proveedor</p>
              <p className="text-xs mt-1">Crea uno para extraer datos automáticamente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{template.template_name}</h3>
                        {template.is_active && (
                          <Badge variant="default">
                            <Zap className="h-3 w-3 mr-1" />
                            Activo
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Campos:</span> {Object.keys(template.field_mappings || {}).length}
                        </div>
                        <div>
                          <span className="font-medium">Usos:</span> {template.usage_count}
                        </div>
                        <div>
                          <span className="font-medium">Confianza promedio:</span>{' '}
                          {template.avg_confidence ? `${(template.avg_confidence * 100).toFixed(1)}%` : 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Umbral:</span> {(template.confidence_threshold * 100).toFixed(0)}%
                        </div>
                        <div>
                          <span className="font-medium">Motor preferido:</span> {template.preferred_ocr_engine}
                        </div>
                        <div>
                          <span className="font-medium">Última vez usado:</span>{' '}
                          {template.last_used_at ? new Date(template.last_used_at).toLocaleDateString() : 'Nunca'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Template Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-[95vw] h-[95vh] p-6">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Editar Template' : 'Nuevo Template'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSupplierData && (
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <p className="text-muted-foreground">Cargando constructor de template...</p>
                </div>
              </div>
            }>
              <TemplateBuilder
                supplierId={selectedSupplier}
                supplierName={selectedSupplierData.name}
                pdfUrl={samplePdfUrl}
                existingTemplate={selectedTemplate}
                onSave={() => {
                  setShowBuilder(false);
                  refetchTemplates();
                }}
              />
            </Suspense>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
