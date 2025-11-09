import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ImportWizard } from "@/components/imports/ImportWizard";
import { ImportHistoryTable } from "@/components/imports/ImportHistoryTable";
import { History, Upload } from "lucide-react";
import {
  ImportModule,
  useImportHistory,
  useStartImport,
  useStageDiarioRows,
  usePostDiarioImport,
  useImportRun,
  ImportRun,
} from "@/hooks/useImportRun";
import { toast } from "sonner";
import Papa from "papaparse";

type ViewMode = 'import' | 'history';

export default function Imports() {
  const [activeModule, setActiveModule] = useState<ImportModule>('diario');
  const [viewMode, setViewMode] = useState<ViewMode>('import');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [currentImportRunId, setCurrentImportRunId] = useState<string | null>(null);

  const { data: importHistory = [] } = useImportHistory(activeModule);
  const { data: currentImportRun } = useImportRun(currentImportRunId);
  const startImport = useStartImport();
  const stageDiarioRows = useStageDiarioRows();
  const postDiarioImport = usePostDiarioImport();

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    
    // Parse CSV
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedData(results.data);
        toast.success(`${results.data.length} filas detectadas`);
      },
      error: (error) => {
        toast.error(`Error al parsear archivo: ${error.message}`);
      },
    });
  };

  const handleStage = async () => {
    if (!selectedFile || parsedData.length === 0) {
      toast.error('No hay datos para procesar');
      return;
    }

    try {
      // Start import run
      const importRunId = await startImport.mutateAsync({
        module: activeModule,
        source: selectedFile.name.endsWith('.csv') ? 'csv' : 'xlsx',
        filename: selectedFile.name,
      });

      setCurrentImportRunId(importRunId);

      // Stage rows (only for diario for now)
      if (activeModule === 'diario') {
        await stageDiarioRows.mutateAsync({
          importRunId,
          rows: parsedData,
        });
      }
    } catch (error) {
      console.error('Staging error:', error);
    }
  };

  const handlePost = async () => {
    if (!currentImportRunId) {
      toast.error('No hay importación activa');
      return;
    }

    try {
      if (activeModule === 'diario') {
        await postDiarioImport.mutateAsync(currentImportRunId);
      }
      
      // Reset state
      setSelectedFile(null);
      setParsedData([]);
      setCurrentImportRunId(null);
    } catch (error) {
      console.error('Posting error:', error);
    }
  };

  const getCurrentStep = (): 'upload' | 'pending' | 'staging' | 'posting' | 'completed' | 'error' => {
    if (!currentImportRun) return 'upload';
    if (currentImportRun.status === 'pending') return 'pending';
    return currentImportRun.status as 'staging' | 'posting' | 'completed' | 'error';
  };

  const handleDownloadErrors = (importRun: ImportRun) => {
    if (importRun.error_log) {
      const errors = Array.isArray(importRun.error_log) ? importRun.error_log : [importRun.error_log];
      const element = document.createElement('a');
      const file = new Blob([JSON.stringify(errors, null, 2)], { type: 'application/json' });
      element.href = URL.createObjectURL(file);
      element.download = `errors-${importRun.id}.json`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importaciones</h1>
          <p className="text-muted-foreground mt-1">
            Importa datos históricos desde archivos CSV o XLSX
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'import' ? 'default' : 'outline'}
            onClick={() => setViewMode('import')}
          >
            <Upload className="h-4 w-4 mr-2" />
            Nueva importación
          </Button>
          <Button
            variant={viewMode === 'history' ? 'default' : 'outline'}
            onClick={() => setViewMode('history')}
          >
            <History className="h-4 w-4 mr-2" />
            Historial
          </Button>
        </div>
      </div>

      <Tabs value={activeModule} onValueChange={(v) => setActiveModule(v as ImportModule)}>
        <TabsList>
          <TabsTrigger value="diario">Diario</TabsTrigger>
          <TabsTrigger value="sumas_saldos" disabled>
            Sumas y Saldos
          </TabsTrigger>
          <TabsTrigger value="iva_emitidas" disabled>
            Libro IVA Emitidas
          </TabsTrigger>
          <TabsTrigger value="iva_recibidas" disabled>
            Libro IVA Recibidas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diario" className="space-y-6">
          {viewMode === 'import' ? (
            <Card>
              <CardHeader>
                <CardTitle>Importar Libro Diario</CardTitle>
                <CardDescription>
                  Formato CSV esperado: fecha, cuenta, concepto, debe, haber, centro_code, documento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImportWizard
                  module="diario"
                  onFileSelect={handleFileSelect}
                  onStage={handleStage}
                  onPost={handlePost}
                  currentStep={getCurrentStep()}
                  progress={
                    currentImportRun?.stats?.rows_inserted && currentImportRun?.stats?.rows_total
                      ? (currentImportRun.stats.rows_inserted / currentImportRun.stats.rows_total) * 100
                      : 0
                  }
                  stats={currentImportRun?.stats}
                  errors={currentImportRun?.error_log ? [currentImportRun.error_log] : []}
                />

                {currentImportRun?.status === 'completed' && (
                  <div className="mt-6 flex justify-between items-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedFile(null);
                        setParsedData([]);
                        setCurrentImportRunId(null);
                      }}
                    >
                      Nueva importación
                    </Button>
                    <Button onClick={() => setViewMode('history')}>
                      Ver historial
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Historial de Importaciones</CardTitle>
                <CardDescription>
                  Consulta el estado y resultados de importaciones anteriores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImportHistoryTable
                  imports={importHistory}
                  onDownloadErrors={handleDownloadErrors}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
