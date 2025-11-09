import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Plus, Pencil, Trash2, Star } from "lucide-react";
import { useCompanyBankAccounts } from "@/hooks/useCompanyBankAccounts";
import { useForm } from "react-hook-form";

interface Props {
  companyId: string;
}

interface BankAccountForm {
  account_name: string;
  iban: string;
  swift?: string;
  bank_name?: string;
  is_default: boolean;
}

export function BankAccountsManager({ companyId }: Props) {
  const { accounts, createAccount, updateAccount, deleteAccount, setDefaultAccount, isCreating } =
    useCompanyBankAccounts(companyId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch } = useForm<BankAccountForm>({
    defaultValues: {
      account_name: "",
      iban: "",
      swift: "",
      bank_name: "",
      is_default: false,
    },
  });

  const handleCreate = () => {
    reset({
      account_name: "",
      iban: "",
      swift: "",
      bank_name: "",
      is_default: false,
    });
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleEdit = (account: any) => {
    reset({
      account_name: account.account_name,
      iban: account.iban,
      swift: account.swift || "",
      bank_name: account.bank_name || "",
      is_default: account.is_default,
    });
    setEditingId(account.id);
    setDialogOpen(true);
  };

  const onSubmit = (data: BankAccountForm) => {
    if (editingId) {
      updateAccount({ id: editingId, ...data });
    } else {
      createAccount({
        company_id: companyId,
        ...data,
        active: true,
      });
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Cuentas Bancarias</h3>
        </div>
        <Button onClick={handleCreate} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Añadir cuenta
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>IBAN</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>SWIFT/BIC</TableHead>
              <TableHead className="text-center">Predeterminada</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No hay cuentas bancarias configuradas
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.account_name}</TableCell>
                  <TableCell className="font-mono text-sm">{account.iban}</TableCell>
                  <TableCell>{account.bank_name || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{account.swift || "—"}</TableCell>
                  <TableCell className="text-center">
                    {account.is_default ? (
                      <Badge variant="default" className="gap-1">
                        <Star className="h-3 w-3" />
                        Predeterminada
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultAccount(account.id)}
                      >
                        Establecer
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(account)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAccount(account.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar cuenta bancaria" : "Nueva cuenta bancaria"}
              </DialogTitle>
              <DialogDescription>
                Configura los datos de la cuenta bancaria para pagos y cobros
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="account_name">
                  Nombre de la cuenta <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="account_name"
                  {...register("account_name", { required: true })}
                  placeholder="Cuenta principal, cuenta nóminas..."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="iban">
                  IBAN <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="iban"
                  {...register("iban", { required: true })}
                  placeholder="ES91 2100 0418 4502 0005 1332"
                  className="font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="swift">SWIFT/BIC</Label>
                  <Input
                    id="swift"
                    {...register("swift")}
                    placeholder="CAIXESBBXXX"
                    className="font-mono"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="bank_name">Banco</Label>
                  <Input
                    id="bank_name"
                    {...register("bank_name")}
                    placeholder="CaixaBank"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_default"
                  checked={watch("is_default")}
                  onCheckedChange={(checked) => setValue("is_default", !!checked)}
                />
                <Label htmlFor="is_default" className="cursor-pointer">
                  Establecer como cuenta predeterminada
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {editingId ? "Guardar cambios" : "Crear cuenta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
