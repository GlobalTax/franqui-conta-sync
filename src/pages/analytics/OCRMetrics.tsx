import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Clock, Zap, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function OCRMetrics() {
  const queryClient = useQueryClient();

  // Query a vista materializada mv_ocr_metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['ocr-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_ocr_metrics')
        .select('*')
        .order('engine');
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000 // Refresh cada 1 minuto
  });

  // Query de distribución de páginas
  const { data: pageDistribution } = useQuery({
    queryKey: ['ocr-page-distribution'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_page_distribution');
      if (error) throw error;
      return data;
    }
  });

  // Query de evolución de costes (últimos 30 días)
  const { data: costTrend } = useQuery({
    queryKey: ['ocr-cost-trend'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cost_trend_30d');
      if (error) throw error;
      return data;
    }
  });

  const handleRefresh = async () => {
    try {
      await supabase.rpc('refresh_ocr_metrics');
      await queryClient.invalidateQueries({ queryKey: ['ocr-metrics'] });
      toast.success('Métricas actualizadas correctamente');
    } catch (error) {
      toast.error('Error al actualizar métricas');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Calcular totales
  const totalInvoices = metrics?.reduce((sum, m) => sum + (m.total_invocations as number), 0) || 0;
  const totalCost = metrics?.reduce((sum, m) => sum + parseFloat(String(m.total_cost_eur)), 0) || 0;
  const avgConfidence = metrics?.reduce((sum, m) => sum + (m.avg_confidence as number), 0) / (metrics?.length || 1);
  const avgTime = metrics?.reduce((sum, m) => sum + (m.avg_processing_time_ms as number), 0) / (metrics?.length || 1);

  const COLORS = {
    openai: 'hsl(var(--chart-1))',
    mindee: 'hsl(var(--chart-2))',
    merged: 'hsl(var(--chart-3))'
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Métricas OCR</h1>
          <p className="text-muted-foreground mt-1">Análisis de rendimiento y costes del sistema OCR</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar Métricas
        </Button>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Procesadas con OCR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coste Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Promedio: €{(totalCost / totalInvoices || 0).toFixed(4)} / factura
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confianza Promedio</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConfidence.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Precisión de extracción
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTime.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground mt-1">
              Por factura
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de barras: Costes por motor */}
      <Card>
        <CardHeader>
          <CardTitle>Coste por Motor OCR</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="engine" />
              <YAxis />
              <Tooltip 
                formatter={(value: any) => `€${parseFloat(value).toFixed(4)}`}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Bar dataKey="total_cost_eur" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de distribución de motores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Motores</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={metrics}
                  dataKey="total_invocations"
                  nameKey="engine"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.engine} (${entry.total_invocations})`}
                >
                  {metrics?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.engine as keyof typeof COLORS]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tabla de detalles por motor */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles por Motor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics?.map((m: any) => (
                <div 
                  key={m.engine} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[m.engine as keyof typeof COLORS] }}
                    />
                    <div>
                      <p className="font-medium capitalize">{m.engine}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.total_invocations} facturas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">€{parseFloat(String(m.total_cost_eur)).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(m.avg_confidence).toFixed(1)}% conf.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de distribución de páginas */}
      {pageDistribution && pageDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Páginas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pageDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="page_range" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de evolución de costes */}
      {costTrend && costTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolución de Costes (30 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={costTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => `€${parseFloat(value).toFixed(2)}`}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Line type="monotone" dataKey="daily_cost" stroke="hsl(var(--primary))" name="Coste Diario" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
