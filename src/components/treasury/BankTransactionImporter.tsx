import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useBankTransactions, BankTransaction } from "@/hooks/useBankTransactions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BankTransactionImporterProps {
  accountId: string;
  onImportComplete?: () => void;
}

export const BankTransactionImporter = ({ accountId, onImportComplete }: BankTransactionImporterProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const { importTransactions } = useBankTransactions();

  const parseNorma43Preview = (text: string): any[] => {
    // REFACTORED: Usar Norma43Parser del dominio para preview
    try {
      const { Norma43Parser } = require('@/domain/banking/services/Norma43Parser');
      const result = Norma43Parser.parse(text);
      
      // Transformar a formato de preview
      return result.transactions.map((tx: any) => ({
        fecha: tx.transactionDate,
        "fecha valor": tx.valueDate,
        descripcion: tx.description,
        referencia: tx.reference1 || tx.documentNumber,
        importe: tx.amount,
        saldo: null,
      }));
    } catch (error) {
      console.error('Error parsing Norma43:', error);
      return [];
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(";").map((h) => h.trim().toLowerCase());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(";");
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || "";
      });

      rows.push(row);
    }

    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isCSV = selectedFile.name.endsWith(".csv");
    const isN43 = selectedFile.name.endsWith(".n43") || selectedFile.name.endsWith(".txt");
    
    if (!isCSV && !isN43) {
      toast.error("Solo se permiten archivos CSV o Norma 43 (.n43, .txt)");
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      let parsed: any[] = [];
      
      if (isN43 || text.startsWith("11") || text.startsWith("22")) {
        // Norma 43 format
        parsed = parseNorma43Preview(text);
      } else {
        // CSV format
        parsed = parseCSV(text);
      }
      
      setPreview(parsed.slice(0, 5)); // Show first 5 rows
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = () => {
    if (!file || preview.length === 0) {
      toast.error("No hay datos para importar");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      let parsed: any[] = [];
      
      if (file.name.endsWith(".n43") || file.name.endsWith(".txt") || text.startsWith("11") || text.startsWith("22")) {
        parsed = parseNorma43Preview(text);
      } else {
        parsed = parseCSV(text);
      }

      const transactions: Omit<BankTransaction, "id" | "created_at">[] = parsed.map((row) => ({
        bank_account_id: accountId,
        transaction_date: row.fecha || row.date || new Date().toISOString().split("T")[0],
        value_date: row["fecha valor"] || row["value date"],
        description: row.descripcion || row.description || row.concepto || "Sin descripción",
        reference: row.referencia || row.reference || row.ref1,
        amount: parseFloat(row.importe || row.amount || row.movimiento || "0"),
        balance: parseFloat(row.saldo || row.balance || "0") || undefined,
        status: "pending",
        import_batch_id: crypto.randomUUID(),
      }));

      importTransactions(transactions, {
        onSuccess: () => {
          setFile(null);
          setPreview([]);
          onImportComplete?.();
        },
      });
    };
    reader.readAsText(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Extracto Bancario</CardTitle>
        <CardDescription>
          Sube un archivo CSV o Norma 43 (.n43, .txt) con las transacciones bancarias
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Input
            type="file"
            accept=".csv,.n43,.txt"
            onChange={handleFileChange}
            className="flex-1"
          />
          <Button onClick={handleImport} disabled={!file || preview.length === 0}>
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
        </div>

        {preview.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Vista previa (primeras 5 filas):</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.fecha || row.date}</TableCell>
                      <TableCell>{row.descripcion || row.description || row.concepto}</TableCell>
                      <TableCell className="text-right">
                        {parseFloat(row.importe || row.amount || row.movimiento || "0").toFixed(2)}€
                      </TableCell>
                      <TableCell className="text-right">
                        {row.saldo || row.balance ? `${parseFloat(row.saldo || row.balance).toFixed(2)}€` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
