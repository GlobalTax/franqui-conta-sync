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

  const parseNorma43 = (text: string): any[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    const transactions: any[] = [];
    
    for (const line of lines) {
      // Registro tipo 11: Cabecera de cuenta
      if (line.startsWith("11")) {
        // Skip header, just validate format
        continue;
      }
      
      // Registro tipo 22: Movimiento principal
      if (line.startsWith("22")) {
        const oficina = line.substring(6, 10);
        const cuenta = line.substring(10, 20);
        const fecha = line.substring(20, 26); // YYMMDD
        const valorFecha = line.substring(26, 32); // YYMMDD
        const conceptoComun = line.substring(32, 34);
        const conceptoPropio = line.substring(34, 37);
        const importeStr = line.substring(37, 51);
        const signo = line.substring(51, 52); // 1=haber, 2=debe
        const numeroDocumento = line.substring(52, 62);
        const referencia1 = line.substring(62, 74);
        const referencia2 = line.substring(74, 86);
        
        // Parse date YYMMDD to YYYY-MM-DD
        const year = "20" + fecha.substring(0, 2);
        const month = fecha.substring(2, 4);
        const day = fecha.substring(4, 6);
        const transactionDate = `${year}-${month}-${day}`;
        
        const valueYear = "20" + valorFecha.substring(0, 2);
        const valueMonth = valorFecha.substring(2, 4);
        const valueDay = valorFecha.substring(4, 6);
        const valueDate = `${valueYear}-${valueMonth}-${valueDay}`;
        
        // Parse amount (last 2 digits are decimals)
        const amount = parseFloat(importeStr) / 100 * (signo === "1" ? 1 : -1);
        
        transactions.push({
          fecha: transactionDate,
          "fecha valor": valueDate,
          descripcion: `Mov. ${conceptoComun}-${conceptoPropio}`,
          referencia: numeroDocumento.trim() || referencia1.trim(),
          importe: amount,
          ref1: referencia1.trim(),
          ref2: referencia2.trim(),
        });
      }
      
      // Registro tipo 23: Conceptos adicionales
      if (line.startsWith("23")) {
        const concepto1 = line.substring(4, 42).trim();
        const concepto2 = line.substring(42, 80).trim();
        
        // Add description to last transaction
        if (transactions.length > 0) {
          const lastTx = transactions[transactions.length - 1];
          lastTx.descripcion = [concepto1, concepto2].filter(Boolean).join(" ");
        }
      }
    }
    
    return transactions;
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
        parsed = parseNorma43(text);
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
        parsed = parseNorma43(text);
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
