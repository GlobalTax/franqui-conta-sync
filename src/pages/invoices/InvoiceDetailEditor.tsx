// ============================================================================
// INVOICE DETAIL EDITOR
// Vista de detalle/edición de factura (estilo Quantum Economics)
// Layout: PDF izquierda + Formulario contable derecha
// ============================================================================

import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { InvoicePDFPreview } from '@/components/invoices/InvoicePDFPreview';
import { InvoicePDFUploader } from '@/components/invoices/InvoicePDFUploader';
import { InvoiceFormHeader } from '@/components/invoices/form/InvoiceFormHeader';
import { InvoiceSupplierSection } from '@/components/invoices/form/InvoiceSupplierSection';
import { InvoiceDataSection } from '@/components/invoices/form/InvoiceDataSection';
import { InvoicePaymentTermsSection } from '@/components/invoices/form/InvoicePaymentTermsSection';
import { InvoiceTaxBreakdownSection } from '@/components/invoices/form/InvoiceTaxBreakdownSection';
import { InvoiceAdvancedOptionsSection } from '@/components/invoices/form/InvoiceAdvancedOptionsSection';
import { InvoiceActionButtons } from '@/components/invoices/form/InvoiceActionButtons';
import { useInvoicesReceived, useCreateInvoiceReceived, useUpdateInvoiceReceived } from '@/hooks/useInvoicesReceived';
import { useInvoiceActions } from '@/hooks/useInvoiceActions';
import { validateInvoiceForPosting } from '@/lib/invoice-validation';
import { validateAccountingBalance } from '@/lib/invoice-calculator';
import { toast } from 'sonner';
import { useState } from 'react';

// Schema de validación
const invoiceFormSchema = z.object({
  invoice_type: z.enum(['received', 'issued']),
  centro_code: z.string().min(1, 'Centro obligatorio'),
  
  // Proveedor
  supplier_id: z.string().min(1, 'Proveedor obligatorio'),
  supplier_tax_id: z.string().optional(),
  supplier_name: z.string().optional(),
  
  // Datos factura
  currency: z.literal('EUR'),
  invoice_number: z.string().min(1, 'Número obligatorio'),
  invoice_date: z.string().min(1, 'Fecha obligatoria'),
  due_date: z.string().optional(),
  
  // Totales (calculados)
  subtotal: z.number().default(0),
  tax_total: z.number().default(0),
  total: z.number().default(0),
  
  // Líneas impuestos
  tax_lines: z.array(z.object({
    tax_rate: z.number(),
    tax_base: z.number(),
    tax_amount: z.number(),
    account_code: z.string(),
    expense_category: z.string().optional()
  })).default([]),
  
  // Vencimientos
  payment_terms: z.array(z.object({
    due_date: z.string(),
    amount: z.number()
  })).default([]),
  
  // Opciones avanzadas
  is_rental: z.boolean().default(false),
  is_special_regime: z.boolean().default(false),
  notes: z.string().optional()
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

export default function InvoiceDetailEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  // Estado local para document_path
  const [documentPath, setDocumentPath] = useState<string | null>(null);

  // Hooks
  const { data: invoicesData } = useInvoicesReceived({});
  const createInvoice = useCreateInvoiceReceived();
  const updateInvoice = useUpdateInvoiceReceived();
  const invoiceActions = useInvoiceActions();

  // Encontrar la factura si estamos en modo edición
  const invoice = useMemo(() => {
    if (!isEditMode || !invoicesData?.data) return null;
    return invoicesData.data.find(inv => inv.id === id);
  }, [isEditMode, id, invoicesData]);

  // Inicializar formulario
  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoice_type: 'received',
      currency: 'EUR',
      centro_code: '',
      supplier_id: '',
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      subtotal: 0,
      tax_total: 0,
      total: 0,
      tax_lines: [],
      payment_terms: [],
      is_rental: false,
      is_special_regime: false
    }
  });

  // Cargar datos de la factura en modo edición
  useEffect(() => {
    if (invoice && isEditMode) {
      form.reset({
        invoice_type: 'received',
        currency: 'EUR',
        centro_code: invoice.centro_code || '',
        supplier_id: invoice.supplier_id || '',
        supplier_tax_id: invoice.supplier?.tax_id || '',
        supplier_name: invoice.supplier?.name || '',
        invoice_number: invoice.invoice_number || '',
        invoice_date: invoice.invoice_date || '',
        due_date: invoice.due_date || '',
        subtotal: invoice.subtotal || 0,
        tax_total: invoice.tax_total || 0,
        total: invoice.total || 0,
        tax_lines: [],
        payment_terms: [],
        notes: invoice.notes || '',
        is_rental: false,
        is_special_regime: false
      });
      setDocumentPath(invoice.document_path || null);
    }
  }, [invoice, isEditMode, form]);

  // Validación de pre-contabilización
  const canPost = useMemo(() => {
    const values = form.watch();
    
    // 1. Centro asignado
    if (!values.centro_code) return false;
    
    // 2. Balance Debe = Haber
    const taxLines = values.tax_lines || [];
    const debitTotal = taxLines.reduce((sum, line) => sum + line.tax_base + line.tax_amount, 0);
    const creditTotal = values.total || 0;
    
    if (!validateAccountingBalance(debitTotal, creditTotal)) return false;
    
    // 3. Tiene líneas de impuestos
    if (taxLines.length === 0) return false;
    
    return true;
  }, [form.watch()]);

  // Handlers
  const handleSaveDraft = async (data: InvoiceFormData) => {
    try {
      if (isEditMode && id) {
        await updateInvoice.mutateAsync({ 
          id, 
          data: {
            centro_code: data.centro_code,
            invoice_number: data.invoice_number,
            invoice_date: data.invoice_date,
            due_date: data.due_date,
            subtotal: data.subtotal,
            tax_total: data.tax_total,
            total: data.total,
            notes: data.notes
          }
        });
        toast.success('Factura actualizada correctamente');
      } else {
        const newInvoice = await createInvoice.mutateAsync({
          centro_code: data.centro_code,
          supplier_id: data.supplier_id,
          invoice_number: data.invoice_number,
          invoice_date: data.invoice_date,
          due_date: data.due_date,
          subtotal: data.subtotal,
          tax_total: data.tax_total,
          total: data.total,
          notes: data.notes,
          status: 'draft',
          document_path: documentPath,
          lines: []
        });
        toast.success('Factura guardada como borrador');
        navigate(`/invoices/received/${newInvoice.id}/edit`);
      }
    } catch (error: any) {
      toast.error('Error al guardar la factura', {
        description: error.message
      });
    }
  };

  const handleConfirmAndPost = async () => {
    try {
      const data = form.getValues();
      
      // 1. Guardar factura primero
      let invoiceId = id;
      
      if (!isEditMode) {
        const newInvoice = await createInvoice.mutateAsync({
          centro_code: data.centro_code,
          supplier_id: data.supplier_id,
          invoice_number: data.invoice_number,
          invoice_date: data.invoice_date,
          due_date: data.due_date,
          subtotal: data.subtotal,
          tax_total: data.tax_total,
          total: data.total,
          notes: data.notes,
          status: 'draft',
          document_path: documentPath,
          lines: []
        });
        invoiceId = newInvoice.id;
      } else {
        await updateInvoice.mutateAsync({ 
          id: invoiceId!, 
          data: {
            centro_code: data.centro_code,
            invoice_number: data.invoice_number,
            invoice_date: data.invoice_date,
            due_date: data.due_date,
            subtotal: data.subtotal,
            tax_total: data.tax_total,
            total: data.total,
            notes: data.notes
          }
        });
      }
      
      // 2. Validar con InvoiceEntryValidator
      const validation = await validateInvoiceForPosting(invoiceId!);
      
      if (!validation.ready_to_post) {
        validation.blocking_issues.forEach(issue => {
          if (issue.includes('centro')) {
            toast.error('❌ Centro no asignado');
          } else if (issue.includes('balance') || issue.includes('Debe')) {
            toast.error('❌ Descuadre contable: Debe ≠ Haber');
          } else if (issue.includes('período')) {
            toast.error('❌ Período cerrado', {
              description: 'No se puede postear en un período cerrado'
            });
          } else {
            toast.error(issue);
          }
        });
        return;
      }
      
      // 3. Contabilizar
      await invoiceActions.postInvoice({ invoiceId: invoiceId! });
      
      toast.success('✅ Factura aprobada y contabilizada correctamente', {
        description: 'El asiento contable ha sido generado'
      });
      
      navigate('/invoices/inbox');
      
    } catch (error: any) {
      console.error('Error al contabilizar:', error);
    }
  };

  const handleIgnore = async () => {
    if (!id) return;
    
    if (!confirm('¿Marcar esta factura como ignorada?')) return;
    
    try {
      await updateInvoice.mutateAsync({
        id,
        data: { status: 'rejected' }
      });
      
      toast.info('Factura marcada como ignorada');
      navigate('/invoices/inbox');
    } catch (error: any) {
      toast.error('Error al ignorar la factura', {
        description: error.message
      });
    }
  };

  const handleCancel = () => {
    if (form.formState.isDirty && !confirm('¿Descartar los cambios?')) {
      return;
    }
    navigate('/invoices/inbox');
  };

  const handleUploadComplete = (path: string | null) => {
    setDocumentPath(path);
    if (path) {
      toast.success('PDF subido correctamente');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={isEditMode ? 'Editar Factura' : 'Nueva Factura'}
        breadcrumbs={[
          { label: 'Facturas', href: '/invoices/inbox' },
          { label: isEditMode ? 'Editar' : 'Nueva' }
        ]}
      />

      <div className="container mx-auto max-w-[1800px] p-6">
        {/* Desktop: Grid 2 columnas */}
        <div className="hidden lg:grid lg:grid-cols-[45%_55%] gap-6">
          {/* Izquierda: PDF */}
          <div className="sticky top-6 h-[calc(100vh-8rem)] overflow-hidden">
            <Card className="h-full">
              <CardContent className="p-0 h-full">
                {documentPath ? (
                  <InvoicePDFPreview
                    documentPath={documentPath}
                    className="h-full"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center p-6">
                    <InvoicePDFUploader
                      invoiceId={id}
                      invoiceType="received"
                      centroCode={form.watch('centro_code') || 'temp'}
                      currentPath={documentPath}
                      onUploadComplete={handleUploadComplete}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Derecha: Formulario */}
          <div className="space-y-6 pb-24">
            <FormProvider {...form}>
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-6">
                  <InvoiceFormHeader
                    control={form.control}
                    isEditMode={isEditMode}
                    ocrEngine={invoice?.ocr_engine}
                    ocrConfidence={invoice?.ocr_confidence}
                  />
                  
                  <InvoiceSupplierSection
                    control={form.control}
                    setValue={form.setValue}
                    watch={form.watch}
                  />
                  
                  <InvoiceDataSection
                    control={form.control}
                    watch={form.watch}
                    setValue={form.setValue}
                  />
                  
                  <InvoicePaymentTermsSection
                    control={form.control}
                    watch={form.watch}
                  />
                  
                  <InvoiceTaxBreakdownSection
                    control={form.control}
                    setError={form.setError}
                  />
                  
                  <InvoiceAdvancedOptionsSection
                    control={form.control}
                    invoiceId={id}
                    ocrData={invoice?.ocr_extracted_data}
                  />
                </div>
              </form>
            </FormProvider>
          </div>
        </div>

        {/* Mobile: Tabs */}
        <div className="lg:hidden">
          <Tabs defaultValue="form">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pdf">PDF</TabsTrigger>
              <TabsTrigger value="form">Formulario</TabsTrigger>
            </TabsList>

            <TabsContent value="pdf" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  {documentPath ? (
                    <div className="h-[70vh]">
                      <InvoicePDFPreview
                        documentPath={documentPath}
                        className="h-full"
                      />
                    </div>
                  ) : (
                    <InvoicePDFUploader
                      invoiceId={id}
                      invoiceType="received"
                      centroCode={form.watch('centro_code') || 'temp'}
                      currentPath={documentPath}
                      onUploadComplete={handleUploadComplete}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="form" className="mt-6 space-y-6 pb-24">
              <FormProvider {...form}>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="space-y-6">
                    <InvoiceFormHeader
                      control={form.control}
                      isEditMode={isEditMode}
                      ocrEngine={invoice?.ocr_engine}
                      ocrConfidence={invoice?.ocr_confidence}
                    />
                    
                    <InvoiceSupplierSection
                      control={form.control}
                      setValue={form.setValue}
                      watch={form.watch}
                    />
                    
                    <InvoiceDataSection
                      control={form.control}
                      watch={form.watch}
                      setValue={form.setValue}
                    />
                    
                    <InvoicePaymentTermsSection
                      control={form.control}
                      watch={form.watch}
                    />
                    
                    <InvoiceTaxBreakdownSection
                      control={form.control}
                      setError={form.setError}
                    />
                    
                    <InvoiceAdvancedOptionsSection
                      control={form.control}
                      invoiceId={id}
                      ocrData={invoice?.ocr_extracted_data}
                    />
                  </div>
                </form>
              </FormProvider>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Action Buttons (sticky footer) */}
      <InvoiceActionButtons
        isEditMode={isEditMode}
        isLoading={createInvoice.isPending || updateInvoice.isPending || invoiceActions.isPosting}
        isDirty={form.formState.isDirty}
        canPost={canPost}
        onConfirmAndPost={handleConfirmAndPost}
        onSaveDraft={form.handleSubmit(handleSaveDraft)}
        onIgnore={handleIgnore}
        onCancel={handleCancel}
      />
    </div>
  );
}
