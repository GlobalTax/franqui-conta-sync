import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountSelector } from "./AccountSelector";
import { MovementType, NewAccountingEntryFormData } from "@/types/accounting-entries";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface TransactionLine {
  id: string;
  account_code: string;
  movement_type: MovementType;
  amount: number;
  description: string;
}

interface AccountingEntryFormProps {
  onSubmit: (data: NewAccountingEntryFormData) => void;
  isLoading?: boolean;
  organizationId?: string;
}

export function AccountingEntryForm({ onSubmit, isLoading, organizationId }: AccountingEntryFormProps) {
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<TransactionLine[]>([
    {
      id: crypto.randomUUID(),
      account_code: "",
      movement_type: "debit",
      amount: 0,
      description: "",
    },
    {
      id: crypto.randomUUID(),
      account_code: "",
      movement_type: "credit",
      amount: 0,
      description: "",
    },
  ]);

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: crypto.randomUUID(),
        account_code: "",
        movement_type: "debit",
        amount: 0,
        description: "",
      },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 2) {
      setLines(lines.filter((line) => line.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof TransactionLine, value: any) => {
    setLines(
      lines.map((line) => (line.id === id ? { ...line, [field]: value } : line))
    );
  };

  const totalDebit = lines
    .filter((l) => l.movement_type === "debit")
    .reduce((sum, l) => sum + l.amount, 0);

  const totalCredit = lines
    .filter((l) => l.movement_type === "credit")
    .reduce((sum, l) => sum + l.amount, 0);

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isBalanced) {
      return;
    }

    const validLines = lines.filter(
      (line) => line.account_code && line.amount > 0
    );

    if (validLines.length < 2) {
      return;
    }

    onSubmit({
      entry_date: entryDate,
      description,
      transactions: validLines.map((line) => ({
        account_code: line.account_code,
        movement_type: line.movement_type,
        amount: line.amount,
        description: line.description || description,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos del Asiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_date">Fecha</Label>
              <Input
                id="entry_date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Concepto</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción del asiento"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apuntes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, index) => (
            <div key={line.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <Label>Cuenta</Label>
                <AccountSelector
                  value={line.account_code}
                  onChange={(value) => updateLine(line.id, "account_code", value)}
                  organizationId={organizationId}
                />
              </div>
              <div className="col-span-2">
                <Label>Tipo</Label>
                <Select
                  value={line.movement_type}
                  onValueChange={(value) =>
                    updateLine(line.id, "movement_type", value as MovementType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Debe</SelectItem>
                    <SelectItem value="credit">Haber</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Importe</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.amount || ""}
                  onChange={(e) =>
                    updateLine(line.id, "amount", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-3">
                <Label>Descripción</Label>
                <Input
                  value={line.description}
                  onChange={(e) => updateLine(line.id, "description", e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLine(line.id)}
                  disabled={lines.length <= 2}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addLine} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Añadir Línea
          </Button>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Total Debe:</span>
              <span className="font-mono text-lg">
                {totalDebit.toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} €
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Total Haber:</span>
              <span className="font-mono text-lg">
                {totalCredit.toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} €
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Diferencia:</span>
              <span
                className={`font-mono text-lg ${
                  isBalanced ? "text-green-600" : "text-destructive"
                }`}
              >
                {Math.abs(totalDebit - totalCredit).toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} €
              </span>
            </div>
          </div>

          <Button type="submit" disabled={!isBalanced || isLoading} size="lg">
            {isLoading ? "Guardando..." : "Crear Asiento"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
