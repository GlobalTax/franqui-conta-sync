import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, X, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InvoicePDFUploaderProps {
  invoiceId?: string;
  invoiceType: "received" | "issued";
  centroCode: string;
  currentPath?: string | null;
  onUploadComplete?: (path: string) => void;
}

export const InvoicePDFUploader = ({
  invoiceId,
  invoiceType,
  centroCode,
  currentPath,
  onUploadComplete,
}: InvoicePDFUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!file.type.includes("pdf")) {
      toast.error("Solo se permiten archivos PDF");
      return;
    }

    setUploading(true);
    try {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const fileName = `${invoiceId}_${Date.now()}.pdf`;
      const path = `${invoiceType}/${centroCode}/${year}/${month}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("invoice-documents")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Update invoice with document path only if invoiceId exists
      if (invoiceId) {
        const table = invoiceType === "received" ? "invoices_received" : "invoices_issued";
        const column = invoiceType === "received" ? "document_path" : "pdf_path";
        
        const { error: updateError } = await supabase
          .from(table)
          .update({ [column]: path })
          .eq("id", invoiceId);

        if (updateError) throw updateError;
      }

      toast.success("PDF subido correctamente");
      onUploadComplete?.(path);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error(`Error al subir el archivo: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const handleDownload = async () => {
    if (!currentPath) return;

    try {
      const { data, error } = await supabase.storage
        .from("invoice-documents")
        .download(currentPath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = currentPath.split("/").pop() || "factura.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Error downloading file:", error);
      toast.error(`Error al descargar el archivo: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!currentPath) return;

    if (!confirm("¿Estás seguro de eliminar este PDF?")) return;

    try {
      const { error: deleteError } = await supabase.storage
        .from("invoice-documents")
        .remove([currentPath]);

      if (deleteError) throw deleteError;

      // Update invoice to remove document path only if invoiceId exists
      if (invoiceId) {
        const table = invoiceType === "received" ? "invoices_received" : "invoices_issued";
        const column = invoiceType === "received" ? "document_path" : "pdf_path";
        
        const { error: updateError } = await supabase
          .from(table)
          .update({ [column]: null })
          .eq("id", invoiceId);

        if (updateError) throw updateError;
      }

      toast.success("PDF eliminado correctamente");
      onUploadComplete?.(null as any);
    } catch (error: any) {
      console.error("Error deleting file:", error);
      toast.error(`Error al eliminar el archivo: ${error.message}`);
    }
  };

  if (currentPath) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">PDF de factura</p>
              <p className="text-sm text-muted-foreground">
                {currentPath.split("/").pop()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`p-8 border-2 border-dashed transition-colors ${
        dragActive ? "border-primary bg-primary/5" : "border-border"
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Upload className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div>
          <p className="text-lg font-medium text-foreground">
            Arrastra tu PDF aquí
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            o haz clic para seleccionar un archivo
          </p>
        </div>
        <div>
          <input
            type="file"
            id="pdf-upload"
            accept=".pdf"
            onChange={handleChange}
            className="hidden"
            disabled={uploading}
          />
          <label htmlFor="pdf-upload">
            <Button type="button" variant="outline" disabled={uploading} asChild>
              <span>
                {uploading ? "Subiendo..." : "Seleccionar PDF"}
              </span>
            </Button>
          </label>
        </div>
      </div>
    </Card>
  );
};
