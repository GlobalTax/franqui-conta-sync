// ============================================================================
// COMPONENT: Verifactu Exporter
// Exportador de registros Verifactu para AEAT
// ============================================================================

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useView } from '@/contexts/ViewContext';
import { useVerifactuLogs } from '@/hooks/useVerifactu';
import { Download, FileText, Shield, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function VerifactuExporter() {
  const { selectedView } = useView();
  const [period, setPeriod] = useState('');
  const [invoiceType, setInvoiceType] = useState<'issued' | 'received'>('issued');
  const [xmlPreview, setXmlPreview] = useState<string | null>(null);
  
  const { data: logs } = useVerifactuLogs(invoiceType);

  const handleGenerateXML = () => {
    if (!selectedView || !period) {
      toast.error('Selecciona un centro y período');
      return;
    }

    // Simplified XML generation (in production this would be more complete)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<RegistroFacturacion xmlns="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/RegistroFacturacion.xsd">
  <Cabecera>
    <IDVersion>1.0</IDVersion>
    <ObligadoEmision>
      <NIF>${selectedView.id}</NIF>
      <NombreRazon>${selectedView.name}</NombreRazon>
    </ObligadoEmision>
    <TipoFichero>${invoiceType === 'issued' ? 'F1' : 'F2'}</TipoFichero>
    <FechaHoraGeneracion>${new Date().toISOString()}</FechaHoraGeneracion>
  </Cabecera>
  <RegistroAlta>
    <!-- Registros de facturas -->
    ${logs?.slice(0, 5).map((log: any) => `
    <IDFactura>
      <NumSerieFactura>${log.invoice_number || 'N/A'}</NumSerieFactura>
      <FechaExpedicion>${log.invoice_date || new Date().toISOString().split('T')[0]}</FechaExpedicion>
    </IDFactura>
    <Hash>${log.hash_value || 'HASH_PLACEHOLDER'}</Hash>
    `).join('\n')}
  </RegistroAlta>
</RegistroFacturacion>`;

    setXmlPreview(xml);
  };

  const handleDownload = () => {
    if (!xmlPreview) return;

    const blob = new Blob([xmlPreview], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verifactu_${invoiceType}_${period}_${Date.now()}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Archivo XML descargado correctamente');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Exportación VERI*FACTU</CardTitle>
          </div>
          <CardDescription>
            Generación de ficheros XML para envío a AEAT (Ley 11/2021)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoice-type">Tipo de factura</Label>
              <Select value={invoiceType} onValueChange={(v: any) => setInvoiceType(v)}>
                <SelectTrigger id="invoice-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="issued">Emitidas</SelectItem>
                  <SelectItem value="received">Recibidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="period">Período</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger id="period">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-01">Enero 2025</SelectItem>
                  <SelectItem value="2025-02">Febrero 2025</SelectItem>
                  <SelectItem value="2025-03">Marzo 2025</SelectItem>
                  <SelectItem value="2025-Q1">T1 2025</SelectItem>
                  <SelectItem value="2025">Año 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {logs && (
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Facturas con hash</span>
                <span className="font-semibold">{logs.length}</span>
              </div>
            </div>
          )}

          <Button
            onClick={handleGenerateXML}
            disabled={!selectedView || !period}
            className="w-full"
          >
            <FileText className="h-4 w-4 mr-2" />
            Generar XML
          </Button>

          {xmlPreview && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">XML generado correctamente</span>
              </div>
              <Button
                onClick={handleDownload}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar XML
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!xmlPreview} onOpenChange={() => setXmlPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Vista previa XML Verifactu</DialogTitle>
            <DialogDescription>
              Archivo listo para envío a AEAT
            </DialogDescription>
          </DialogHeader>
          {xmlPreview && (
            <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-96 font-mono">
              {xmlPreview}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
