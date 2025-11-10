import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, Power, PowerOff } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function APMappingRules() {
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['ap-mapping-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ap_mapping_rules' as any)
        .select('*')
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Toggle active status
  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('ap_mapping_rules' as any)
        .update({ active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ap-mapping-rules'] });
      toast.success('Regla actualizada');
    }
  });

  const getMatchTypeLabel = (matchType: string) => {
    const labels: Record<string, string> = {
      'supplier_exact': 'Proveedor Exacto',
      'supplier_tax_id': 'NIF/CIF',
      'supplier_name_like': 'Nombre LIKE',
      'text_keywords': 'Palabras Clave',
      'amount_range': 'Rango de Montos',
      'centre_code': 'Centro',
      'combined': 'Combinado'
    };
    return labels[matchType] || matchType;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
      <PageHeader
        breadcrumbs={[{ label: 'Configuración', href: '/settings' }, { label: 'Reglas AP' }]}
        title="Reglas de Mapeo AP"
        subtitle="Configura reglas automáticas para asignar cuentas contables"
      />
        <Card className="p-6">
          <p className="text-muted-foreground">Cargando reglas...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Configuración', href: '/settings' }, { label: 'Reglas AP' }]}
        title="Reglas de Mapeo AP"
        subtitle="Configura reglas automáticas para asignar cuentas contables a facturas de proveedores"
      />

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">
            Reglas Activas ({rules.filter((r: any) => r.active).length})
          </h3>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Regla
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prioridad</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cuenta Sugerida</TableHead>
              <TableHead>Confianza</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule: any) => (
              <TableRow key={rule.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-primary">{rule.priority}</span>
                    <div className="flex flex-col">
                      <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{rule.rule_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{getMatchTypeLabel(rule.match_type)}</Badge>
                </TableCell>
                <TableCell className="font-mono text-primary">{rule.suggested_expense_account}</TableCell>
                <TableCell>
                  <Badge 
                    className={
                      rule.confidence_score >= 80 
                        ? "bg-success-light text-success border-success" 
                        : "bg-muted text-muted-foreground border-border"
                    }
                  >
                    {rule.confidence_score}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive.mutate({ id: rule.id, active: !rule.active })}
                    disabled={toggleActive.isPending}
                  >
                    {rule.active ? (
                      <Badge className="bg-success-light text-success border-success">
                        <Power className="mr-1 h-3 w-3" />
                        Activa
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <PowerOff className="mr-1 h-3 w-3" />
                        Inactiva
                      </Badge>
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
