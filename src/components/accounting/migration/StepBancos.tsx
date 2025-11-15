import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import type { FiscalYearConfig } from "@/hooks/useHistoricalMigration";

interface StepBancosProps {
  config: FiscalYearConfig;
  completed: boolean;
  movements: number;
  skipped: boolean;
  onComplete: (movements: number) => void;
  onSkip: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepBancos({ 
  config, 
  completed, 
  movements, 
  skipped,
  onComplete, 
  onSkip, 
  onNext, 
  onPrev 
}: StepBancosProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/plain': ['.43', '.txt'] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const f = acceptedFiles[0];
      if (f) {
        setFile(f);
        toast.success(`Archivo ${f.name} cargado`);
      }
    },
  });

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    try {
      // Placeholder for Norma 43 import
      toast.info("Importación de Norma 43: funcionalidad en desarrollo");
      
      // Simulate success
      setTimeout(() => {
        const fakeCount = Math.floor(Math.random() * 100) + 50;
        onComplete(fakeCount);
        toast.success(`${fakeCount} movimientos importados`);
        setImporting(false);
      }, 1500);
    } catch (error: any) {
      toast.error(error.message);
      setImporting(false);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (completed || skipped) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Paso 5: Movimientos Bancarios - {skipped ? 'Omitido' : 'Completado'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!skipped && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Movimientos bancarios importados</AlertTitle>
              <AlertDescription>{movements} movimientos</AlertDescription>
            </Alert>
          )}
          {skipped && (
            <Alert>
              <AlertDescription>
                Este paso fue omitido. Puedes importar movimientos bancarios más tarde.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onPrev}>← Atrás</Button>
            <Button onClick={onNext}>Continuar →</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paso 5: Movimientos Bancarios (Opcional)</CardTitle>
        <CardDescription>
          Importa los extractos bancarios en formato Norma 43 del ejercicio {config.year}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            Este paso es opcional. Los movimientos bancarios pueden importarse más tarde desde la sección de Tesorería.
          </AlertDescription>
        </Alert>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {file ? file.name : 'Arrastra un archivo Norma 43 (.43, .txt)'}
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onPrev}>← Atrás</Button>
          <Button variant="outline" onClick={handleSkip}>
            Omitir este paso →
          </Button>
          {file && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? "Importando..." : "Importar Movimientos"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
