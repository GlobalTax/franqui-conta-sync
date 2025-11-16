import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  Circle, 
  RefreshCw, 
  Download,
  AlertTriangle,
  Rocket
} from 'lucide-react';
import { toast } from 'sonner';

interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  critical?: boolean;
}

interface ChecklistCategory {
  id: string;
  name: string;
  icon: string;
  items: ChecklistItem[];
}

const CHECKLIST_DATA: ChecklistCategory[] = [
  {
    id: 'funcionalidad',
    name: 'Funcionalidad Core',
    icon: '⚙️',
    items: [
      {
        id: 'upload-mindee',
        label: 'Subir factura nueva → Procesada con Mindee automáticamente',
        description: 'Sin pregunta de motor, directo a Mindee',
        critical: true
      },
      {
        id: 'legacy-badge',
        label: 'Ver factura histórica OpenAI → Badge "OpenAI (Legacy)" visible',
        description: 'Facturas antiguas mantienen su indicador'
      },
      {
        id: 'reprocess-mindee',
        label: 'Reprocesar factura → Usa mindee-invoice-ocr',
        description: 'Dialog de reprocesamiento solo muestra Mindee',
        critical: true
      },
      {
        id: 'fallback-alert',
        label: 'Factura con fallback → Badge ⚠️ y alert visible',
        description: 'Parsers de fallback activan alertas visuales'
      },
      {
        id: 'havi-critical',
        label: 'Proveedor crítico Havi → approval_status = "ocr_review"',
        description: 'Detección automática de proveedor que requiere revisión',
        critical: true
      },
      {
        id: 'filter-openai',
        label: 'Filtrar por motor "openai" → Muestra facturas antiguas',
        description: 'Filtros históricos funcionan correctamente'
      },
      {
        id: 'filter-mindee',
        label: 'Filtrar por motor "mindee" → Muestra facturas nuevas',
        description: 'Filtrado por Mindee funciona'
      }
    ]
  },
  {
    id: 'metricas',
    name: 'Métricas y Analytics',
    icon: '📊',
    items: [
      {
        id: 'metrics-card',
        label: 'MindeeMetricsCard visible en detalle de factura',
        description: 'Muestra confianza, coste, tiempo, páginas',
        critical: true
      },
      {
        id: 'tooltip-badge',
        label: 'Tooltip en badge muestra confianza Mindee',
        description: 'Hover sobre badge en tabla'
      },
      {
        id: 'dashboard-metrics',
        label: 'Dashboard digitalización muestra métricas Mindee',
        description: 'Estadísticas de OCR actualizadas'
      },
      {
        id: 'cost-tracking',
        label: 'Coste acumulado Mindee visible',
        description: 'Tracking de costes de procesamiento'
      }
    ]
  },
  {
    id: 'parsers',
    name: 'Parsers de Fallback',
    icon: '🔧',
    items: [
      {
        id: 'european-numbers',
        label: 'parseEuropeanNumber() funciona con "1.234,56"',
        description: 'Convierte formato europeo correctamente',
        critical: true
      },
      {
        id: 'extract-nif',
        label: 'extractCustomerDataFromRawText() extrae NIF/CIF',
        description: 'Parser de texto raw para identificación fiscal'
      },
      {
        id: 'extract-iva',
        label: 'extractTaxBreakdownFromText() extrae bases IVA',
        description: 'Desglose de IVA 10% y 21% desde texto'
      },
      {
        id: 'fallback-flag',
        label: 'Flag ocr_fallback_used activado cuando aplica',
        description: 'DB guarda si se usaron parsers de respaldo',
        critical: true
      }
    ]
  },
  {
    id: 'proveedores',
    name: 'Tests con Proveedores Reales',
    icon: '🏢',
    items: [
      {
        id: 'makro-test',
        label: 'Factura Makro → NIF, total, IVA 10% correctos',
        description: 'Alimentos con IVA reducido'
      },
      {
        id: 'europastry-test',
        label: 'Factura Europastry → Pan/bollería, IVA 10%',
        description: 'Productos de panadería'
      },
      {
        id: 'havi-test',
        label: 'Factura Havi Logistics → Detección crítica, ocr_review',
        description: 'Proveedor que requiere revisión obligatoria',
        critical: true
      },
      {
        id: 'cocacola-test',
        label: 'Factura Coca-Cola → Bebidas, IVA 21%',
        description: 'Productos con IVA general'
      },
      {
        id: 'iberdrola-test',
        label: 'Factura Iberdrola → Servicios, IVA 21%, múltiples conceptos',
        description: 'Factura de servicios compleja'
      },
      {
        id: 'scanned-test',
        label: 'Factura escaneada low-quality → Parsers fallback activos',
        description: 'PDF escaneado con baja calidad',
        critical: true
      }
    ]
  },
  {
    id: 'configuracion',
    name: 'Configuración y Secrets',
    icon: '🔐',
    items: [
      {
        id: 'mindee-key',
        label: 'MINDEE_API_KEY configurada en Supabase',
        description: 'Secret necesario para edge function',
        critical: true
      },
      {
        id: 'config-clean',
        label: 'config.toml sin referencias a edge functions legacy',
        description: 'Solo mindee-invoice-ocr en config'
      },
      {
        id: 'rls-policies',
        label: 'RLS policies correctas en invoices_received',
        description: 'Permisos de lectura/escritura configurados'
      },
      {
        id: 'db-columns',
        label: 'Columnas Mindee existen en DB',
        description: 'mindee_confidence, mindee_cost_euros, etc.'
      }
    ]
  },
  {
    id: 'build',
    name: 'Build y Deploy',
    icon: '🚀',
    items: [
      {
        id: 'npm-build',
        label: 'npm run build sin errores TypeScript',
        description: 'Compilación exitosa',
        critical: true
      },
      {
        id: 'edge-deployed',
        label: 'Edge function desplegada correctamente',
        description: 'mindee-invoice-ocr accesible'
      },
      {
        id: 'no-broken-refs',
        label: 'No hay referencias rotas a componentes eliminados',
        description: 'OCREngineSelector, etc. no referenciados'
      },
      {
        id: 'navigation-ok',
        label: 'Navegación funciona sin rutas 404',
        description: 'Todas las rutas accesibles'
      }
    ]
  }
];

const STORAGE_KEY = 'mindee-migration-checklist-v1';

export default function MigrationValidationChecklist() {
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Cargar estado desde localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCompletedItems(new Set(parsed));
      } catch (e) {
        console.error('Error loading checklist state:', e);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Guardar estado en localStorage
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedItems]));
    }
  }, [completedItems, isLoading]);

  const toggleItem = (itemId: string) => {
    setCompletedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const resetChecklist = () => {
    if (confirm('¿Estás seguro de que quieres reiniciar toda la checklist?')) {
      setCompletedItems(new Set());
      toast.success('Checklist reiniciada');
    }
  };

  const exportResults = () => {
    const results = CHECKLIST_DATA.map(category => ({
      category: category.name,
      items: category.items.map(item => ({
        label: item.label,
        completed: completedItems.has(item.id),
        critical: item.critical || false
      }))
    }));

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `migration-validation-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Resultados exportados');
  };

  const totalItems = CHECKLIST_DATA.reduce((acc, cat) => acc + cat.items.length, 0);
  const completedCount = completedItems.size;
  const progressPercent = Math.round((completedCount / totalItems) * 100);

  const criticalItems = CHECKLIST_DATA.flatMap(cat => 
    cat.items.filter(item => item.critical)
  );
  const completedCritical = criticalItems.filter(item => completedItems.has(item.id)).length;
  const criticalPercent = Math.round((completedCritical / criticalItems.length) * 100);

  const isReadyForProduction = criticalPercent === 100;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Validación Post-Migración a Mindee
        </h1>
        <p className="text-muted-foreground">
          Checklist interactiva de todos los escenarios críticos antes de deploy a producción
        </p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Progreso General</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportResults}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button variant="outline" size="sm" onClick={resetChecklist}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reiniciar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total completado</span>
              <span className="font-semibold">{completedCount} / {totalItems}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Items críticos
              </span>
              <span className="font-semibold">{completedCritical} / {criticalItems.length}</span>
            </div>
            <Progress value={criticalPercent} className="h-2" />
          </div>

          {isReadyForProduction ? (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <Rocket className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                <strong>✅ Listo para Producción</strong> - Todos los items críticos están verificados
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Pendiente:</strong> Completa los {criticalItems.length - completedCritical} items críticos restantes antes de deploy
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Checklist Categories */}
      {CHECKLIST_DATA.map(category => {
        const categoryCompleted = category.items.filter(item => 
          completedItems.has(item.id)
        ).length;
        const categoryPercent = Math.round((categoryCompleted / category.items.length) * 100);

        return (
          <Card key={category.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{category.icon}</span>
                  {category.name}
                  <Badge variant="outline">
                    {categoryCompleted}/{category.items.length}
                  </Badge>
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  {categoryPercent}%
                </span>
              </div>
              <Progress value={categoryPercent} className="h-1" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {category.items.map(item => {
                  const isCompleted = completedItems.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`
                        flex items-start gap-3 p-3 rounded-lg border transition-colors
                        ${isCompleted ? 'bg-muted/50 border-primary/20' : 'hover:bg-muted/30'}
                        ${item.critical ? 'border-l-4 border-l-orange-500' : ''}
                      `}
                    >
                      <Checkbox
                        id={item.id}
                        checked={isCompleted}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-1"
                      />
                      <label
                        htmlFor={item.id}
                        className="flex-1 cursor-pointer space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                            {item.label}
                          </span>
                          {item.critical && (
                            <Badge variant="destructive" className="text-xs">
                              Crítico
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground pl-6">
                            {item.description}
                          </p>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Footer Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Última actualización: {new Date().toLocaleString('es-ES')}
            </p>
            {isReadyForProduction ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Sistema validado y listo para deploy</span>
              </div>
            ) : (
              <p className="text-sm">
                Completa todos los items críticos antes de desplegar a producción
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
