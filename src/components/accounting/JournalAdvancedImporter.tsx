import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Eye, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JournalAdvancedImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centroCode: string;
  onSuccess?: () => void;
}

interface ImportPreview {
  stats: {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    total_entries: number;
    total_debit: number;
    total_credit: number;
  };
  entries: Array<{
    entry_date: string;
    description: string;
    lines: any[];
    totals: { debit: number; credit: number; balanced: boolean };
  }>;
  errors: Array<{
    row_number: number;
    field: string;
    message: string;
    value?: any;
  }>;
}

export function JournalAdvancedImporter({ 
  open, 
  onOpenChange, 
  centroCode,
  onSuccess 
}: JournalAdvancedImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv') {
      toast.error('Formato no soportado. Use archivos CSV');
      return;
    }

    setFile(selectedFile);
    setPreview(null);
    setUploadedPath(null);
  };

  const handleUploadAndPreview = async () => {
    if (!file) return;

    try {
      setUploadProgress(10);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const timestamp = Date.now();
      const path = `${user.id}/${timestamp}_${file.name}`;

      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('journal-imports')
        .upload(path, file);

      if (uploadError) throw uploadError;

      setUploadedPath(path);
      setUploadProgress(60);

      const { data, error } = await supabase.functions.invoke('journal-import', {
        body: {
          path,
          centro_code: centroCode,
          dry_run: true,
        },
      });

      setUploadProgress(100);

      if (error) throw error;

      setPreview(data);
      
      if (data.errors.length === 0) {
        toast.success(`Preview OK: ${data.stats.total_entries} asientos listos`);
      } else {
        toast.warning(`Preview con ${data.errors.length} errores de validación`);
      }

    } catch (error: any) {
      toast.error(error.message || 'Error en preview');
      console.error(error);
    } finally {
      setUploadProgress(0);
    }
  };

  const handleImport = async () => {
    if (!uploadedPath) return;

    try {
      setImporting(true);

      const { data, error } = await supabase.functions.invoke('journal-import', {
        body: {
          path: uploadedPath,
          centro_code: centroCode,
          dry_run: false,
        },
      });

      if (error) throw error;

      toast.success(`Importación exitosa: ${data.created_entry_ids.length} asientos creados`);
      
      await supabase.storage.from('journal-imports').remove([uploadedPath]);
      
      onOpenChange(false);
      setFile(null);
      setPreview(null);
      setUploadedPath(null);
      onSuccess?.();

    } catch (error: any) {
      toast.error(error.message || 'Error en importación');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importación Avanzada de Diario
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Archivo CSV</Label>
            <Input 
              type="file" 
              accept=".csv" 
              onChange={handleFileSelect}
            />
            <p className="text-xs text-muted-foreground">
              Columnas esperadas: entry_date, description, account_code, debit, credit, line_description
            </p>
          </div>

          {uploadProgress > 0 && (
            <Progress value={uploadProgress} className="w-full" />
          )}

          <Button 
            onClick={handleUploadAndPreview}
            disabled={!file || uploadProgress > 0}
            variant="outline"
            className="w-full"
          >
            <Eye className="h-4 w-4 mr-2" />
            Previsualizar Importación
          </Button>

          {preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-3 bg-primary/5">
                  <div className="text-2xl font-bold text-primary">
                    {preview.stats.total_entries}
                  </div>
                  <div className="text-sm text-muted-foreground">Asientos</div>
                </div>
                <div className="border rounded-lg p-3 bg-success/5">
                  <div className="text-2xl font-bold text-success">
                    {preview.stats.valid_rows}
                  </div>
                  <div className="text-sm text-muted-foreground">Líneas válidas</div>
                </div>
                <div className="border rounded-lg p-3 bg-destructive/5">
                  <div className="text-2xl font-bold text-destructive">
                    {preview.stats.invalid_rows}
                  </div>
                  <div className="text-sm text-muted-foreground">Errores</div>
                </div>
              </div>

              {preview.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">
                      {preview.errors.length} errores de validación:
                    </div>
                    <ul className="list-disc list-inside text-sm space-y-1 max-h-40 overflow-y-auto">
                      {preview.errors.slice(0, 20).map((err, i) => (
                        <li key={i}>
                          Fila {err.row_number}, campo {err.field}: {err.message}
                        </li>
                      ))}
                    </ul>
                    {preview.errors.length > 20 && (
                      <div className="text-xs mt-2">
                        ... y {preview.errors.length - 20} errores más
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="border rounded-lg p-4 bg-muted/30 max-h-96 overflow-y-auto">
                <div className="text-sm font-semibold mb-3">
                  Vista Previa de Asientos:
                </div>
                {preview.entries.slice(0, 10).map((entry, idx) => (
                  <div key={idx} className="border-b py-2 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <strong>{entry.entry_date}</strong> • {entry.description}
                      </div>
                      <div className={`text-xs font-mono ${entry.totals.balanced ? 'text-success' : 'text-destructive'}`}>
                        D: {entry.totals.debit.toFixed(2)} | H: {entry.totals.credit.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground ml-4 mt-1">
                      {entry.lines.length} líneas
                    </div>
                  </div>
                ))}
                {preview.entries.length > 10 && (
                  <div className="text-center text-xs text-muted-foreground py-2">
                    ... y {preview.entries.length - 10} asientos más
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={importing}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!preview || preview.errors.length > 0 || importing}
          >
            {importing ? 'Importando...' : `Importar ${preview?.stats.total_entries || 0} asientos`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
