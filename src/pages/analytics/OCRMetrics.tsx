import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Clock, Zap, FileText, RefreshCw, AlertCircle, CheckCircle2, TrendingUp, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export default function OCRMetrics() {
  const queryClient = useQueryClient();

  // Filtros
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d');
  const [selectedCentro, setSelectedCentro] = useState<string>('all');
  const [selectedEngine, setSelectedEngine] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Calcular rango de fechas según periodo
  const getDateRange = () => {
    const end = new Date();
    let start = new Date();
    
    if (selectedPeriod === '7d') start = subMonths(end, 0);
    else if (selectedPeriod === '30d') start = subMonths(end, 1);
    else if (selectedPeriod === '3m') start = subMonths(end, 3);
    else if (selectedPeriod === '6m') start = subMonths(end, 6);
    else if (selectedPeriod === '1y') start = subMonths(end, 12);
    
    return { start: startOfMonth(start), end: endOfMonth(end) };
  };

  const dateRange = getDateRange();

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
    refetchInterval: 60000
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

  // Query de evolución de costes
  const { data: costTrend } = useQuery({
    queryKey: ['ocr-cost-trend'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cost_trend_30d');
      if (error) throw error;
      return data;
    }
  });

  // Query facturas con filtros
  const { data: invoicesData } = useQuery({
    queryKey: ['ocr-invoices', selectedPeriod, selectedCentro, selectedEngine, selectedStatus],
    queryFn: async () => {
      let query = supabase
        .from('invoices_received')
        .select(`
          id, 
          invoice_number, 
          invoice_date, 
          approval_status, 
          confidence_score, 
          centro_code, 
          entry_id, 
          supplier:suppliers(name, tax_id),
          ocr_processing_log!inner(ocr_provider, engine)
        `)
        .gte('invoice_date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('invoice_date', format(dateRange.end, 'yyyy-MM-dd'));

      if (selectedCentro !== 'all') query = query.eq('centro_code', selectedCentro);
      if (selectedEngine !== 'all') query = query.eq('ocr_processing_log.engine', selectedEngine);
      if (selectedStatus !== 'all') query = query.eq('approval_status', selectedStatus);

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform to flatten ocr data
      return data?.map((inv: any) => ({
        ...inv,
        ocr_engine: inv.ocr_processing_log?.[0]?.engine || inv.ocr_processing_log?.[0]?.ocr_provider || null
      }));
    }
  });

  // Query centros para filtro
  const { data: centros } = useQuery({
    queryKey: ['centres-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('centres')
        .select('codigo, nombre')
        .eq('activo', true)
        .order('nombre');
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

  // Calcular totales desde métricas
  const totalInvoices = metrics?.reduce((sum, m) => sum + (m.total_invocations as number), 0) || 0;
  const totalCost = metrics?.reduce((sum, m) => sum + parseFloat(String(m.total_cost_eur)), 0) || 0;
  const avgConfidence = metrics?.reduce((sum, m) => sum + (m.avg_confidence as number), 0) / (metrics?.length || 1);
  const avgTime = metrics?.reduce((sum, m) => sum + (m.avg_processing_time_ms as number), 0) / (metrics?.length || 1);

  // KPIs adicionales desde invoicesData
  const totalFiltered = invoicesData?.length || 0;
  const mindeeFallback = metrics?.find(m => m.engine === 'mindee')?.total_invocations || 0;
  const fallbackRate = totalInvoices > 0 ? (mindeeFallback / totalInvoices) * 100 : 0;
  
  const needsReviewCount = invoicesData?.filter(inv => inv.approval_status === 'needs_review').length || 0;
  const needsReviewRate = totalFiltered > 0 ? (needsReviewCount / totalFiltered) * 100 : 0;
  
  const autoPostedCount = invoicesData?.filter(inv => inv.entry_id !== null).length || 0;
  const autoPostRate = totalFiltered > 0 ? (autoPostedCount / totalFiltered) * 100 : 0;
  
  const noCorrectionsCount = invoicesData?.filter(inv => 
    inv.confidence_score && inv.confidence_score >= 0.9 && inv.approval_status !== 'needs_review'
  ).length || 0;
  const successRate = totalFiltered > 0 ? (noCorrectionsCount / totalFiltered) * 100 : 0;

  // Distribución de estados
  const statusDistribution = [
    { name: 'Aprobado', value: invoicesData?.filter(i => i.approval_status === 'approved_accounting').length || 0, color: 'hsl(var(--chart-1))' },
    { name: 'Revisión', value: invoicesData?.filter(i => i.approval_status === 'needs_review' || i.approval_status === 'pending_approval').length || 0, color: 'hsl(var(--chart-2))' },
    { name: 'Rechazado', value: invoicesData?.filter(i => i.approval_status === 'rejected').length || 0, color: 'hsl(var(--chart-3))' },
    { name: 'Contabilizado', value: invoicesData?.filter(i => i.entry_id !== null).length || 0, color: 'hsl(var(--chart-4))' }
  ].filter(s => s.value > 0);

  // Top proveedores con errores OCR (baja confianza < 0.7)
  const supplierErrors = invoicesData
    ?.filter(inv => inv.confidence_score && inv.confidence_score < 0.7 && inv.supplier)
    .reduce((acc: any[], inv: any) => {
      const supplier = inv.supplier;
      const existing = acc.find(s => s.tax_id === supplier.tax_id);
      if (existing) {
        existing.count++;
        existing.avgConfidence = (existing.avgConfidence + (inv.confidence_score || 0)) / 2;
      } else {
        acc.push({
          name: supplier.name,
          tax_id: supplier.tax_id,
          count: 1,
          avgConfidence: inv.confidence_score || 0
        });
      }
      return acc;
    }, [])
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10) || [];

  const COLORS = {
    openai: 'hsl(var(--chart-1))',
    mindee: 'hsl(var(--chart-2))',
    merged: 'hsl(var(--chart-3))'
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard OCR Híbrido</h1>
          <p className="text-muted-foreground mt-1">Control de OpenAI + Mindee · Costes · Confianza · Auto-posting</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Periodo</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7 días</SelectItem>
                  <SelectItem value="30d">Último mes</SelectItem>
                  <SelectItem value="3m">Últimos 3 meses</SelectItem>
                  <SelectItem value="6m">Últimos 6 meses</SelectItem>
                  <SelectItem value="1y">Último año</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Centro</label>
              <Select value={selectedCentro} onValueChange={setSelectedCentro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los centros</SelectItem>
                  {centros?.map(c => (
                    <SelectItem key={c.codigo} value={c.codigo}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Motor OCR</label>
              <Select value={selectedEngine} onValueChange={setSelectedEngine}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="mindee">Mindee</SelectItem>
                  <SelectItem value="merged">Merged</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="approved_accounting">Aprobado</SelectItem>
                  <SelectItem value="needs_review">Requiere revisión</SelectItem>
                  <SelectItem value="pending_approval">Pendiente</SelectItem>
                  <SelectItem value="rejected">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFiltered.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Periodo seleccionado
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
              €{(totalCost / totalInvoices || 0).toFixed(4)} / factura
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confianza Media</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConfidence.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Precisión OCR
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

      {/* KPIs adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Acierto</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sin corrección manual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fallback Mindee</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{fallbackRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {mindeeFallback} facturas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requiere Revisión</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{needsReviewRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {needsReviewCount} facturas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Post Rate</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{autoPostRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {autoPostedCount} contabilizadas
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

      {/* Gráficos de distribución */}
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

        <Card>
          <CardHeader>
            <CardTitle>Distribución de Estados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.name} (${entry.value})`}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top proveedores con errores */}
      {supplierErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Proveedores - Incidencias OCR</CardTitle>
            <p className="text-sm text-muted-foreground">Proveedores con mayor número de facturas con baja confianza (&lt; 70%)</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {supplierErrors.map((supplier: any, idx: number) => (
                <div 
                  key={supplier.tax_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{supplier.name}</p>
                      <p className="text-xs text-muted-foreground">{supplier.tax_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{supplier.count}</p>
                    <p className="text-xs text-muted-foreground">
                      {(supplier.avgConfidence * 100).toFixed(0)}% confianza
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
