import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus } from "lucide-react";
import { useUnmappedAccounts } from "@/hooks/useUnmappedAccounts";
import { usePLTemplate } from "@/hooks/usePLTemplates";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UnmappedAccountsPanelProps {
  templateCode: string;
}

export const UnmappedAccountsPanel = ({ templateCode }: UnmappedAccountsPanelProps) => {
  const { data: template } = usePLTemplate(templateCode);
  const [centroCode, setCentroCode] = useState<string>("1050");
  const [period, setPeriod] = useState<string>("2024-01");

  const { data: unmapped, isLoading } = useUnmappedAccounts({
    templateCode,
    centroCode,
    periodMonth: period + "-01",
  });

  const handleCreateRuleFromAccount = (accountCode: string) => {
    console.log("Crear regla para:", accountCode);
  };

  if (isLoading) return <div>Cargando cuentas sin mapear...</div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={centroCode} onValueChange={setCentroCode}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Centro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1050">Islazul (1050)</SelectItem>
                <SelectItem value="457">Loranca (457)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024-01">Enero 2024</SelectItem>
                <SelectItem value="2024-02">Febrero 2024</SelectItem>
                <SelectItem value="2023-12">Diciembre 2023</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {unmapped && unmapped.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{unmapped.length} cuentas sin mapear</strong> detectadas. 
            Crea reglas para asignarlas a rubros.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cuentas del PGC Sin Asignar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuenta</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="w-32">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unmapped && unmapped.length > 0 ? (
                unmapped.map((account: any) => (
                  <TableRow key={account.account_code}>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded font-mono">
                        {account.account_code}
                      </code>
                    </TableCell>
                    <TableCell>{account.account_name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {account.amount.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}€
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateRuleFromAccount(account.account_code)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Regla
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    ✅ Todas las cuentas están mapeadas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
