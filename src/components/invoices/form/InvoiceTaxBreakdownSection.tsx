// ============================================================================
// INVOICE TAX BREAKDOWN SECTION
// Sección de desglose de impuestos con tabla editable
// ============================================================================

import { Control, useFieldArray, UseFormSetError } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { calculateTaxAmount } from '@/lib/invoice-calculator';
import { EXPENSE_CATEGORIES } from '@/lib/constants/expense-categories';
import { PGCValidator } from '@/domain/accounting/services/PGCValidator';

interface InvoiceTaxBreakdownSectionProps {
  control: Control<any>;
  setError: UseFormSetError<any>;
}

const TAX_RATES = [
  { value: '0', label: '0% (Exento)' },
  { value: '4', label: '4% (Superreducido)' },
  { value: '10', label: '10% (Reducido)' },
  { value: '21', label: '21% (General)' }
];

export function InvoiceTaxBreakdownSection({ control, setError }: InvoiceTaxBreakdownSectionProps) {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'tax_lines'
  });

  // Función para manejar cambios en la base imponible o tipo de IVA
  const handleTaxCalculation = (index: number, base: number, rate: number) => {
    const taxAmount = calculateTaxAmount(base, rate);
    const currentLine = (control as any)._formValues.tax_lines[index];
    
    update(index, {
      ...currentLine,
      tax_base: base,
      tax_rate: rate,
      tax_amount: taxAmount
    });
  };

  const handleAccountCodeBlur = (code: string, index: number) => {
    if (!code) return;
    
    const validation = PGCValidator.validateAccountLength(code);
    
    if (!validation.valid) {
      setError(`tax_lines.${index}.account_code`, {
        message: validation.error || 'Código de cuenta inválido'
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="uppercase text-sm font-bold text-primary">
          Desglose Impuestos / Contable
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ 
            tax_rate: 21, 
            tax_base: 0, 
            tax_amount: 0, 
            account_code: '', 
            expense_category: '' 
          })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir línea
        </Button>
      </CardHeader>
      <CardContent>
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay líneas de impuestos. Haz clic en "Añadir línea" para crear una.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Tipo IVA (%)</TableHead>
                  <TableHead className="text-right min-w-[120px]">Base Imponible</TableHead>
                  <TableHead className="text-right min-w-[100px]">IVA (Cuota)</TableHead>
                  <TableHead className="min-w-[130px]">Cuenta PGC</TableHead>
                  <TableHead className="min-w-[160px]">Clase de Gasto</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <Select
                        value={String((control as any)._formValues.tax_lines[index]?.tax_rate || '21')}
                        onValueChange={(value) => {
                          const rate = parseFloat(value);
                          const base = (control as any)._formValues.tax_lines[index]?.tax_base || 0;
                          handleTaxCalculation(index, base, rate);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TAX_RATES.map((rate) => (
                            <SelectItem key={rate.value} value={rate.value}>
                              {rate.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        {...control.register(`tax_lines.${index}.tax_base`, {
                          valueAsNumber: true,
                          onChange: (e) => {
                            const base = parseFloat(e.target.value) || 0;
                            const rate = (control as any)._formValues.tax_lines[index]?.tax_rate || 21;
                            handleTaxCalculation(index, base, rate);
                          }
                        })}
                        className="text-right"
                      />
                    </TableCell>

                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        {...control.register(`tax_lines.${index}.tax_amount`, {
                          valueAsNumber: true
                        })}
                        className="text-right bg-muted"
                        readOnly
                      />
                    </TableCell>

                    <TableCell>
                      <Input
                        {...control.register(`tax_lines.${index}.account_code`)}
                        placeholder="600xxxx"
                        onBlur={(e) => handleAccountCodeBlur(e.target.value, index)}
                      />
                    </TableCell>

                    <TableCell>
                      <Select
                        value={(control as any)._formValues.tax_lines[index]?.expense_category || ''}
                        onValueChange={(value) => {
                          const currentLine = (control as any)._formValues.tax_lines[index];
                          update(index, { ...currentLine, expense_category: value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
