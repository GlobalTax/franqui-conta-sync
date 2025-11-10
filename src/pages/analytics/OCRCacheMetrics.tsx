import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, DollarSign, TrendingUp, Zap, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function OCRCacheMetrics() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query cache metrics
  const { data: cacheMetrics, isLoading } = useQuery({
    queryKey: ['ocr-cache-metrics'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await (supabase as any)
        .from('ocr_cache_metrics')
        .select('*')
        .gte('date', thirtyDaysAgo.toISOString())
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 60000
  });

  // Query top cached invoices
  const { data: topCached } = useQuery({
    queryKey: ['ocr-cache-top'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ocr_cache')
        .select('supplier_vat_id, invoice_number, hit_count, original_cost_eur, confidence_score, created_at')
        .gt('hit_count', 0)
        .order('hit_count', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as any[];
    }
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['ocr-cache-metrics'] });
    await queryClient.invalidateQueries({ queryKey: ['ocr-cache-top'] });
    toast({
      title: "Métricas actualizadas",
      description: "Los datos del caché se han actualizado correctamente",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Aggregate metrics by level
  const aggregatedByLevel = cacheMetrics?.reduce((acc, metric) => {
    const existing = acc.find(m => m.cache_level === metric.cache_level);
    if (existing) {
      existing.total_hits += metric.hit_count;
      existing.total_saved += parseFloat(String(metric.cost_saved_eur));
    } else {
      acc.push({
        cache_level: metric.cache_level,
        total_hits: metric.hit_count,
        total_saved: parseFloat(String(metric.cost_saved_eur))
      });
    }
    return acc;
  }, [] as Array<{ cache_level: string; total_hits: number; total_saved: number }>);

  const totalHits = aggregatedByLevel?.reduce((sum, m) => sum + (m.cache_level !== 'MISS' ? m.total_hits : 0), 0) || 0;
  const totalMisses = aggregatedByLevel?.find(m => m.cache_level === 'MISS')?.total_hits || 0;
  const totalProcessed = totalHits + totalMisses;
  const hitRate = totalProcessed > 0 ? (totalHits / totalProcessed * 100) : 0;
  const totalSaved = aggregatedByLevel?.reduce((sum, m) => sum + m.total_saved, 0) || 0;

  const COLORS = {
    L1_exact: 'hsl(var(--chart-1))',
    L2_structural: 'hsl(var(--chart-2))',
    L3_supplier: 'hsl(var(--chart-3))',
    MISS: 'hsl(var(--destructive))'
  };

  const LABELS = {
    L1_exact: 'L1 - Exacto',
    L2_structural: 'L2 - Estructural',
    L3_supplier: 'L3 - Proveedor',
    MISS: 'Miss'
  };

  // Prepare temporal data
  const temporalData = cacheMetrics?.reduce((acc, metric) => {
    const existing = acc.find(m => m.date === metric.date);
    if (existing) {
      if (metric.cache_level !== 'MISS') {
        existing.hits += metric.hit_count;
      } else {
        existing.misses += metric.hit_count;
      }
    } else {
      acc.push({
        date: metric.date,
        hits: metric.cache_level !== 'MISS' ? metric.hit_count : 0,
        misses: metric.cache_level === 'MISS' ? metric.hit_count : 0
      });
    }
    return acc;
  }, [] as Array<{ date: string; hits: number; misses: number }>);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Métricas de Caché OCR</h1>
          <p className="text-muted-foreground mt-1">Sistema de caché inteligente multi-nivel (L1-L3)</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-4 py-2 font-mono">
            Hit Rate: {hitRate.toFixed(1)}%
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Procesadas</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProcessed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {totalHits} hits · {totalMisses} misses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ahorro Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">€{totalSaved.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Promedio: €{(totalSaved / Math.max(totalHits, 1)).toFixed(4)} / hit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hitRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {totalHits} de {totalProcessed} facturas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nivel Más Usado</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregatedByLevel
                ?.filter(m => m.cache_level !== 'MISS')
                .sort((a, b) => b.total_hits - a.total_hits)[0]?.cache_level.replace('_', ' ') || 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribución de niveles de caché */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Nivel de Caché</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={aggregatedByLevel}
                  dataKey="total_hits"
                  nameKey="cache_level"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${LABELS[entry.cache_level as keyof typeof LABELS]} (${entry.total_hits})`}
                >
                  {aggregatedByLevel?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.cache_level as keyof typeof COLORS]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ahorro por Nivel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={aggregatedByLevel?.filter(m => m.cache_level !== 'MISS')}>
                <XAxis 
                  dataKey="cache_level" 
                  tickFormatter={(value) => LABELS[value as keyof typeof LABELS]}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => `€${parseFloat(value).toFixed(2)}`}
                  labelFormatter={(label) => LABELS[label as keyof typeof LABELS]}
                />
                <Bar dataKey="total_saved" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top facturas más cacheadas */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Facturas Más Reutilizadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topCached?.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">{idx + 1}</Badge>
                  <div>
                    <p className="font-medium">{item.supplier_vat_id || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">
                      Factura: {item.invoice_number}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{item.hit_count} hits</p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Ahorro: €{(parseFloat(String(item.original_cost_eur)) * item.hit_count).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            {!topCached || topCached.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No hay facturas cacheadas aún
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Evolución temporal */}
      {temporalData && temporalData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evolución de Hit Rate (30 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={temporalData}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label) => new Date(label).toLocaleDateString('es-ES')}
                />
                <Legend />
                <Line type="monotone" dataKey="hits" stroke="hsl(var(--chart-1))" name="Hits" strokeWidth={2} />
                <Line type="monotone" dataKey="misses" stroke="hsl(var(--destructive))" name="Misses" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
