import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { Skeleton } from "@/components/ui/skeleton";

interface BankAccountSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  centroCode?: string;
  placeholder?: string;
}

export const BankAccountSelector = ({
  value,
  onChange,
  centroCode,
  placeholder = "Seleccionar cuenta bancaria",
}: BankAccountSelectorProps) => {
  const { accounts, isLoading } = useBankAccounts(centroCode);

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.account_name} - {account.iban.slice(-4)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
