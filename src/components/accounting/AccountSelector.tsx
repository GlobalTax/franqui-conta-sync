import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Account {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

interface AccountSelectorProps {
  value: string;
  onChange: (value: string) => void;
  organizationId?: string;
}

export function AccountSelector({ value, onChange, organizationId }: AccountSelectorProps) {
  const [open, setOpen] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts-selector", organizationId],
    queryFn: async () => {
      // Using centres table as temp placeholder for accounts
      // This should be updated when accounts table structure is finalized
      const { data, error } = await supabase
        .from("centres")
        .select("id, codigo, nombre, activo")
        .eq("activo", true)
        .order("codigo");

      if (error) throw error;
      
      // Map to Account interface
      return (data || []).map((c): Account => ({
        id: c.id,
        code: c.codigo,
        name: c.nombre,
        active: c.activo,
      }));
    },
  });

  const selectedAccount = accounts.find((acc) => acc.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedAccount
            ? `${selectedAccount.code} - ${selectedAccount.name}`
            : "Seleccionar cuenta..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Buscar cuenta..." />
          <CommandList>
            <CommandEmpty>No se encontraron cuentas.</CommandEmpty>
            <CommandGroup>
              {accounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.code} ${account.name}`}
                  onSelect={() => {
                    onChange(account.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === account.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-mono mr-2">{account.code}</span>
                  <span className="text-muted-foreground">{account.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
