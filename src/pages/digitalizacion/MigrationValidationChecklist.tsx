import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Circle, RefreshCw, Download, AlertTriangle, Rocket } from 'lucide-react';
import { toast } from 'sonner';

interface ChecklistItem { id: string; label: string; description?: string; critical?: boolean; }
interface ChecklistCategory { id: string; name: string; icon: string; items: ChecklistItem[]; }

const CHECKLIST_DATA: ChecklistCategory[] = [
  {
    id: 'funcionalidad', name: 'Funcionalidad Core', icon: '⚙️',
    items: [
      { id: 'upload-claude', label: 'Subir factura nueva → Procesada con Claude Vision automáticamente', description: 'Sin pregunta de motor, directo a Claude', critical: true },
      { id: 'reprocess-claude', label: 'Reprocesar factura → Usa claude-invoice-ocr', description: 'Dialog de reprocesamiento usa Claude Vision', critical: true },
      { id: 'fallback-alert', label: 'Factura con fallback → Badge ⚠️ y alert visible', description: 'Parsers de fallback activan alertas visuales' },
      { id: 'havi-critical', label: 'Proveedor crítico Havi → approval_status = "ocr_review"', description: 'Detección automática de proveedor que requiere revisión', critical: true },
      { id: 'filter-claude', label: 'Filtrar por motor "claude" → Muestra facturas procesadas', description: 'Filtrado por Claude funciona' },
    ]
  },
  {
    id: 'metricas', name: 'Métricas y Analytics', icon: '📊',
    items: [
      { id: 'ocr-badge', label: 'OCREngineBadge muestra "Claude Vision" en detalle', description: 'Badge púrpura con icono correcto', critical: true },
      { id: 'cost-tracking', label: 'Coste acumulado Claude visible', description: 'Tracking de costes de procesamiento' },
    ]
  },
  {
    id: 'parsers', name: 'Parsers de Fallback', icon: '🔧',
    items: [
      { id: 'european-numbers', label: 'parseEuropeanNumber() funciona con "1.234,56"', description: 'Convierte formato europeo correctamente', critical: true },
      { id: 'extract-nif', label: 'extractCustomerDataFromRawText() extrae NIF/CIF', description: 'Parser de texto raw para identificación fiscal' },
      { id: 'fallback-flag', label: 'Flag ocr_fallback_used activado cuando aplica', description: 'DB guarda si se usaron parsers de respaldo', critical: true },
    ]
  },
  {
    id: 'configuracion', name: 'Configuración y Secrets', icon: '🔐',
    items: [
      { id: 'anthropic-key', label: 'ANTHROPIC_API_KEY configurada en Supabase', description: 'Secret necesario para edge function', critical: true },
      { id: 'config-clean', label: 'config.toml solo con claude-invoice-ocr', description: 'Sin referencias a Mindee/OpenAI legacy' },
      { id: 'rls-policies', label: 'RLS policies correctas en invoices_received', description: 'Permisos de lectura/escritura configurados' },
    ]
  },
  {
    id: 'build', name: 'Build y Deploy', icon: '🚀',
    items: [
      { id: 'npm-build', label: 'npm run build sin errores TypeScript', description: 'Compilación exitosa', critical: true },
      { id: 'edge-deployed', label: 'Edge function desplegada correctamente', description: 'claude-invoice-ocr accesible' },
      { id: 'no-broken-refs', label: 'No hay referencias rotas a Mindee/OpenAI', description: 'Cero imports legacy' },
    ]
  }
];

const STORAGE_KEY = 'claude-migration-checklist-v1';

export default function MigrationValidationChecklist() {
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { setCompletedItems(new Set(JSON.parse(saved))); } catch {} }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedItems]));
  }, [completedItems, isLoading]);

  const toggleItem = (id: string) => {
    setCompletedItems(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const resetChecklist = () => { if (confirm('¿Reiniciar checklist?')) { setCompletedItems(new Set()); toast.success('Checklist reiniciada'); } };

  const totalItems = CHECKLIST_DATA.reduce((acc, cat) => acc + cat.items.length, 0);
  const completedCount = completedItems.size;
  const progressPercent = Math.round((completedCount / totalItems) * 100);
  const criticalItems = CHECKLIST_DATA.flatMap(cat => cat.items.filter(i => i.critical));
  const completedCritical = criticalItems.filter(i => completedItems.has(i.id)).length;
  const criticalPercent = Math.round((completedCritical / criticalItems.length) * 100);
  const isReady = criticalPercent === 100;

  if (isLoading) return <div className="container mx-auto p-6"><div className="animate-pulse"><div className="h-8 bg-muted rounded w-1/3 mb-4" /><div className="h-4 bg-muted rounded w-1/2" /></div></div>;

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div><h1 className="text-3xl font-bold mb-2">Validación Post-Migración a Claude Vision</h1><p className="text-muted-foreground">Checklist de escenarios críticos antes de deploy</p></div>
      <Card>
        <CardHeader><CardTitle className="flex items-center justify-between"><span>Progreso General</span><Button variant="outline" size="sm" onClick={resetChecklist}><RefreshCw className="h-4 w-4 mr-2" />Reiniciar</Button></CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><div className="flex justify-between text-sm"><span>Total</span><span className="font-semibold">{completedCount}/{totalItems}</span></div><Progress value={progressPercent} className="h-2" /></div>
          <div className="space-y-2"><div className="flex justify-between text-sm"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" />Críticos</span><span className="font-semibold">{completedCritical}/{criticalItems.length}</span></div><Progress value={criticalPercent} className="h-2" /></div>
          {isReady ? <Alert className="border-green-500 bg-green-50 dark:bg-green-950"><Rocket className="h-4 w-4 text-green-600" /><AlertDescription className="text-green-700 dark:text-green-300"><strong>✅ Listo para Producción</strong></AlertDescription></Alert> : <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>Completa los {criticalItems.length - completedCritical} items críticos restantes</AlertDescription></Alert>}
        </CardContent>
      </Card>
      {CHECKLIST_DATA.map(cat => {
        const done = cat.items.filter(i => completedItems.has(i.id)).length;
        return (
          <Card key={cat.id}>
            <CardHeader><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2"><span className="text-2xl">{cat.icon}</span>{cat.name}<Badge variant="outline">{done}/{cat.items.length}</Badge></CardTitle></div><Progress value={Math.round((done/cat.items.length)*100)} className="h-1" /></CardHeader>
            <CardContent><div className="space-y-3">{cat.items.map(item => {
              const completed = completedItems.has(item.id);
              return (
                <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${completed ? 'bg-muted/50 border-primary/20' : 'hover:bg-muted/30'} ${item.critical ? 'border-l-4 border-l-orange-500' : ''}`}>
                  <Checkbox id={item.id} checked={completed} onCheckedChange={() => toggleItem(item.id)} className="mt-1" />
                  <label htmlFor={item.id} className="flex-1 cursor-pointer space-y-1">
                    <div className="flex items-center gap-2">{completed ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Circle className="h-4 w-4 text-muted-foreground" />}<span className={`text-sm font-medium ${completed ? 'line-through text-muted-foreground' : ''}`}>{item.label}</span>{item.critical && <Badge variant="destructive" className="text-xs">Crítico</Badge>}</div>
                    {item.description && <p className="text-xs text-muted-foreground pl-6">{item.description}</p>}
                  </label>
                </div>
              );
            })}</div></CardContent>
          </Card>
        );
      })}
    </div>
  );
}