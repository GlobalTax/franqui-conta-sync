import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface ErrorsDownloadButtonProps {
  errors: any[];
  filename?: string;
}

export function ErrorsDownloadButton({ errors, filename = 'errores-importacion' }: ErrorsDownloadButtonProps) {
  const handleDownload = () => {
    try {
      if (!errors || errors.length === 0) {
        toast.error('No hay errores para descargar');
        return;
      }

      // Convert errors to CSV
      const headers = Object.keys(errors[0]);
      const csvContent = [
        headers.join(','),
        ...errors.map(error => 
          headers.map(header => {
            const value = error[header];
            // Handle nested objects/arrays
            if (typeof value === 'object' && value !== null) {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            // Escape commas and quotes
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Archivo de errores descargado');
    } catch (error) {
      console.error('Error downloading errors:', error);
      toast.error('Error al descargar el archivo de errores');
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={!errors || errors.length === 0}
    >
      <Download className="h-4 w-4 mr-2" />
      Descargar errores ({errors?.length || 0})
    </Button>
  );
}
