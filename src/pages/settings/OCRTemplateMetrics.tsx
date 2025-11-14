// ============================================================================
// OCR TEMPLATE METRICS
// Dashboard de métricas y analytics para templates OCR
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Activity, TrendingUp, Zap, Target, FileText, Clock } from "lucide-react";
import { useState } from "react";

export default function OCRTemplateMetrics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Fetch template usage stats
  const { data: templateStats } = useQuery({
    queryKey: ['template-stats', timeRange],
    queryFn: async () => {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('supplier_ocr_templates')
        .select(`
          id,
          template_name,
          supplier_id,
          usage_count,
          avg_confidence,
          confidence_threshold,
          last_used_at,
          created_at,
          suppliers (
            name,
            tax_id
          )
        `)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Fetch OCR processing comparison
  const { data: ocrComparison } = useQuery({
    queryKey: ['ocr-comparison', timeRange],
    queryFn: async () => {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('invoices_received')
        .select('ocr_engine_used, ocr_confidence, updated_at')
        .gte('updated_at', startDate.toISOString())
        .not('ocr_engine_used', 'is', null);

      if (error) throw error;

      // Agrupar por engine
      const openaiInvoices = data.filter(i => i.ocr_engine_used === 'openai');
      const templateInvoices = data.filter(i => i.ocr_engine_used === 'template');

      return {
        openai: {
          count: openaiInvoices.length,
          avgConfidence: openaiInvoices.length > 0
            ? openaiInvoices.reduce((sum, i) => sum + (i.ocr_confidence || 0), 0) / openaiInvoices.length
            : 0
        },
        template: {
          count: templateInvoices.length,
          avgConfidence: templateInvoices.length > 0
            ? templateInvoices.reduce((sum, i) => sum + (i.ocr_confidence || 0), 0) / templateInvoices.length
            : 0
        }
      };
    }
  });

  // Fetch template performance over time
  const { data: performanceOverTime } = useQuery({
    queryKey: ['template-performance', timeRange],
    queryFn: async () => {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('invoices_received')
        .select('ocr_template_name, ocr_confidence, updated_at')
        .gte('updated_at', startDate.toISOString())
        .eq('ocr_engine_used', 'template')
        .order('updated_at', { ascending: true });

      if (error) throw error;

      // Agrupar por día
      const dailyStats: Record<string, { date: string; avgConfidence: number; count: number }> = {};
      
      data.forEach(invoice => {
        const date = new Date(invoice.updated_at!).toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = { date, avgConfidence: 0, count: 0 };
        }
        dailyStats[date].avgConfidence += (invoice.ocr_confidence || 0);
        dailyStats[date].count += 1;
      });

      return Object.values(dailyStats).map(day => ({
        date: day.date,
        confidence: Math.round((day.avgConfidence / day.count) * 100)
      }));
    }
  });

  const comparisonData = ocrComparison ? [
    { name: 'OpenAI', value: ocrComparison.openai.count, color: '#3b82f6' },
    { name: 'Template', value: ocrComparison.template.count, color: '#10b981' }
  ] : [];

  const totalProcessed = comparisonData.reduce((sum, item) => sum + item.value, 0);
  const templatePercentage = totalProcessed > 0 
    ? Math.round((comparisonData.find(i => i.name === 'Template')?.value || 0) / totalProcessed * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        breadcrumbs={[
          { label: "Configuración", href: "/configuracion" },
          { label: "Templates OCR", href: "/configuracion/ocr-templates" },
          { label: "Métricas" }
        ]}
        title="Métricas de Templates OCR"
        subtitle="Análisis de rendimiento y uso de templates"
      />

      <div className="container mx-auto p-6 space-y-6">
        {/* Time Range Selector */}
        <div className="flex justify-end">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
              <SelectItem value="90d">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Templates Activos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templateStats?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Configurados y activos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uso de Templates</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templatePercentage}%</div>
              <p className="text-xs text-muted-foreground">
                vs OpenAI en período
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confianza Promedio</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ocrComparison?.template.avgConfidence 
                  ? Math.round(ocrComparison.template.avgConfidence * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                En facturas procesadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Procesadas</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProcessed}</div>
              <p className="text-xs text-muted-foreground">
                Facturas con OCR
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución OpenAI vs Template</CardTitle>
              <CardDescription>
                Comparativa de uso de motores OCR
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={comparisonData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {comparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Confidence Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Evolución de Confianza</CardTitle>
              <CardDescription>
                Confianza promedio diaria de templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceOverTime || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString('es-ES')}
                    formatter={(value: number) => [`${value}%`, 'Confianza']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="confidence" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Confianza (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Template Usage Table */}
        <Card>
          <CardHeader>
            <CardTitle>Templates por Proveedor</CardTitle>
            <CardDescription>
              Rendimiento individual de cada template configurado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {templateStats?.map((template) => (
                <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{template.template_name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {(template.suppliers as any)?.name}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      CIF: {(template.suppliers as any)?.tax_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{template.usage_count}</div>
                      <div className="text-xs text-muted-foreground">Usos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {template.avg_confidence 
                          ? Math.round(template.avg_confidence * 100)
                          : '-'}%
                      </div>
                      <div className="text-xs text-muted-foreground">Confianza</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(template.confidence_threshold * 100)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Umbral</div>
                    </div>
                    {template.last_used_at && (
                      <div className="text-center">
                        <Clock className="h-4 w-4 mx-auto text-muted-foreground" />
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(template.last_used_at).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!templateStats || templateStats.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay templates activos configurados
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
