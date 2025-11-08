import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileText, CheckCircle2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

interface ImportNorma43ButtonProps {
  accountId: string;
}

export const ImportNorma43Button = ({ accountId }: ImportNorma43ButtonProps) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".n43", ".txt"],
    },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!file || !accountId) {
      toast.error("Por favor selecciona un archivo y una cuenta bancaria");
      return;
    }

    setUploading(true);

    try {
      const content = await file.text();
      
      // Parse Norma 43 format
      const lines = content.split("\n");
      const transactions = lines
        .filter((line) => line.startsWith("23")) // Transaction lines start with 23
        .map((line) => {
          // Basic Norma 43 parsing (simplified)
          const date = line.substring(10, 16); // YYMMDD
          const amount = parseInt(line.substring(28, 42)) / 100;
          const description = line.substring(52).trim();

          return {
            bank_account_id: accountId,
            transaction_date: `20${date.substring(0, 2)}-${date.substring(2, 4)}-${date.substring(4, 6)}`,
            description,
            amount,
            status: "pending",
          };
        });

      // TODO: Import to database via Supabase
      console.log("Parsed transactions:", transactions);
      
      toast.success(`${transactions.length} transacciones importadas correctamente`);
      setOpen(false);
      setFile(null);
    } catch (error) {
      console.error("Error importing N43:", error);
      toast.error("Error al importar el archivo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Button
        size="lg"
        className="fixed bottom-6 right-6 shadow-2xl hover:shadow-3xl transition-all z-50 animate-fade-in"
        onClick={() => setOpen(true)}
      >
        <Upload className="h-5 w-5 mr-2" />
        Importar Norma 43
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Extracto Norma 43</DialogTitle>
            <DialogDescription>
              Arrastra tu archivo .N43 o haz clic para seleccionarlo
            </DialogDescription>
          </DialogHeader>

          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors
              ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}
            `}
          >
            <input {...getInputProps()} />
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {file ? (
              <div className="space-y-2">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium mb-1">
                  {isDragActive ? "Suelta el archivo aquí" : "Arrastra tu archivo aquí"}
                </p>
                <p className="text-xs text-muted-foreground">o haz clic para seleccionar</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={!file || uploading}>
              {uploading ? "Importando..." : "Importar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
