import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText } from "lucide-react";
import { useReactToPrint } from "react-to-print";


interface ExportButtonProps {
  printRef: React.RefObject<HTMLDivElement>;
  data: any[];
  filename: string;
  headers?: string[];
  onExportOfficialPDF?: () => void;
  showOfficialPDF?: boolean;
  onExportFormattedExcel?: () => void;
}

export const ExportButton = ({ 
  printRef, 
  data, 
  filename, 
  headers,
  onExportOfficialPDF,
  showOfficialPDF = false,
  onExportFormattedExcel
}: ExportButtonProps) => {
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: filename,
  });

  const handleExportExcel = async () => {
    const { utils, writeFile } = await import("xlsx");
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Datos");
    writeFile(wb, `${filename}.xlsx`);
  };

  const handleExportCSV = async () => {
    const { utils } = await import("xlsx");
    const ws = utils.json_to_sheet(data);
    // Usar punto y coma como separador (estándar español) para evitar
    // conflictos con la coma decimal usada en formato es-ES
    const csv = utils.sheet_to_csv(ws, { FS: ";" });
    // BOM para que Excel reconozca UTF-8
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {showOfficialPDF && onExportOfficialPDF && (
          <>
            <DropdownMenuItem onClick={onExportOfficialPDF}>
              <FileText className="mr-2 h-4 w-4" />
              PDF Oficial (Formato Legal)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handlePrint}>Exportar PDF Simple</DropdownMenuItem>
        {onExportFormattedExcel && (
          <DropdownMenuItem onClick={onExportFormattedExcel}>
            <FileText className="mr-2 h-4 w-4" />
            Excel Profesional
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleExportExcel}>Exportar Excel (básico)</DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV}>Exportar CSV</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
