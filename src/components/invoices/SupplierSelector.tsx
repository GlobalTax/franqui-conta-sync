import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useSuppliers, type Supplier } from "@/hooks/useSuppliers";
import { Skeleton } from "@/components/ui/skeleton";

interface SupplierSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  onCreateNew?: () => void;
}

export function SupplierSelector({ value, onValueChange, onCreateNew }: SupplierSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: suppliers, isLoading } = useSuppliers({ search, active: true });

  const selectedSupplier = suppliers?.find((s) => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedSupplier ? (
            <span className="truncate">{selectedSupplier.name} ({selectedSupplier.tax_id})</span>
          ) : (
            "Seleccionar proveedor..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput 
            placeholder="Buscar proveedor..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>
            {isLoading ? (
              <div className="p-2 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="p-4 text-sm text-center">
                <p className="text-muted-foreground mb-2">No se encontraron proveedores</p>
                {onCreateNew && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      onCreateNew();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear proveedor
                  </Button>
                )}
              </div>
            )}
          </CommandEmpty>
          <CommandGroup>
            {onCreateNew && (
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  onCreateNew();
                }}
                className="border-b"
              >
                <Plus className="mr-2 h-4 w-4" />
                <span className="font-medium">Crear nuevo proveedor</span>
              </CommandItem>
            )}
            {suppliers?.map((supplier) => (
              <CommandItem
                key={supplier.id}
                value={supplier.id}
                onSelect={(currentValue) => {
                  onValueChange(currentValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === supplier.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{supplier.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {supplier.tax_id}
                    {supplier.commercial_name && ` · ${supplier.commercial_name}`}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
