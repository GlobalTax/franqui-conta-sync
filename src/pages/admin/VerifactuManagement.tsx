import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useVerifactuLogs, 
  useGenerateInvoiceHash, 
  useVerifyHashChain,
  useGenerateFacturaeXML 
} from '@/hooks/useVerifactu';
import { useComplianceAlerts } from '@/hooks/useComplianceAlerts';
import { ComplianceAlertsPanel } from '@/components/compliance/ComplianceAlertsPanel';
import { VerifactuBadge } from '@/components/compliance/VerifactuBadge';
import { 
  Shield, 
  Download, 
  FileText,
  CheckCircle,
  AlertTriangle 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

export default function VerifactuManagement() {
  const [selectedCentro, setSelectedCentro] = useState<string>('');
  const [invoiceType, setInvoiceType] = useState<'issued' | 'received'>('issued');
  
  const { data: logs, isLoading: logsLoading } = useVerifactuLogs(selectedCentro, invoiceType);
  const { data: alerts } = useComplianceAlerts({ resolved: false });
  const generateHashMutation = useGenerateInvoiceHash();
  const verifyChainMutation = useVerifyHashChain();
  const generateXMLMutation = useGenerateFacturaeXML();

  const handleVerifyChain = () => {
    if (!selectedCentro) return;
    verifyChainMutation.mutate({
      centro_code: selectedCentro,
      invoice_type: invoiceType,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión Verifactu</h1>
          <p className="text-muted-foreground">
            Sistema de integridad y cumplimiento normativo AEAT
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleVerifyChain}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Verificar Cadena
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Facturas con Hash
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Facturas en cadena de integridad
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alertas Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {alerts?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requieren atención
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Verificaciones Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs?.filter(l => l.verification_date && 
                new Date(l.verification_date).toDateString() === new Date().toDateString()
              ).length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cadenas verificadas
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Logs de Integridad</TabsTrigger>
          <TabsTrigger value="alerts">Alertas de Cumplimiento</TabsTrigger>
          <TabsTrigger value="xml">Archivos Facturae</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cadena de Integridad Verifactu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Factura</Label>
                    <Select value={invoiceType} onValueChange={(v: any) => setInvoiceType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="issued">Emitidas</SelectItem>
                        <SelectItem value="received">Recibidas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {logsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : logs && logs.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium">#</th>
                          <th className="text-left p-3 text-sm font-medium">Factura</th>
                          <th className="text-left p-3 text-sm font-medium">Fecha</th>
                          <th className="text-left p-3 text-sm font-medium">Hash</th>
                          <th className="text-left p-3 text-sm font-medium">Estado</th>
                          <th className="text-left p-3 text-sm font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className="border-t hover:bg-muted/50">
                            <td className="p-3 text-sm">{log.chain_position}</td>
                            <td className="p-3 text-sm font-medium">{log.invoice_number}</td>
                            <td className="p-3 text-sm">
                              {format(new Date(log.invoice_date), 'dd/MM/yyyy', { locale: es })}
                            </td>
                            <td className="p-3 text-sm font-mono text-xs">
                              {log.hash_sha256.substring(0, 16)}...
                            </td>
                            <td className="p-3">
                              {log.verified ? (
                                <Badge variant="default">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Verificado
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Pendiente</Badge>
                              )}
                            </td>
                            <td className="p-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateXMLMutation.mutate({
                                  invoice_id: log.invoice_id,
                                  invoice_type: log.invoice_type,
                                })}
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                XML
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay logs de integridad registrados</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <ComplianceAlertsPanel />
        </TabsContent>

        <TabsContent value="xml">
          <Card>
            <CardHeader>
              <CardTitle>Archivos Facturae XML</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Funcionalidad de gestión de archivos XML en desarrollo</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
