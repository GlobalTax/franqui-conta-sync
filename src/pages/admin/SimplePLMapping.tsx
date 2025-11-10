import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Link as LinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PLLine {
  code: string;
  name: string;
  category: string;
  display_order: number;
  is_total: boolean;
}

interface AccountMapping {
  id: string;
  account_code: string;
  pl_line_code: string;
  multiplier: number;
  notes: string | null;
  pl_lines: PLLine;
}

export default function SimplePLMapping() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMapping, setNewMapping] = useState({
    account_code: "",
    pl_line_code: "",
    multiplier: 1,
    notes: "",
  });

  // Fetch P&L lines
  const { data: plLines } = useQuery({
    queryKey: ["pl-lines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pl_lines")
        .select("*")
        .eq("is_total", false)
        .order("display_order");
      
      if (error) throw error;
      return data as PLLine[];
    },
  });

  // Fetch current mappings
  const { data: mappings, isLoading } = useQuery({
    queryKey: ["account-pl-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_pl_mapping")
        .select(`
          *,
          pl_lines(code, name, category, display_order, is_total)
        `)
        .is("centro_code", null) // Only global mappings for now
        .order("account_code");
      
      if (error) throw error;
      return data as AccountMapping[];
    },
  });

  // Create mapping mutation
  const createMapping = useMutation({
    mutationFn: async (mapping: typeof newMapping) => {
      const { data, error } = await supabase
        .from("account_pl_mapping")
        .insert({
          account_code: mapping.account_code,
          pl_line_code: mapping.pl_line_code,
          multiplier: mapping.multiplier,
          notes: mapping.notes || null,
          centro_code: null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-pl-mappings"] });
      toast({
        title: "Mapeo creado",
        description: "La cuenta se ha vinculado correctamente",
      });
      setIsAddDialogOpen(false);
      setNewMapping({
        account_code: "",
        pl_line_code: "",
        multiplier: 1,
        notes: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mapping mutation
  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("account_pl_mapping")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-pl-mappings"] });
      toast({
        title: "Mapeo eliminado",
        description: "La vinculación se ha eliminado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const groupedLines = plLines?.reduce((acc, line) => {
    if (!acc[line.category]) {
      acc[line.category] = [];
    }
    acc[line.category].push(line);
    return acc;
  }, {} as Record<string, PLLine[]>);

  const handleCreateMapping = () => {
    if (!newMapping.account_code || !newMapping.pl_line_code) {
      toast({
        title: "Datos incompletos",
        description: "Debes seleccionar cuenta y línea P&L",
        variant: "destructive",
      });
      return;
    }
    createMapping.mutate(newMapping);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary" />
                Mapeo Cuentas → P&L
              </CardTitle>
              <CardDescription>
                Vincula cuentas del PGC con líneas del P&L de forma directa y sencilla
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Vinculación
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Nueva Vinculación Cuenta → P&L</DialogTitle>
                  <DialogDescription>
                    Asocia una cuenta contable a una línea del estado de resultados
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="account">Código de Cuenta PGC</Label>
                    <Input
                      id="account"
                      placeholder="Ej: 7000000"
                      value={newMapping.account_code}
                      onChange={(e) =>
                        setNewMapping({ ...newMapping, account_code: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plline">Línea P&L</Label>
                    <Select
                      value={newMapping.pl_line_code}
                      onValueChange={(value) =>
                        setNewMapping({ ...newMapping, pl_line_code: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar línea P&L" />
                      </SelectTrigger>
                      <SelectContent>
                        {groupedLines && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-primary">
                              INGRESOS
                            </div>
                            {groupedLines.income?.map((line) => (
                              <SelectItem key={line.code} value={line.code}>
                                {line.name}
                              </SelectItem>
                            ))}
                            <div className="px-2 py-1.5 text-xs font-semibold text-primary mt-2">
                              GASTOS
                            </div>
                            {groupedLines.expense?.map((line) => (
                              <SelectItem key={line.code} value={line.code}>
                                {line.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="multiplier">Multiplicador</Label>
                    <Select
                      value={newMapping.multiplier.toString()}
                      onValueChange={(value) =>
                        setNewMapping({ ...newMapping, multiplier: parseFloat(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 (Normal)</SelectItem>
                        <SelectItem value="-1">-1 (Invertir signo)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Usa -1 para ingresos (invierten el signo contable)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas (opcional)</Label>
                    <Input
                      id="notes"
                      placeholder="Descripción de la cuenta"
                      value={newMapping.notes}
                      onChange={(e) =>
                        setNewMapping({ ...newMapping, notes: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateMapping}>Crear Vinculación</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando mapeos...
            </div>
          ) : mappings && mappings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay mapeos configurados. Añade el primero usando el botón arriba.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta PGC</TableHead>
                  <TableHead>Línea P&L</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-center">Mult.</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings?.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell className="font-mono font-medium">
                      {mapping.account_code}
                    </TableCell>
                    <TableCell>{mapping.pl_lines.name}</TableCell>
                    <TableCell>
                      <span
                        className={
                          mapping.pl_lines.category === "income"
                            ? "text-success"
                            : "text-destructive"
                        }
                      >
                        {mapping.pl_lines.category === "income"
                          ? "Ingreso"
                          : "Gasto"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {mapping.multiplier}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {mapping.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMapping.mutate(mapping.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Guía Rápida</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="font-medium">1. Cuenta PGC:</span> Código de la cuenta
            contable (ej: 7000000 para ventas)
          </div>
          <div>
            <span className="font-medium">2. Línea P&L:</span> Dónde aparecerá en el
            estado de resultados
          </div>
          <div>
            <span className="font-medium">3. Multiplicador:</span> Usa{" "}
            <code className="bg-muted px-1 rounded">-1</code> para ingresos (cuentas
            70x) y <code className="bg-muted px-1 rounded">1</code> para gastos (60x)
          </div>
          <div className="pt-2 text-muted-foreground">
            💡 <strong>Tip:</strong> Puedes mapear múltiples cuentas a la misma línea
            P&L (ej: varias cuentas 700x → "Ventas en Sala")
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
