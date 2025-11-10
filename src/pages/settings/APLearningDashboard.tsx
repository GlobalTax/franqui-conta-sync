import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Brain, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function APLearningDashboard() {
  const queryClient = useQueryClient();

  // Fetch learning corrections
  const { data: corrections, isLoading } = useQuery({
    queryKey: ['ap-learning-corrections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ap_learning_corrections' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch reglas relacionadas
      if (data && data.length > 0) {
        const ruleIds = data
          .map((c: any) => c.generated_rule_id)
          .filter((id: any) => id !== null);

        if (ruleIds.length > 0) {
          const { data: rules } = await supabase
            .from('ap_mapping_rules' as any)
            .select('*')
            .in('id', ruleIds);

          // Mapear reglas a correcciones
          return data.map((correction: any) => ({
            ...correction,
            generated_rule: rules?.find((r: any) => r.id === correction.generated_rule_id) || null
          }));
        }
      }

      return data || [];
    }
  });

  // Mutation para aprobar/rechazar reglas
  const updateRuleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('ap_learning_corrections' as any)
        .update({ 
          rule_status: status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        } as any)
        .eq('id', id);

      if (error) throw error;

      // Si se aprueba, activar la regla
      if (status === 'approved') {
        const correction = corrections?.find((c: any) => c.id === id);
        if (correction?.generated_rule_id) {
          await supabase
            .from('ap_mapping_rules' as any)
            .update({ active: true } as any)
            .eq('id', correction.generated_rule_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ap-learning-corrections'] });
      queryClient.invalidateQueries({ queryKey: ['ap-mapping-rules'] });
      toast.success("Estado actualizado");
    }
  });

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Aprobada', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rechazada', className: 'bg-red-100 text-red-800' },
      manual: { label: 'Manual', className: 'bg-blue-100 text-blue-800' }
    };
    return config[status as keyof typeof config] || config.pending;
  };

  // Estadísticas
  const stats = corrections ? {
    total: corrections.length,
    approved: corrections.filter((c: any) => c.rule_status === 'approved').length,
    pending: corrections.filter((c: any) => c.rule_status === 'pending').length,
    rejected: corrections.filter((c: any) => c.rule_status === 'rejected').length
  } : null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Configuración', href: '/configuracion' },
          { label: 'Aprendizaje AP' }
        ]}
        title="Sistema de Aprendizaje AP"
        subtitle="Gestiona las reglas aprendidas de tus correcciones manuales (threshold 85%)"
      />

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Aprendidas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Aprobadas</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Rechazadas</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabla de correcciones */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Historial de Correcciones Aprendidas
        </h3>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : corrections && corrections.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Cambio</TableHead>
                <TableHead>Regla Generada</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {corrections.map((correction: any) => {
                const statusBadge = getStatusBadge(correction.rule_status);
                return (
                  <TableRow key={correction.id}>
                    <TableCell className="text-sm">
                      {format(new Date(correction.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{correction.supplier_name}</p>
                        {correction.extracted_keywords?.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {correction.extracted_keywords.slice(0, 3).map((kw: string) => (
                              <Badge key={kw} variant="outline" className="text-xs">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {correction.line_description}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm line-through text-muted-foreground">
                          {correction.suggested_account}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-mono text-sm font-bold text-primary">
                          {correction.corrected_account}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {correction.generated_rule ? (
                        <div>
                          <p className="text-sm font-medium">{correction.generated_rule.rule_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Confidence: {correction.generated_rule.confidence_score}%
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin regla</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadge.className}>
                        {statusBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {correction.rule_status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRuleStatus.mutate({ 
                              id: correction.id, 
                              status: 'approved' 
                            })}
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRuleStatus.mutate({ 
                              id: correction.id, 
                              status: 'rejected' 
                            })}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No hay correcciones registradas aún
          </div>
        )}
      </Card>
    </div>
  );
}
