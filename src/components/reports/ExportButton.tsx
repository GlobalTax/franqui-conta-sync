import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { utils, writeFile } from "xlsx";

interface ExportButtonProps {
  printRef: React.RefObject<HTMLDivElement>;
  data: any[];
  filename: string;
  headers?: string[];
}

export const ExportButton = ({ printRef, data, filename, headers }: ExportButtonProps) => {
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: filename,
  });

  const handleExportExcel = () => {
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Datos");
    writeFile(wb, `${filename}.xlsx`);
  };

  const handleExportCSV = () => {
    const ws = utils.json_to_sheet(data);
    const csv = utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
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
        <DropdownMenuItem onClick={handlePrint}>Exportar PDF</DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>Exportar Excel</DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV}>Exportar CSV</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
