/**
 * TestingPanel Component
 * 
 * Purpose: Panel de testing para generación de datos sintéticos y validación del wizard
 * 
 * Features:
 * - Generadores de CSVs de prueba para cada tipo
 * - Selector de volumen de datos (small, medium, large)
 * - Descarga directa de archivos generados
 * - Validación automatizada opcional
 * - Dashboard de estadísticas de testing
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, TestTube2, CheckCircle2, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { 
  generateAperturaCSV, 
  generateDiarioCSV, 
  generateIVAEmitidasCSV, 
  generateIVARecibidasCSV,
  generateNorma43File,
  downloadTestFile,
  type TestDataSize 
} from "@/lib/migration/testDataGenerators";

interface TestingPanelProps {
  centroCode: string;
  year: number;
  onClose?: () => void;
}

export function TestingPanel({ centroCode, year, onClose }: TestingPanelProps) {
  const [size, setSize] = useState<TestDataSize>('small');
  const [generatedFiles, setGeneratedFiles] = useState<string[]>([]);

  const handleGenerateApertura = () => {
    const csv = generateAperturaCSV({ year, centroCode, size });
    const filename = `test_apertura_${size}_${year}.csv`;
    downloadTestFile(csv, filename);
    setGeneratedFiles(prev => [...prev, filename]);
    toast.success(`Archivo generado: ${filename}`);
  };

  const handleGenerateDiario = () => {
    const csv = generateDiarioCSV({ year, centroCode, size });
    const filename = `test_diario_${size}_${year}.csv`;
    downloadTestFile(csv, filename);
    setGeneratedFiles(prev => [...prev, filename]);
    toast.success(`Archivo generado: ${filename}`);
  };

  const handleGenerateIVAEmitidas = () => {
    const csv = generateIVAEmitidasCSV({ year, centroCode, size });
    const filename = `test_iva_emitidas_${size}_${year}.csv`;
    downloadTestFile(csv, filename);
    setGeneratedFiles(prev => [...prev, filename]);
    toast.success(`Archivo generado: ${filename}`);
  };

  const handleGenerateIVARecibidas = () => {
    const csv = generateIVARecibidasCSV({ year, centroCode, size });
    const filename = `test_iva_recibidas_${size}_${year}.csv`;
    downloadTestFile(csv, filename);
    setGeneratedFiles(prev => [...prev, filename]);
    toast.success(`Archivo generado: ${filename}`);
  };

  const handleGenerateNorma43 = () => {
    const content = generateNorma43File({ year, centroCode, size });
    const filename = `test_norma43_${size}_${year}.txt`;
    downloadTestFile(content, filename, 'txt');
    setGeneratedFiles(prev => [...prev, filename]);
    toast.success(`Archivo generado: ${filename}`);
  };

  const handleGenerateAll = () => {
    handleGenerateApertura();
    handleGenerateDiario();
    handleGenerateIVAEmitidas();
    handleGenerateIVARecibidas();
    handleGenerateNorma43();
    toast.success('Todos los archivos de prueba generados');
  };

  const sizeInfo = {
    small: { label: 'Pequeño', desc: '10-20 registros', icon: '🔹' },
    medium: { label: 'Mediano', desc: '30-100 registros', icon: '🔸' },
    large: { label: 'Grande', desc: '100-500 registros', icon: '🔶' },
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TestTube2 className="h-5 w-5 text-primary" />
              Panel de Testing - Migración Histórica
            </CardTitle>
            <CardDescription>
              Genera datos sintéticos para probar el wizard de migración
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cerrar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuración */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Centro</label>
            <div className="p-2 bg-muted rounded text-sm">
              {centroCode || 'No seleccionado'}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ejercicio</label>
            <div className="p-2 bg-muted rounded text-sm">
              {year}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Volumen de datos</label>
            <Select value={size} onValueChange={(v) => setSize(v as TestDataSize)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sizeInfo).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    {info.icon} {info.label} - {info.desc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Generadores */}
        <Tabs defaultValue="individual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="individual">Generadores Individuales</TabsTrigger>
            <TabsTrigger value="batch">Generación en Lote</TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="space-y-3 mt-4">
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertTitle>Archivos de Prueba</AlertTitle>
              <AlertDescription>
                Genera archivos CSV y TXT con datos sintéticos válidos para cada paso del wizard
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={handleGenerateApertura}
                className="justify-start h-auto py-3"
              >
                <div className="flex flex-col items-start w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Download className="h-4 w-4" />
                    <span className="font-semibold">Saldo de Apertura</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    CSV con cuentas y saldos iniciales
                  </span>
                </div>
              </Button>

              <Button 
                variant="outline" 
                onClick={handleGenerateDiario}
                className="justify-start h-auto py-3"
              >
                <div className="flex flex-col items-start w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Download className="h-4 w-4" />
                    <span className="font-semibold">Libro Diario</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    CSV con asientos contables
                  </span>
                </div>
              </Button>

              <Button 
                variant="outline" 
                onClick={handleGenerateIVAEmitidas}
                className="justify-start h-auto py-3"
              >
                <div className="flex flex-col items-start w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Download className="h-4 w-4" />
                    <span className="font-semibold">IVA Emitidas</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    CSV con facturas emitidas
                  </span>
                </div>
              </Button>

              <Button 
                variant="outline" 
                onClick={handleGenerateIVARecibidas}
                className="justify-start h-auto py-3"
              >
                <div className="flex flex-col items-start w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Download className="h-4 w-4" />
                    <span className="font-semibold">IVA Recibidas</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    CSV con facturas recibidas
                  </span>
                </div>
              </Button>

              <Button 
                variant="outline" 
                onClick={handleGenerateNorma43}
                className="justify-start h-auto py-3"
              >
                <div className="flex flex-col items-start w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Download className="h-4 w-4" />
                    <span className="font-semibold">Norma 43</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    TXT con movimientos bancarios
                  </span>
                </div>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="batch" className="space-y-4 mt-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Generación Masiva</AlertTitle>
              <AlertDescription>
                Genera todos los archivos de prueba necesarios para una migración completa
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Archivos a generar:</span>
                <Badge variant="secondary">5 archivos</Badge>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✓ Saldo de apertura (CSV)</li>
                <li>✓ Libro diario (CSV)</li>
                <li>✓ IVA emitidas (CSV)</li>
                <li>✓ IVA recibidas (CSV)</li>
                <li>✓ Movimientos bancarios (TXT Norma 43)</li>
              </ul>
            </div>

            <Button 
              onClick={handleGenerateAll} 
              className="w-full"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Generar Todos los Archivos
            </Button>
          </TabsContent>
        </Tabs>

        {/* Archivos generados */}
        {generatedFiles.length > 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Archivos Generados ({generatedFiles.length})</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                {generatedFiles.slice(-5).map((file, i) => (
                  <div key={i} className="text-xs">• {file}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Instrucciones */}
        <Alert>
          <AlertDescription className="text-xs space-y-2">
            <p><strong>📋 Cómo usar:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Selecciona el volumen de datos deseado</li>
              <li>Genera los archivos necesarios</li>
              <li>Los archivos se descargarán automáticamente</li>
              <li>Úsalos en el wizard de migración para testing</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
