import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ReconciliationRule } from '@/hooks/useBankReconciliation';

const formSchema = z.object({
  rule_name: z.string().min(1, 'Nombre requerido'),
  transaction_type: z.enum(['debit', 'credit']).optional(),
  description_pattern: z.string().optional(),
  amount_min: z.coerce.number().min(0).optional(),
  amount_max: z.coerce.number().min(0).optional(),
  auto_match_type: z.enum(['daily_closure', 'invoice', 'royalty', 'commission', 'manual']),
  suggested_account: z.string().optional(),
  confidence_threshold: z.coerce.number().min(0).max(100).default(80),
  active: z.boolean().default(true),
  priority: z.coerce.number().min(0).default(0),
});

type FormData = z.infer<typeof formSchema>;

interface ReconciliationRuleFormProps {
  centroCode: string;
  bankAccountId: string;
  rule?: ReconciliationRule;
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
}

export function ReconciliationRuleForm({ centroCode, bankAccountId, rule, onSubmit, onCancel }: ReconciliationRuleFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: rule ? {
      rule_name: rule.rule_name,
      transaction_type: rule.transaction_type || undefined,
      description_pattern: rule.description_pattern || '',
      amount_min: rule.amount_min || undefined,
      amount_max: rule.amount_max || undefined,
      auto_match_type: rule.auto_match_type,
      suggested_account: rule.suggested_account || '',
      confidence_threshold: rule.confidence_threshold || 80,
      active: rule.active,
      priority: rule.priority || 0,
    } : {
      rule_name: '',
      auto_match_type: 'invoice',
      confidence_threshold: 80,
      active: true,
      priority: 0,
    },
  });

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="rule_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Regla</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ej: Cobros TPV automáticos" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="transaction_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Transacción</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Cualquiera" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="credit">Ingreso (Credit)</SelectItem>
                    <SelectItem value="debit">Gasto (Debit)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="auto_match_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Conciliación</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="daily_closure">Cierre Diario</SelectItem>
                    <SelectItem value="invoice">Facturas</SelectItem>
                    <SelectItem value="royalty">Royalties</SelectItem>
                    <SelectItem value="commission">Comisiones</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description_pattern"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Patrón de Descripción (Regex)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ej: TPV|TARJETA|CARD" />
              </FormControl>
              <FormDescription>
                Usa expresiones regulares para buscar en la descripción
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount_min"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Importe Mínimo</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} placeholder="0.00" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount_max"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Importe Máximo</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} placeholder="999999.99" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="confidence_threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Umbral de Confianza (%)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" max="100" {...field} />
                </FormControl>
                <FormDescription>
                  Nivel de confianza mínimo para sugerir (0-100)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridad</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormDescription>
                  Mayor prioridad = se evalúa primero
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="suggested_account"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cuenta Contable Sugerida</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ej: 570, 572" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Regla Activa</FormLabel>
                <FormDescription>
                  Si está activa, se aplicará automáticamente
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit">
            {rule ? 'Actualizar' : 'Crear'} Regla
          </Button>
        </div>
      </form>
    </Form>
  );
}
