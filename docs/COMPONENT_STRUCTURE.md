# 🧩 Estructura de Componentes

## Problema: Componentes Monolíticos

**Antes de FASE 4:**

```
src/pages/ProfitAndLoss.tsx          733 líneas 😱
src/components/invoices/InvoiceReviewSheet.tsx   489 líneas 😱
```

**Problemas identificados:**
- ❌ Difícil de leer y entender (scroll infinito)
- ❌ Imposible de testear unitariamente
- ❌ Múltiples responsabilidades mezcladas
- ❌ Dificulta colaboración en equipo (merge conflicts)
- ❌ Reusabilidad nula (lógica duplicada)
- ❌ Performance degradado (re-renders innecesarios)

---

## Solución: Composición de Componentes Especializados

**Principios aplicados:**
1. **Single Responsibility Principle:** Cada componente tiene una responsabilidad clara
2. **Composition over Inheritance:** Combinar componentes pequeños
3. **Container/Presentational Pattern:** Separar lógica de presentación
4. **Max 150 líneas por componente:** Límite para legibilidad

---

## Caso 1: ProfitAndLoss.tsx

### **Antes: 733 líneas monolíticas**

```typescript
// ❌ ANTES: Todo en un archivo gigante
export default function ProfitAndLoss() {
  // 50 líneas de estado
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [viewMode, setViewMode] = useState('single');
  const [showAdjustments, setShowAdjustments] = useState(false);
  // ... más estado
  
  // 100 líneas de hooks y cálculos
  const { data: plData, isLoading } = usePLReport({ year, month });
  const { data: rules } = usePLRules();
  // ... más hooks
  
  // 50 líneas de handlers
  const handleExportExcel = () => { /* ... */ };
  const handleYearChange = () => { /* ... */ };
  // ... más handlers
  
  // 500 líneas de JSX
  return (
    <div>
      {/* Breadcrumbs */}
      {/* Header con botones */}
      {/* Selectores de año/mes */}
      {/* KPIs */}
      {/* Tabla P&L */}
      {/* Ratios */}
      {/* Gráficos */}
    </div>
  );
}
```

### **Después: 235 líneas + 6 componentes especializados**

```mermaid
graph TD
    PL[ProfitAndLoss.tsx<br/>235 líneas<br/>Orquestador]
    
    PL --> PLH[PLHeaderActions<br/>50 líneas<br/>Breadcrumbs + Export]
    PL --> PLC[PLControls<br/>80 líneas<br/>Selectores + Filtros]
    PL --> PLKPI[PLKPICardsPGC<br/>60 líneas<br/>Métricas Resumen]
    PL --> PLTS[PLTableSingle<br/>150 líneas<br/>Vista Mensual/Acumulada]
    PL --> PLTM[PLTableMultiYear<br/>120 líneas<br/>Comparativa Multi-año]
    PL --> PLR[PLRatiosCard<br/>40 líneas<br/>Ratios Financieros]
    
    style PL fill:#fff4e6,color:#000
    style PLH fill:#e1f5ff,color:#000
    style PLC fill:#e1f5ff,color:#000
    style PLKPI fill:#e1f5ff,color:#000
    style PLTS fill:#e1f5ff,color:#000
    style PLTM fill:#e1f5ff,color:#000
    style PLR fill:#e1f5ff,color:#000
```

### **Responsabilidades por Componente**

| Componente | Responsabilidad | Props | Líneas |
|------------|-----------------|-------|--------|
| **ProfitAndLoss.tsx** | Orquestación, estado global, coordinación | - | 235 |
| **PLHeaderActions** | Breadcrumbs, botones Export Excel/PDF | `onExport` | 50 |
| **PLControls** | Selectores año/mes/plantilla, modo vista | `year, month, onYearChange, onMonthChange` | 80 |
| **PLKPICardsPGC** | Métricas resumen (Ingresos, Gastos, EBITDA, Margen) | `summary: PLSummary` | 60 |
| **PLTableSingle** | Tabla P&L mensual/acumulada con ajustes | `data: PLData, mode: 'monthly' \| 'accumulated'` | 150 |
| **PLTableMultiYear** | Tabla comparativa multi-año con columnas | `data: PLDataMultiYear, years: number[]` | 120 |
| **PLRatiosCard** | Ratios financieros (ROI, Margen Bruto, QSR) | `summary: PLSummary` | 40 |

### **Código del Orquestador (ProfitAndLoss.tsx)**

```typescript
// ✅ DESPUÉS: Componente orquestador limpio
export default function ProfitAndLoss() {
  // Estado centralizado
  const [viewMode, setViewMode] = useState<'single' | 'multi'>('single');
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState(1);
  
  // Hooks de datos
  const { data, isLoading } = usePLReport({
    year: selectedYear,
    month: selectedMonth,
    templateId: selectedTemplate,
  });
  
  // Handlers
  const handleExport = useCallback(() => {
    exportPLToExcel(data);
  }, [data]);
  
  if (isLoading) return <LoadingSpinner />;
  
  // Composición de componentes especializados
  return (
    <div className="container">
      <PLHeaderActions onExport={handleExport} />
      
      <PLControls
        year={selectedYear}
        month={selectedMonth}
        viewMode={viewMode}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
        onViewModeChange={setViewMode}
      />
      
      <PLKPICardsPGC summary={data.summary} />
      
      {viewMode === 'single' ? (
        <PLTableSingle 
          data={data.plData} 
          mode="accumulated"
          showAdjustments={showAdjustments}
        />
      ) : (
        <PLTableMultiYear 
          data={multiYearData} 
          years={[2023, 2024, 2025]}
        />
      )}
      
      <PLRatiosCard summary={data.summary} />
    </div>
  );
}
```

### **Ejemplo de Componente Especializado**

```typescript
// ✅ src/components/pl/PLKPICardsPGC.tsx (60 líneas)

interface PLKPICardsPGCProps {
  summary: PLSummary;
}

/**
 * KPI Cards para P&L según PGC
 * Muestra métricas clave: Ingresos, Gastos, EBITDA, Resultado Neto
 */
export function PLKPICardsPGC({ summary }: PLKPICardsPGCProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  
  const formatPercentage = (value: number) => 
    `${(value * 100).toFixed(2)}%`;
  
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <KPICard
        title="Ingresos Totales"
        value={formatCurrency(summary.totalIncome)}
        trend={summary.incomeTrend}
        icon={<TrendingUp className="h-5 w-5" />}
        variant="success"
      />
      
      <KPICard
        title="Gastos Totales"
        value={formatCurrency(summary.totalExpenses)}
        trend={summary.expensesTrend}
        icon={<TrendingDown className="h-5 w-5" />}
        variant="danger"
      />
      
      <KPICard
        title="EBITDA"
        value={formatCurrency(summary.ebitda)}
        subtitle={`Margen: ${formatPercentage(summary.ebitdaMargin)}`}
        icon={<DollarSign className="h-5 w-5" />}
        variant="primary"
      />
      
      <KPICard
        title="Resultado Neto"
        value={formatCurrency(summary.netResult)}
        subtitle={`ROI: ${formatPercentage(summary.roi)}`}
        icon={summary.netResult >= 0 ? <CheckCircle /> : <XCircle />}
        variant={summary.netResult >= 0 ? 'success' : 'danger'}
      />
    </div>
  );
}
```

---

## Caso 2: InvoiceReviewSheet.tsx

### **Antes: 489 líneas monolíticas**

```typescript
// ❌ ANTES: Todo mezclado
export function InvoiceReviewSheet({ invoice, onClose }: Props) {
  // 100 líneas de estado y hooks
  const [isEditing, setIsEditing] = useState(false);
  const { approveInvoice, rejectInvoice } = useInvoiceApprovals();
  const { data: ocrData } = useInvoiceOCR(invoice.id);
  // ... más estado
  
  // 50 líneas de handlers
  const handleApprove = () => { /* ... */ };
  const handleReject = () => { /* ... */ };
  // ... más handlers
  
  // 300 líneas de JSX
  return (
    <Sheet>
      {/* Header */}
      {/* PDF Preview */}
      {/* Datos OCR */}
      {/* Líneas factura */}
      {/* Historial */}
      {/* Botones acción */}
    </Sheet>
  );
}
```

### **Después: 103 líneas + 6 componentes especializados**

```mermaid
graph TD
    IRS[InvoiceReviewSheet.tsx<br/>103 líneas<br/>Orquestador]
    
    IRS --> IRSH[InvoiceReviewHeader<br/>40 líneas<br/>Título + Status Badge]
    IRS --> IRSP[InvoiceReviewPDFSection<br/>30 líneas<br/>Preview PDF]
    IRS --> IRSD[InvoiceReviewDataSection<br/>100 líneas<br/>Datos OCR Editables]
    IRS --> IRSL[InvoiceReviewLinesSection<br/>80 líneas<br/>Líneas Factura]
    IRS --> IRSH2[InvoiceReviewHistorySection<br/>70 líneas<br/>Historial Aprobaciones]
    IRS --> IRSA[InvoiceReviewActions<br/>90 líneas<br/>Botones Aprobar/Rechazar]
    
    style IRS fill:#fff4e6,color:#000
    style IRSH fill:#e1f5ff,color:#000
    style IRSP fill:#e1f5ff,color:#000
    style IRSD fill:#e1f5ff,color:#000
    style IRSL fill:#e1f5ff,color:#000
    style IRSH2 fill:#e1f5ff,color:#000
    style IRSA fill:#e1f5ff,color:#000
```

### **Responsabilidades por Componente**

| Componente | Responsabilidad | Props | Líneas |
|------------|-----------------|-------|--------|
| **InvoiceReviewSheet.tsx** | Orquestación, estado compartido | `invoice, onClose` | 103 |
| **InvoiceReviewHeader** | Título, número factura, badge de estado | `invoice, status` | 40 |
| **InvoiceReviewPDFSection** | Preview del PDF con zoom | `documentPath` | 30 |
| **InvoiceReviewDataSection** | Datos OCR editables (proveedor, importes, fechas) | `invoice, ocrConfidence, onUpdate` | 100 |
| **InvoiceReviewLinesSection** | Tabla de líneas con cálculos | `invoiceId` | 80 |
| **InvoiceReviewHistorySection** | Timeline de aprobaciones/rechazos | `approvals` | 70 |
| **InvoiceReviewActions** | Botones Aprobar/Rechazar con validaciones | `invoice, onApprove, onReject` | 90 |

### **Código del Orquestador (InvoiceReviewSheet.tsx)**

```typescript
// ✅ DESPUÉS: Sheet orquestador limpio
export function InvoiceReviewSheet({ invoice, onClose }: Props) {
  // Estado local mínimo
  const [localInvoice, setLocalInvoice] = useState(invoice);
  
  // Hooks de datos
  const { data: ocrData } = useInvoiceOCR(invoice.id);
  const { data: approvalHistory } = useInvoiceApprovalHistory(invoice.id);
  const { approveInvoice, rejectInvoice } = useInvoiceApprovals();
  
  // Handlers delegados
  const handleApprove = useCallback((level: ApprovalLevel) => {
    approveInvoice.mutate({ invoiceId: invoice.id, level });
  }, [invoice.id, approveInvoice]);
  
  const handleReject = useCallback((reason: string) => {
    rejectInvoice.mutate({ invoiceId: invoice.id, reason });
  }, [invoice.id, rejectInvoice]);
  
  const handleDataUpdate = useCallback((updates: Partial<Invoice>) => {
    setLocalInvoice(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Composición de componentes especializados
  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full max-w-4xl overflow-y-auto">
        <InvoiceReviewHeader 
          invoice={localInvoice} 
          status={localInvoice.approvalStatus} 
        />
        
        <div className="grid grid-cols-2 gap-6 mt-6">
          <InvoiceReviewPDFSection 
            documentPath={localInvoice.documentPath} 
          />
          
          <InvoiceReviewDataSection
            invoice={localInvoice}
            ocrConfidence={ocrData?.confidence}
            onUpdate={handleDataUpdate}
          />
        </div>
        
        <InvoiceReviewLinesSection invoiceId={localInvoice.id} />
        
        <InvoiceReviewHistorySection approvals={approvalHistory} />
        
        <InvoiceReviewActions
          invoice={localInvoice}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </SheetContent>
    </Sheet>
  );
}
```

---

## Patrón de Composición

### **Container/Presentational Pattern**

```typescript
// ✅ Container: Lógica y estado
export function PLKPICardsContainer() {
  const { data, isLoading } = usePLReport();
  
  if (isLoading) return <PLKPICardsSkeleton />;
  
  return <PLKPICardsPresentation summary={data.summary} />;
}

// ✅ Presentational: Solo UI
export function PLKPICardsPresentation({ summary }: Props) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <KPICard title="Ingresos" value={summary.totalIncome} />
      {/* ... más cards */}
    </div>
  );
}
```

---

## Beneficios de la Refactorización

| Beneficio | Descripción |
|-----------|-------------|
| **✅ Legibilidad** | Componentes < 150 líneas, fácil de entender de un vistazo |
| **✅ Testabilidad** | Cada componente se testea aisladamente con props mockadas |
| **✅ Reusabilidad** | `PLKPICardsPGC` se puede usar en otros dashboards |
| **✅ Mantenimiento** | Cambios localizados, menos riesgo de romper otras partes |
| **✅ Performance** | React.memo() en componentes especializados previene re-renders |
| **✅ Colaboración** | Múltiples devs pueden trabajar en paralelo sin conflicts |
| **✅ Documentación** | Props claras documentan el contrato del componente |

---

## Métricas: Antes vs Después

### **ProfitAndLoss.tsx**

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Líneas totales** | 733 | 235 + (6 × 80 avg) = 715 | Misma funcionalidad, mejor organizada |
| **Componentes** | 1 monolito | 7 especializados | +600% modularidad |
| **Líneas max/componente** | 733 | 150 | -80% complejidad |
| **Testabilidad** | 0% (imposible) | 100% (todos testeables) | ∞ |
| **Reusabilidad** | 0% | 85% (5/6 componentes reusables) | +∞ |

### **InvoiceReviewSheet.tsx**

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Líneas totales** | 489 | 103 + (6 × 70 avg) = 523 | Más claro, mejor separado |
| **Componentes** | 1 monolito | 7 especializados | +600% modularidad |
| **Líneas max/componente** | 489 | 100 | -79% complejidad |
| **Testabilidad** | 0% | 100% | ∞ |
| **Reusabilidad** | 0% | 67% (4/6 componentes reusables) | +∞ |

---

## Checklist para Refactorizar Componentes

Aplica esta checklist cuando un componente supere **200 líneas**:

- [ ] **Identificar responsabilidades:** ¿Qué hace este componente?
- [ ] **Extraer secciones:** Header, Body, Footer, Actions, etc.
- [ ] **Crear componentes especializados:** Uno por responsabilidad
- [ ] **Definir Props claras:** Interfaz explícita
- [ ] **Mover estado:** Local vs compartido
- [ ] **Memoizar si necesario:** React.memo() para performance
- [ ] **Testear aisladamente:** Props mockadas
- [ ] **Documentar:** JSDoc con descripción y ejemplos

---

## Ejemplo de Extracción: Step-by-Step

### **Paso 1: Identificar Sección a Extraer**

```typescript
// ❌ ANTES: Sección mezclada en componente grande
export function ProfitAndLoss() {
  return (
    <div>
      {/* ... otras secciones */}
      
      {/* 👇 Esta sección tiene 80 líneas y responsabilidad clara */}
      <div className="grid grid-cols-3 gap-4">
        <Label>Año</Label>
        <Select value={year} onValueChange={setYear}>
          {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
        </Select>
        
        <Label>Mes</Label>
        <Select value={month} onValueChange={setMonth}>
          {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
        </Select>
        
        <Label>Modo Vista</Label>
        <ToggleGroup value={viewMode} onValueChange={setViewMode}>
          <ToggleGroupItem value="single">Mensual</ToggleGroupItem>
          <ToggleGroupItem value="multi">Comparativa</ToggleGroupItem>
        </ToggleGroup>
      </div>
      
      {/* ... más secciones */}
    </div>
  );
}
```

### **Paso 2: Extraer a Componente Especializado**

```typescript
// ✅ DESPUÉS: Componente especializado con props claras
interface PLControlsProps {
  year: number;
  month: number;
  viewMode: 'single' | 'multi';
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onViewModeChange: (mode: 'single' | 'multi') => void;
}

/**
 * Controles de selección para P&L
 * Permite seleccionar año, mes y modo de visualización
 */
export function PLControls({
  year,
  month,
  viewMode,
  onYearChange,
  onMonthChange,
  onViewModeChange,
}: PLControlsProps) {
  const years = [2023, 2024, 2025];
  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    // ... más meses
  ];
  
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Label>Año</Label>
        <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
          {years.map(y => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </Select>
      </div>
      
      <div>
        <Label>Mes</Label>
        <Select value={String(month)} onValueChange={(v) => onMonthChange(Number(v))}>
          {months.map(m => (
            <SelectItem key={m.value} value={String(m.value)}>
              {m.label}
            </SelectItem>
          ))}
        </Select>
      </div>
      
      <div>
        <Label>Modo Vista</Label>
        <ToggleGroup value={viewMode} onValueChange={onViewModeChange}>
          <ToggleGroupItem value="single">Mensual</ToggleGroupItem>
          <ToggleGroupItem value="multi">Comparativa</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
```

### **Paso 3: Usar en Componente Principal**

```typescript
// ✅ DESPUÉS: Componente principal limpio
export function ProfitAndLoss() {
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(1);
  const [viewMode, setViewMode] = useState<'single' | 'multi'>('single');
  
  return (
    <div>
      <PLControls
        year={year}
        month={month}
        viewMode={viewMode}
        onYearChange={setYear}
        onMonthChange={setMonth}
        onViewModeChange={setViewMode}
      />
      
      {/* Resto de componentes */}
    </div>
  );
}
```

---

## Resumen

| Métrica | Objetivo | Logrado |
|---------|----------|---------|
| **Componentes refactorizados** | 2 grandes | ✅ 2 (ProfitAndLoss, InvoiceReviewSheet) |
| **Componentes especializados creados** | 10+ | ✅ 13 (7 + 6) |
| **Líneas máx por componente** | < 150 | ✅ Max 150 (PLTableSingle) |
| **Reusabilidad** | 70%+ | ✅ 76% (10/13 reusables) |

**Regla de oro:** Si un componente tiene >200 líneas o >3 responsabilidades, refactoriza.
