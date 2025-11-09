import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { ImportModule, ImportSource } from "@/hooks/useImportRun";

interface ImportWizardProps {
  module: ImportModule;
  onFileSelect: (file: File) => void;
  onStage: () => Promise<void>;
  onPost: () => Promise<void>;
  currentStep: 'upload' | 'pending' | 'staging' | 'posting' | 'completed' | 'error';
  progress?: number;
  stats?: {
    rows_total?: number;
    rows_inserted?: number;
    rows_error?: number;
    entries_created?: number;
  };
  errors?: any[];
}

export function ImportWizard({
  module,
  onFileSelect,
  onStage,
  onPost,
  currentStep,
  progress = 0,
  stats,
  errors = [],
}: ImportWizardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
  });

  const getStepIcon = (step: string) => {
    if (currentStep === 'error') return <AlertCircle className="h-5 w-5 text-destructive" />;
    if (currentStep === 'completed') return <CheckCircle2 className="h-5 w-5 text-success" />;
    
    switch (step) {
      case 'upload':
        return <Upload className="h-5 w-5" />;
      case 'staging':
      case 'posting':
        return <FileCheck className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getStepStatus = (step: string) => {
    const steps = ['upload', 'staging', 'posting', 'completed'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(step);
    
    if (currentStep === 'error') return 'error';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {['upload', 'staging', 'posting', 'completed'].map((step, index) => (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  getStepStatus(step) === 'completed'
                    ? 'bg-success border-success text-success-foreground'
                    : getStepStatus(step) === 'active'
                    ? 'bg-primary border-primary text-primary-foreground'
                    : getStepStatus(step) === 'error'
                    ? 'bg-destructive border-destructive text-destructive-foreground'
                    : 'bg-background border-muted-foreground/25 text-muted-foreground'
                }`}
              >
                {getStepIcon(step)}
              </div>
              <span className="text-xs mt-2 text-muted-foreground capitalize">
                {step === 'upload' ? 'Subir' : step === 'staging' ? 'Validar' : step === 'posting' ? 'Contabilizar' : 'Completado'}
              </span>
            </div>
            {index < 3 && (
              <div
                className={`h-0.5 flex-1 ${
                  getStepStatus(['upload', 'staging', 'posting', 'completed'][index + 1]) !== 'pending'
                    ? 'bg-success'
                    : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Upload Section */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Subir archivo</CardTitle>
            <CardDescription>
              Arrastra tu archivo CSV o XLSX o haz clic para seleccionar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {selectedFile ? (
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isDragActive
                      ? 'Suelta el archivo aquí'
                      : 'Arrastra un archivo o haz clic para seleccionar'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Formatos soportados: CSV, XLSX
                  </p>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="mt-4 flex justify-end">
                <Button onClick={onStage}>
                  Continuar a validación
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Staging/Posting Progress */}
      {(currentStep === 'staging' || currentStep === 'posting') && (
        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 'staging' ? 'Validando datos...' : 'Contabilizando...'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="w-full" />
            {stats && (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{stats.rows_total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">{stats.rows_inserted || 0}</p>
                  <p className="text-xs text-muted-foreground">Procesadas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{stats.rows_error || 0}</p>
                  <p className="text-xs text-muted-foreground">Errores</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completed */}
      {currentStep === 'completed' && stats && (
        <Alert className="border-success">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription>
            Importación completada: {stats.entries_created || 0} asientos contables creados
          </AlertDescription>
        </Alert>
      )}

      {/* Errors */}
      {currentStep === 'error' && errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Se encontraron {errors.length} errores. Descarga el reporte para más detalles.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
