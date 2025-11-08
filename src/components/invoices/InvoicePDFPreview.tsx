import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, FileText, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InvoicePDFPreviewProps {
  documentPath: string | null;
  className?: string;
}

export function InvoicePDFPreview({
  documentPath,
  className,
}: InvoicePDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentPath) return;

    const loadPDF = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.storage
          .from("invoice-documents")
          .createSignedUrl(documentPath, 3600); // 1 hour expiry

        if (error) throw error;
        setPdfUrl(data.signedUrl);
      } catch (err: any) {
        console.error("Error loading PDF:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [documentPath]);

  if (!documentPath) {
    return (
      <Card className="h-[400px] flex items-center justify-center bg-muted/30 border-dashed">
        <div className="text-center space-y-3">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <div>
            <p className="font-medium text-foreground">Sin documento adjunto</p>
            <p className="text-sm text-muted-foreground mt-1">
              No hay PDF disponible para esta factura
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="h-[400px] flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-3">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando documento...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[400px] flex items-center justify-center bg-destructive/10 border-destructive/20">
        <div className="text-center space-y-3 px-4">
          <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
          <div>
            <p className="font-medium text-destructive">Error al cargar PDF</p>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`border-border/40 shadow-sm overflow-hidden ${className}`}>
      <ScrollArea className="h-[600px]">
        <iframe
          src={pdfUrl || ""}
          className="w-full h-[600px] border-0"
          title="Vista previa de factura"
        />
      </ScrollArea>
    </Card>
  );
}
