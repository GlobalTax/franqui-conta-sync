# 📝 Prompts para Módulos Contables - FranquiConta

Prompts estructurados para implementar módulos contables avanzados siguiendo las convenciones del proyecto.

---

## 1️⃣ MÓDULO: Periodificaciones (Accruals)

```
Actúa como arquitecto de software especializado en contabilidad española PGC.

🧩 Módulo: Periodificaciones Automáticas (Accruals)
🎯 Objetivo: Sistema de reparto temporal de gastos/ingresos según devengo contable (art. 38 C.Co)

📘 Flujo:
1. Usuario crea periodificación desde factura o manual
2. Sistema calcula nº periodos según frecuencia (mensual/trimestral/anual)
3. Genera asientos periódicos "pendientes" en tabla `accrual_entries`
4. Cada periodo, contable aprueba y contabiliza el asiento correspondiente
5. Sistema genera asiento DEBE (gasto/ingreso) / HABER (cuenta de periodificación)
6. Marca entry como "posted" y vincula `accounting_entry_id`

🧱 Estructura DB:
```sql
-- Tabla principal
CREATE TABLE accruals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL REFERENCES centres(codigo),
  accrual_type TEXT CHECK (accrual_type IN ('expense', 'income')), -- gasto o ingreso
  description TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  frequency TEXT CHECK (frequency IN ('monthly', 'quarterly', 'annual')),
  account_code TEXT NOT NULL, -- 480 (gastos anticipados) o 485 (ingresos diferidos)
  counterpart_account TEXT NOT NULL, -- cuenta de gasto 6XX o ingreso 7XX
  invoice_id UUID REFERENCES invoices_received(id), -- opcional, si viene de factura
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asientos periódicos generados
CREATE TABLE accrual_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accrual_id UUID NOT NULL REFERENCES accruals(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  period_date DATE NOT NULL, -- primer día del periodo
  amount NUMERIC(12,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'cancelled')),
  accounting_entry_id UUID REFERENCES accounting_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accrual_entries_status ON accrual_entries(status, period_date);
CREATE INDEX idx_accruals_centro ON accruals(centro_code, status);
```

🧠 Lógica de Negocio:
- **Cálculo de periodos:** `differenceInMonths(end_date, start_date)` según frecuencia
- **Importe por periodo:** `total_amount / nº_periodos` (redondeo a 2 decimales)
- **Ajuste último periodo:** Diferencia por redondeo se suma al último entry
- **Reglas contables:**
  - Gasto anticipado: DEBE 6XX (gasto) / HABER 480 (periodificación activa)
  - Ingreso diferido: DEBE 485 (periodificación pasiva) / HABER 7XX (ingreso)
- **Idempotencia:** Edge function `generate-accrual-entries` verifica que no existan entries previos
- **Cancelación:** Marca status='cancelled' sin eliminar historial

🪄 UI Componentes React:
```typescript
// 1. Formulario de creación
<AccrualForm 
  onSubmit={handleCreate}
  invoice={selectedInvoice} // opcional, pre-fill desde factura
/>

// 2. Listado con tabs
<Tabs>
  <TabsList>
    <TabsTrigger value="active">Activas</TabsTrigger>
    <TabsTrigger value="completed">Completadas</TabsTrigger>
  </TabsList>
  <TabsContent value="active">
    <AccrualsList accruals={activeAccruals} />
  </TabsContent>
</Tabs>

// 3. Calendario de asientos periódicos
<AccrualCalendar 
  accrual={selectedAccrual}
  entries={entries}
  onPostEntry={handlePost}
/>

// 4. Métricas
<div className="grid gap-4 md:grid-cols-4">
  <MetricCard title="Total Periodificaciones" value={total} />
  <MetricCard title="Activas" value={active} />
  <MetricCard title="Pendientes Contabilizar" value={pending} />
  <MetricCard title="Completadas" value={completed} />
</div>
```

🪝 Hooks:
```typescript
// src/hooks/useAccruals.ts
export const useAccruals = () => {
  const { selectedView } = useView();
  
  const accruals = useQuery({
    queryKey: ["accruals", selectedView?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accruals")
        .select("*")
        .eq("centro_code", selectedView.code)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Accrual[];
    },
  });

  const createAccrual = useMutation({
    mutationFn: async (newAccrual: Omit<Accrual, "id">) => {
      const { data, error } = await supabase
        .from("accruals")
        .insert([newAccrual])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accruals"] });
      toast.success("Periodificación creada");
    },
  });

  return { accruals: accruals.data || [], createAccrual: createAccrual.mutateAsync };
};

// src/hooks/useAccrualPosting.ts
export const useAccrualPosting = () => {
  const generateEntries = useMutation({
    mutationFn: async ({ accrualId }: { accrualId: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-accrual-entries", {
        body: { accrualId },
      });
      if (error) throw error;
      return data;
    },
  });

  const postEntry = useMutation({
    mutationFn: async ({ entryId, accrualId }: { entryId: string; accrualId: string }) => {
      const { data, error } = await supabase.functions.invoke("post-accrual-entry", {
        body: { entryId, accrualId },
      });
      if (error) throw error;
      return data;
    },
  });

  return { generateEntries: generateEntries.mutateAsync, postEntry: postEntry.mutateAsync };
};
```

📦 Edge Functions:
```typescript
// supabase/functions/generate-accrual-entries/index.ts
Deno.serve(async (req) => {
  const { accrualId } = await req.json();
  
  // 1. Fetch accrual
  const { data: accrual } = await supabase
    .from("accruals")
    .select("*")
    .eq("id", accrualId)
    .single();
  
  // 2. Calculate periods
  const startDate = new Date(accrual.start_date);
  const endDate = new Date(accrual.end_date);
  const months = differenceInMonths(endDate, startDate);
  const periodsCount = accrual.frequency === 'monthly' ? months : 
                       accrual.frequency === 'quarterly' ? Math.ceil(months / 3) : 1;
  
  // 3. Calculate amount per period
  const baseAmount = Math.floor((accrual.total_amount / periodsCount) * 100) / 100;
  const lastAmount = accrual.total_amount - (baseAmount * (periodsCount - 1));
  
  // 4. Generate entries
  const entries = [];
  let currentDate = startDate;
  for (let i = 0; i < periodsCount; i++) {
    entries.push({
      accrual_id: accrualId,
      period_year: currentDate.getFullYear(),
      period_month: currentDate.getMonth() + 1,
      period_date: currentDate.toISOString().split('T')[0],
      amount: i === periodsCount - 1 ? lastAmount : baseAmount,
      status: 'pending'
    });
    currentDate = addMonths(currentDate, accrual.frequency === 'monthly' ? 1 : 3);
  }
  
  // 5. Insert entries
  const { error } = await supabase.from("accrual_entries").insert(entries);
  if (error) throw error;
  
  return new Response(JSON.stringify({ entries_generated: entries.length }));
});

// supabase/functions/post-accrual-entry/index.ts
Deno.serve(async (req) => {
  const { entryId, accrualId } = await req.json();
  
  // 1. Fetch entry y accrual
  const { data: entry } = await supabase.from("accrual_entries").select("*").eq("id", entryId).single();
  const { data: accrual } = await supabase.from("accruals").select("*").eq("id", accrualId).single();
  
  // 2. Get next entry number
  const { data: lastEntry } = await supabase.rpc("get_next_entry_number", { p_centro_code: accrual.centro_code });
  
  // 3. Create accounting entry
  const { data: accountingEntry } = await supabase.from("accounting_entries").insert({
    centro_code: accrual.centro_code,
    entry_number: lastEntry.next_number,
    entry_date: entry.period_date,
    description: `Periodificación ${accrual.description} - ${entry.period_month}/${entry.period_year}`,
    status: 'posted'
  }).select().single();
  
  // 4. Create transactions
  const transactions = accrual.accrual_type === 'expense' ? [
    { entry_id: accountingEntry.id, account_code: accrual.counterpart_account, movement_type: 'debit', amount: entry.amount, line_number: 1 },
    { entry_id: accountingEntry.id, account_code: accrual.account_code, movement_type: 'credit', amount: entry.amount, line_number: 2 }
  ] : [
    { entry_id: accountingEntry.id, account_code: accrual.account_code, movement_type: 'debit', amount: entry.amount, line_number: 1 },
    { entry_id: accountingEntry.id, account_code: accrual.counterpart_account, movement_type: 'credit', amount: entry.amount, line_number: 2 }
  ];
  
  await supabase.from("accounting_transactions").insert(transactions);
  
  // 5. Update entry status
  await supabase.from("accrual_entries").update({ status: 'posted', accounting_entry_id: accountingEntry.id }).eq("id", entryId);
  
  return new Response(JSON.stringify({ accounting_entry_id: accountingEntry.id }));
});
```

✅ Criterios de Aceptación (DoD):
- [ ] Usuario puede crear periodificación desde factura o manualmente
- [ ] Sistema calcula automáticamente nº periodos según frecuencia
- [ ] Genera asientos periódicos con importes correctos (último ajustado)
- [ ] Calendario visual muestra todos los asientos pendientes
- [ ] Usuario puede aprobar y contabilizar cada asiento individualmente
- [ ] Sistema genera asiento contable correcto según tipo (gasto/ingreso)
- [ ] Edge functions son idempotentes (no duplican entries)
- [ ] Métricas visibles: total, activas, pendientes, completadas
- [ ] Responsive en móvil y desktop
- [ ] Contraste AA accesibilidad
- [ ] Maneja errores con toasts informativos
- [ ] Filtros por estado (activa/completada/cancelada)
- [ ] Export a Excel de periodificaciones
```

---

## 2️⃣ MÓDULO: Provisiones de Gastos (Provisions)

```
Actúa como arquitecto de software especializado en contabilidad española PGC.

🧩 Módulo: Provisiones de Gastos No Facturados
🎯 Objetivo: Contabilizar gastos devengados pendientes de factura (art. 34 PGC) con cancelación automática al recibir factura

📘 Flujo:
1. Usuario crea provisión al cierre mensual para gasto sin factura
2. Sistema genera nº provisión: PROV-{año}-{mes}-{secuencial}
3. Usuario contabiliza provisión → DEBE gasto / HABER provisión
4. Al mes siguiente:
   - **Opción A:** Recibe factura → vincula y cancela provisión (reversa asiento)
   - **Opción B:** Error estimación → cancela provisión manualmente
5. Sistema actualiza status: draft → active → invoiced/cancelled

🧱 Estructura DB:
```sql
CREATE TABLE provisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL REFERENCES centres(codigo),
  provision_number TEXT NOT NULL UNIQUE, -- PROV-2025-01-0001
  provision_date DATE NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  expense_account TEXT NOT NULL, -- 6XX (gasto)
  provision_account TEXT NOT NULL, -- 4099000 (acreedores provisión)
  supplier_name TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'invoiced', 'cancelled')),
  accounting_entry_id UUID REFERENCES accounting_entries(id), -- asiento de provisión
  reversal_entry_id UUID REFERENCES accounting_entries(id), -- asiento de cancelación
  invoice_id UUID REFERENCES invoices_received(id), -- factura que cancela la provisión
  template_id UUID REFERENCES provision_templates(id), -- plantilla usada
  notes TEXT,
  cancelled_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plantillas reutilizables
CREATE TABLE provision_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL REFERENCES centres(codigo),
  name TEXT NOT NULL, -- "Alquiler mensual", "Suministros estimados"
  expense_account TEXT NOT NULL,
  provision_account TEXT NOT NULL,
  default_supplier TEXT,
  default_amount NUMERIC(12,2),
  description_template TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(centro_code, name)
);

CREATE INDEX idx_provisions_status ON provisions(centro_code, status, provision_date);
CREATE INDEX idx_provision_templates_centro ON provision_templates(centro_code, active);
```

🧠 Lógica de Negocio:
- **Numeración automática:** Secuencial por mes (0001, 0002, ...)
- **Reglas contables:**
  - Provisión: DEBE 6XX (gasto) / HABER 4099000 (provisión acreedores)
  - Cancelación: Asiento inverso + nota explicativa
- **Vinculación factura:** Al vincular invoice_id, status → 'invoiced' y genera reversal_entry
- **Plantillas:** Usuario puede crear templates para provisiones recurrentes
- **Periodo fiscal:** Provisión se contabiliza en periodo de creación
- **Cierre periodo:** Provisiones draft no permiten cerrar el periodo

🪄 UI Componentes React:
```typescript
// 1. Formulario con plantillas
<ProvisionForm 
  template={selectedTemplate} // pre-fill desde template
  onSubmit={handleCreate}
  suppliers={suppliersList}
/>

// 2. Lista con acciones
<ProvisionsList 
  provisions={provisions}
  onPost={(id) => postProvision(id)}
  onCancel={(id) => handleCancel(id)}
  onLinkInvoice={(provId, invId) => linkInvoice(provId, invId)}
/>

// 3. Gestor de plantillas
<TemplatesManager 
  templates={templates}
  onCreate={createTemplate}
  onUpdate={updateTemplate}
  onDelete={deleteTemplate}
/>

// 4. Métricas
<div className="grid gap-4 md:grid-cols-4">
  <MetricCard title="Total Provisiones" value={total} />
  <MetricCard title="Borradores" value={drafts} />
  <MetricCard title="Activas" value={active} icon={AlertCircle} variant="warning" />
  <MetricCard title="Importe Activo" value={formatCurrency(totalActive)} />
</div>

// 5. Diálogo de cancelación
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Cancelar Provisión</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleCancelSubmit}>
      <Label>Motivo de cancelación *</Label>
      <Textarea 
        name="reason"
        placeholder="Ej: Error en estimación del importe"
        required
      />
      <Label>Vincular a factura (opcional)</Label>
      <Select name="invoice_id">
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar factura..." />
        </SelectTrigger>
        <SelectContent>
          {invoices.map(inv => (
            <SelectItem key={inv.id} value={inv.id}>
              {inv.invoice_number} - {formatCurrency(inv.total_amount)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit">Cancelar Provisión</Button>
    </form>
  </DialogContent>
</Dialog>
```

🪝 Hooks:
```typescript
// src/hooks/useProvisions.ts
export const useProvisions = () => {
  const { selectedView } = useView();
  
  const provisions = useQuery({
    queryKey: ["provisions", selectedView?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provisions")
        .select("*")
        .eq("centro_code", selectedView.code)
        .order("provision_date", { ascending: false });
      if (error) throw error;
      return data as Provision[];
    },
  });

  const createProvision = useMutation({
    mutationFn: async (newProvision: Omit<Provision, "id" | "provision_number">) => {
      // Generate provision number
      const { count } = await supabase
        .from("provisions")
        .select("*", { count: "exact", head: true })
        .eq("centro_code", newProvision.centro_code)
        .eq("period_year", newProvision.period_year)
        .eq("period_month", newProvision.period_month);
      
      const provisionNumber = `PROV-${newProvision.period_year}-${String(newProvision.period_month).padStart(2, "0")}-${String((count || 0) + 1).padStart(4, "0")}`;
      
      const { data, error } = await supabase
        .from("provisions")
        .insert([{ ...newProvision, provision_number: provisionNumber }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  });

  return { provisions: provisions.data || [], createProvision: createProvision.mutateAsync };
};

// src/hooks/useProvisionPosting.ts
export const useProvisionPosting = () => {
  const postProvision = useMutation({
    mutationFn: async ({ provisionId }: { provisionId: string }) => {
      const { data, error } = await supabase.functions.invoke("post-provision-entry", {
        body: { provisionId },
      });
      if (error) throw error;
      return data;
    },
  });

  const cancelProvision = useMutation({
    mutationFn: async ({ provisionId, reason, invoiceId }: { provisionId: string; reason: string; invoiceId?: string }) => {
      const { data, error } = await supabase.functions.invoke("cancel-provision-entry", {
        body: { provisionId, reason, invoiceId },
      });
      if (error) throw error;
      return data;
    },
  });

  return { postProvision: postProvision.mutateAsync, cancelProvision: cancelProvision.mutateAsync };
};
```

📦 Edge Functions:
```typescript
// supabase/functions/post-provision-entry/index.ts
Deno.serve(async (req) => {
  const { provisionId } = await req.json();
  
  // 1. Fetch provision
  const { data: provision } = await supabase.from("provisions").select("*").eq("id", provisionId).single();
  
  // 2. Get next entry number
  const { data: lastEntry } = await supabase.rpc("get_next_entry_number", { p_centro_code: provision.centro_code });
  
  // 3. Create accounting entry
  const { data: accountingEntry } = await supabase.from("accounting_entries").insert({
    centro_code: provision.centro_code,
    entry_number: lastEntry.next_number,
    entry_date: provision.provision_date,
    description: `Provisión ${provision.description} - ${provision.supplier_name}`,
    status: 'posted'
  }).select().single();
  
  // 4. Create transactions (DEBE gasto / HABER provisión)
  await supabase.from("accounting_transactions").insert([
    { entry_id: accountingEntry.id, account_code: provision.expense_account, movement_type: 'debit', amount: provision.amount, line_number: 1 },
    { entry_id: accountingEntry.id, account_code: provision.provision_account, movement_type: 'credit', amount: provision.amount, line_number: 2 }
  ]);
  
  // 5. Update provision
  await supabase.from("provisions").update({ status: 'active', accounting_entry_id: accountingEntry.id }).eq("id", provisionId);
  
  return new Response(JSON.stringify({ entry_id: accountingEntry.id }));
});

// supabase/functions/cancel-provision-entry/index.ts
Deno.serve(async (req) => {
  const { provisionId, reason, invoiceId } = await req.json();
  
  // 1. Fetch provision
  const { data: provision } = await supabase.from("provisions").select("*").eq("id", provisionId).single();
  
  // 2. Get next entry number
  const { data: lastEntry } = await supabase.rpc("get_next_entry_number", { p_centro_code: provision.centro_code });
  
  // 3. Create reversal entry (asiento inverso)
  const { data: reversalEntry } = await supabase.from("accounting_entries").insert({
    centro_code: provision.centro_code,
    entry_number: lastEntry.next_number,
    entry_date: new Date().toISOString().split('T')[0],
    description: `Cancelación provisión ${provision.provision_number} - ${reason}`,
    status: 'posted'
  }).select().single();
  
  // 4. Create reverse transactions (DEBE provisión / HABER gasto)
  await supabase.from("accounting_transactions").insert([
    { entry_id: reversalEntry.id, account_code: provision.provision_account, movement_type: 'debit', amount: provision.amount, line_number: 1 },
    { entry_id: reversalEntry.id, account_code: provision.expense_account, movement_type: 'credit', amount: provision.amount, line_number: 2 }
  ]);
  
  // 5. Update provision
  await supabase.from("provisions").update({
    status: invoiceId ? 'invoiced' : 'cancelled',
    reversal_entry_id: reversalEntry.id,
    invoice_id: invoiceId,
    cancelled_reason: reason,
    cancelled_at: new Date().toISOString(),
    cancelled_by: (await supabase.auth.getUser()).data.user?.id
  }).eq("id", provisionId);
  
  return new Response(JSON.stringify({ reversal_entry_id: reversalEntry.id }));
});
```

✅ Criterios de Aceptación (DoD):
- [ ] Usuario puede crear provisión con datos manuales
- [ ] Usuario puede crear provisión desde plantilla
- [ ] Sistema genera número provisión único PROV-YYYY-MM-NNNN
- [ ] Usuario contabiliza provisión → genera asiento correcto
- [ ] Usuario puede cancelar provisión con motivo obligatorio
- [ ] Usuario puede vincular provisión a factura recibida
- [ ] Sistema genera asiento de reversión automático
- [ ] Métricas visibles: total, draft, activas, importe activo
- [ ] Filtros por estado (draft/active/invoiced/cancelled)
- [ ] Gestor de plantillas: crear, editar, eliminar
- [ ] Export a Excel de provisiones
- [ ] Alertas si provisiones activas al cerrar periodo
- [ ] Responsive y accesible AA
```

---

## 3️⃣ MÓDULO: Asiento de Existencias (Inventory Closure)

```
Actúa como arquitecto de software especializado en contabilidad española PGC.

🧩 Módulo: Cierre de Existencias (Regularización de Inventario)
🎯 Objetivo: Ajustar existencias finales según inventario físico y generar asientos de regularización (PGC Grupo 3)

📘 Flujo:
1. Usuario realiza recuento físico de inventario al cierre del periodo
2. Introduce valores: Stock inicial, Compras, Stock final
3. Sistema calcula variación de existencias: `Variación = (Stock inicial + Compras) - Stock final`
4. Usuario contabiliza cierre:
   - **Si variación > 0:** DEBE 610000 (variación existencias) / HABER 300000 (existencias)
   - **Si variación < 0:** DEBE 300000 (existencias) / HABER 610000 (variación existencias)
5. Sistema guarda cierre en `inventory_closures` con detalle por producto
6. Usuario puede consultar histórico de cierres y reabrir si hay error

🧱 Estructura DB:
```sql
CREATE TABLE inventory_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL REFERENCES centres(codigo),
  closure_number TEXT NOT NULL UNIQUE, -- INV-2025-01-0001
  closure_date DATE NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  closure_type TEXT CHECK (closure_type IN ('global', 'detailed')), -- global o por productos
  opening_stock NUMERIC(12,2) NOT NULL DEFAULT 0, -- existencias iniciales
  purchases NUMERIC(12,2) NOT NULL DEFAULT 0, -- compras del periodo
  closing_stock NUMERIC(12,2) NOT NULL, -- existencias finales (recuento físico)
  variation NUMERIC(12,2) GENERATED ALWAYS AS (opening_stock + purchases - closing_stock) STORED,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reopened')),
  accounting_entry_id UUID REFERENCES accounting_entries(id),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  UNIQUE(centro_code, period_year, period_month, closure_type)
);

-- Detalle por producto (opcional)
CREATE TABLE inventory_closure_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_id UUID NOT NULL REFERENCES inventory_closures(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  account_code TEXT NOT NULL, -- subcuenta específica 30X
  opening_units NUMERIC(10,2) NOT NULL DEFAULT 0,
  opening_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  purchases_units NUMERIC(10,2) NOT NULL DEFAULT 0,
  purchases_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_units NUMERIC(10,2) NOT NULL,
  closing_value NUMERIC(12,2) NOT NULL,
  variation_value NUMERIC(12,2) GENERATED ALWAYS AS (opening_value + purchases_value - closing_value) STORED,
  line_number INTEGER NOT NULL
);

CREATE INDEX idx_inventory_closures_centro ON inventory_closures(centro_code, closure_date);
CREATE INDEX idx_closure_lines_closure ON inventory_closure_lines(closure_id);
```

🧠 Lógica de Negocio:
- **Cálculo variación:** `Existencias iniciales + Compras - Existencias finales`
- **Asientos contables:**
  - Variación positiva (consumo): DEBE 610000 / HABER 300000
  - Variación negativa (incremento): DEBE 300000 / HABER 610000
- **Cierre detallado:** Múltiples líneas con subcuentas 300, 301, 302 (materias primas, auxiliares, combustibles)
- **Reapertura:** Permite editar cierre posted si periodo no está cerrado fiscalmente
- **Idempotencia:** Solo un cierre por periodo y tipo (global/detailed)
- **Validación:** `closing_stock` no puede ser negativo

🪄 UI Componentes React:
```typescript
// 1. Formulario de cierre
<InventoryClosureForm 
  onSubmit={handleCreate}
  previousClosure={lastClosure} // auto-fill opening_stock
/>

// 2. Tabla de detalles (modo detailed)
<InventoryClosureLines 
  lines={closureLines}
  onAddLine={addLine}
  onUpdateLine={updateLine}
  onDeleteLine={deleteLine}
/>

// 3. Resumen visual
<Card>
  <CardHeader>
    <CardTitle>Resumen de Variación</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex justify-between">
      <span>Existencias Iniciales:</span>
      <span className="font-semibold">{formatCurrency(openingStock)}</span>
    </div>
    <div className="flex justify-between">
      <span>+ Compras del Periodo:</span>
      <span className="font-semibold">{formatCurrency(purchases)}</span>
    </div>
    <Separator />
    <div className="flex justify-between">
      <span>- Existencias Finales:</span>
      <span className="font-semibold">{formatCurrency(closingStock)}</span>
    </div>
    <Separator className="border-2" />
    <div className="flex justify-between text-lg">
      <span className="font-bold">Variación de Existencias:</span>
      <span className={cn(
        "font-bold",
        variation > 0 ? "text-destructive" : "text-success"
      )}>
        {formatCurrency(Math.abs(variation))} {variation > 0 ? "(Consumo)" : "(Incremento)"}
      </span>
    </div>
  </CardContent>
</Card>

// 4. Histórico de cierres
<ClosuresHistory 
  closures={historicalClosures}
  onView={(id) => setSelectedClosure(id)}
  onReopen={(id) => handleReopen(id)}
/>

// 5. Métricas anuales
<div className="grid gap-4 md:grid-cols-3">
  <MetricCard title="Cierres Realizados" value={totalClosures} />
  <MetricCard title="Variación Acumulada" value={formatCurrency(totalVariation)} />
  <MetricCard title="Último Cierre" value={format(lastClosureDate, "dd/MM/yyyy")} />
</div>
```

🪝 Hooks:
```typescript
// src/hooks/useInventoryClosures.ts
export const useInventoryClosures = (year?: number) => {
  const { selectedView } = useView();
  
  const closures = useQuery({
    queryKey: ["inventory-closures", selectedView?.id, year],
    queryFn: async () => {
      let query = supabase
        .from("inventory_closures")
        .select("*")
        .eq("centro_code", selectedView.code);
      
      if (year) query = query.eq("period_year", year);
      
      const { data, error } = await query.order("closure_date", { ascending: false });
      if (error) throw error;
      return data as InventoryClosure[];
    },
  });

  const createClosure = useMutation({
    mutationFn: async (newClosure: Omit<InventoryClosure, "id" | "closure_number">) => {
      // Generate closure number
      const { count } = await supabase
        .from("inventory_closures")
        .select("*", { count: "exact", head: true })
        .eq("centro_code", newClosure.centro_code);
      
      const closureNumber = `INV-${newClosure.period_year}-${String(newClosure.period_month).padStart(2, "0")}-${String((count || 0) + 1).padStart(4, "0")}`;
      
      const { data, error } = await supabase
        .from("inventory_closures")
        .insert([{ ...newClosure, closure_number: closureNumber }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  });

  const postClosure = useMutation({
    mutationFn: async ({ closureId }: { closureId: string }) => {
      const { data, error } = await supabase.functions.invoke("post-inventory-closure", {
        body: { closureId },
      });
      if (error) throw error;
      return data;
    },
  });

  return { 
    closures: closures.data || [], 
    createClosure: createClosure.mutateAsync,
    postClosure: postClosure.mutateAsync
  };
};
```

📦 Edge Function:
```typescript
// supabase/functions/post-inventory-closure/index.ts
Deno.serve(async (req) => {
  const { closureId } = await req.json();
  
  // 1. Fetch closure y lines
  const { data: closure } = await supabase.from("inventory_closures").select("*").eq("id", closureId).single();
  const { data: lines } = await supabase.from("inventory_closure_lines").select("*").eq("closure_id", closureId).order("line_number");
  
  // 2. Get next entry number
  const { data: lastEntry } = await supabase.rpc("get_next_entry_number", { p_centro_code: closure.centro_code });
  
  // 3. Create accounting entry
  const { data: accountingEntry } = await supabase.from("accounting_entries").insert({
    centro_code: closure.centro_code,
    entry_number: lastEntry.next_number,
    entry_date: closure.closure_date,
    description: `Regularización existencias ${closure.period_month}/${closure.period_year}`,
    status: 'posted'
  }).select().single();
  
  // 4. Create transactions
  const transactions = [];
  
  if (closure.closure_type === 'global') {
    // Cierre global
    if (closure.variation > 0) {
      // Consumo: DEBE 610000 / HABER 300000
      transactions.push(
        { entry_id: accountingEntry.id, account_code: '6100000', movement_type: 'debit', amount: closure.variation, line_number: 1 },
        { entry_id: accountingEntry.id, account_code: '3000000', movement_type: 'credit', amount: closure.variation, line_number: 2 }
      );
    } else {
      // Incremento: DEBE 300000 / HABER 610000
      transactions.push(
        { entry_id: accountingEntry.id, account_code: '3000000', movement_type: 'debit', amount: Math.abs(closure.variation), line_number: 1 },
        { entry_id: accountingEntry.id, account_code: '6100000', movement_type: 'credit', amount: Math.abs(closure.variation), line_number: 2 }
      );
    }
  } else {
    // Cierre detallado (por productos)
    let lineNumber = 1;
    for (const line of lines) {
      if (line.variation_value > 0) {
        transactions.push(
          { entry_id: accountingEntry.id, account_code: '6100000', movement_type: 'debit', amount: line.variation_value, line_number: lineNumber++ },
          { entry_id: accountingEntry.id, account_code: line.account_code, movement_type: 'credit', amount: line.variation_value, line_number: lineNumber++ }
        );
      } else if (line.variation_value < 0) {
        transactions.push(
          { entry_id: accountingEntry.id, account_code: line.account_code, movement_type: 'debit', amount: Math.abs(line.variation_value), line_number: lineNumber++ },
          { entry_id: accountingEntry.id, account_code: '6100000', movement_type: 'credit', amount: Math.abs(line.variation_value), line_number: lineNumber++ }
        );
      }
    }
  }
  
  await supabase.from("accounting_transactions").insert(transactions);
  
  // 5. Update closure
  await supabase.from("inventory_closures").update({ 
    status: 'posted', 
    accounting_entry_id: accountingEntry.id,
    posted_at: new Date().toISOString(),
    posted_by: (await supabase.auth.getUser()).data.user?.id
  }).eq("id", closureId);
  
  return new Response(JSON.stringify({ entry_id: accountingEntry.id, entry_number: accountingEntry.entry_number }));
});
```

✅ Criterios de Aceptación (DoD):
- [ ] Usuario crea cierre global o detallado por productos
- [ ] Sistema calcula variación automáticamente
- [ ] Usuario puede ver pre-visualización del asiento antes de contabilizar
- [ ] Sistema genera asiento correcto según signo de variación
- [ ] Cierre detallado permite múltiples líneas con subcuentas
- [ ] Usuario puede reabrir cierre si periodo no está cerrado
- [ ] Histórico de cierres visible con filtros por año
- [ ] Métricas anuales: cierres realizados, variación acumulada
- [ ] Export a Excel de cierres y detalles
- [ ] Validación: no permite duplicar cierre para mismo periodo
- [ ] Responsive y accesible AA
```

---

## 4️⃣ MÓDULO: Activos Fijos y Amortizaciones

```
Actúa como arquitecto de software especializado en contabilidad española PGC.

🧩 Módulo: Gestión de Activos Fijos con Amortización Automática
🎯 Objetivo: Registro de inmovilizado (Grupo 2) con cálculo y contabilización automática de amortizaciones mensuales (PGC art. 39)

📘 Flujo:
1. Usuario registra activo fijo con datos de adquisición y método de amortización
2. Sistema genera código activo: AF-{centro}-{secuencial}
3. Sistema calcula tabla de amortización mensual durante vida útil
4. Usuario visualiza calendario de amortizaciones futuras
5. Mensualmente, usuario ejecuta "Amortización masiva" para periodo
6. Sistema genera asiento: DEBE 681000 (amortización) / HABER 281000 (amortización acumulada)
7. Usuario puede dar de baja activo con asiento de venta/desguace

🧱 Estructura DB:
```sql
CREATE TABLE fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code TEXT NOT NULL REFERENCES centres(codigo),
  asset_code TEXT NOT NULL UNIQUE, -- AF-001-0001
  description TEXT NOT NULL,
  account_code TEXT NOT NULL, -- 2XX (inmovilizado)
  depreciation_account TEXT NOT NULL, -- 28XX (amortización acumulada)
  expense_account TEXT NOT NULL DEFAULT '6810000', -- 681 (amortización inmovilizado material)
  acquisition_date DATE NOT NULL,
  acquisition_value NUMERIC(12,2) NOT NULL CHECK (acquisition_value > 0),
  residual_value NUMERIC(12,2) DEFAULT 0 CHECK (residual_value >= 0),
  useful_life_years INTEGER NOT NULL CHECK (useful_life_years > 0),
  useful_life_months INTEGER GENERATED ALWAYS AS (useful_life_years * 12) STORED,
  depreciation_method TEXT DEFAULT 'linear' CHECK (depreciation_method IN ('linear', 'declining', 'units')),
  depreciation_percentage NUMERIC(5,2), -- opcional, para declining balance
  accumulated_depreciation NUMERIC(12,2) DEFAULT 0,
  current_value NUMERIC(12,2) GENERATED ALWAYS AS (acquisition_value - accumulated_depreciation) STORED,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'fully_depreciated', 'disposed')),
  disposal_date DATE,
  disposal_value NUMERIC(12,2),
  disposal_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de amortizaciones calculadas
CREATE TABLE asset_depreciations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  depreciation_amount NUMERIC(12,2) NOT NULL,
  accumulated_depreciation NUMERIC(12,2) NOT NULL,
  book_value NUMERIC(12,2) NOT NULL, -- VNC (Valor Neto Contable)
  accounting_entry_id UUID REFERENCES accounting_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(asset_id, period_year, period_month)
);

CREATE INDEX idx_fixed_assets_centro ON fixed_assets(centro_code, status);
CREATE INDEX idx_asset_depreciations_pending ON asset_depreciations(asset_id, period_year, period_month) WHERE accounting_entry_id IS NULL;
```

🧠 Lógica de Negocio:
- **Métodos de amortización:**
  - Lineal: `(valor adquisición - valor residual) / vida útil en meses`
  - Degresivo: `VNC * (% amortización / 12)` cada mes
  - Por unidades: No implementado (requiere contador uso)
- **Tabla de amortización:** Se genera al crear activo hasta final de vida útil
- **Amortización mensual:** Usuario lanza proceso batch para todos los activos activos del periodo
- **Baja de activo:** Genera asiento de venta con resultado (beneficio/pérdida)
- **Reglas contables:**
  - Amortización: DEBE 681000 / HABER 281000
  - Baja: DEBE 281000 (amort. acumulada) + DEBE/HABER resultado / HABER 2XX (activo)
- **Status automático:** Cuando `accumulated_depreciation >= acquisition_value - residual_value` → `fully_depreciated`

🪄 UI Componentes React:
```typescript
// 1. Formulario de registro
<AssetForm 
  onSubmit={handleCreate}
  accounts={accountsList}
/>

// 2. Lista de activos
<AssetsList 
  assets={assets}
  onView={(id) => setSelectedAsset(id)}
  onEdit={(id) => setEditAsset(id)}
  onDispose={(id) => setDisposeAsset(id)}
/>

// 3. Calendario de amortizaciones
<DepreciationSchedule 
  asset={selectedAsset}
  schedule={depreciationSchedule}
  onExport={exportToExcel}
/>

// 4. Gráficos de evolución
<DepreciationChart 
  schedule={depreciationSchedule}
  asset={selectedAsset}
/>

// 5. Proceso masivo mensual
<BulkDepreciationCalc 
  year={selectedYear}
  month={selectedMonth}
  onCalculate={handleCalculate}
  onPost={handlePostAll}
/>

// 6. Métricas dashboard
<div className="grid gap-4 md:grid-cols-4">
  <MetricCard title="Activos Activos" value={activeAssets} />
  <MetricCard title="Valor Adquisición" value={formatCurrency(totalAcquisition)} />
  <MetricCard title="Amortización Acumulada" value={formatCurrency(totalDepreciation)} />
  <MetricCard title="VNC Total" value={formatCurrency(totalBookValue)} />
</div>

// 7. Libro de bienes (report)
<AssetsRegister 
  year={selectedYear}
  assets={assets}
  onExport={exportRegister}
/>
```

🪝 Hooks:
```typescript
// src/hooks/useFixedAssets.ts
export const useFixedAssets = (status?: string) => {
  const { selectedView } = useView();
  
  const assets = useQuery({
    queryKey: ["fixed-assets", selectedView?.id, status],
    queryFn: async () => {
      let query = supabase
        .from("fixed_assets")
        .select("*")
        .eq("centro_code", selectedView.code);
      
      if (status) query = query.eq("status", status);
      
      const { data, error } = await query.order("acquisition_date", { ascending: false });
      if (error) throw error;
      return data as FixedAsset[];
    },
  });

  const createAsset = useMutation({
    mutationFn: async (newAsset: Omit<FixedAsset, "id" | "asset_code">) => {
      // Generate asset code
      const { count } = await supabase
        .from("fixed_assets")
        .select("*", { count: "exact", head: true })
        .eq("centro_code", newAsset.centro_code);
      
      const assetCode = `AF-${newAsset.centro_code}-${String((count || 0) + 1).padStart(4, "0")}`;
      
      const { data, error } = await supabase
        .from("fixed_assets")
        .insert([{ ...newAsset, asset_code: assetCode }])
        .select()
        .single();
      if (error) throw error;
      
      // Generate depreciation schedule
      await supabase.functions.invoke("generate-depreciation-schedule", {
        body: { assetId: data.id },
      });
      
      return data;
    },
  });

  return { assets: assets.data || [], createAsset: createAsset.mutateAsync };
};

// src/hooks/useDepreciationSchedule.ts
export const useDepreciationSchedule = (assetId?: string) => {
  return useQuery({
    queryKey: ["depreciation-schedule", assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_depreciations")
        .select("*")
        .eq("asset_id", assetId)
        .order("period_year", "period_month");
      if (error) throw error;
      return data as AssetDepreciation[];
    },
    enabled: !!assetId,
  });
};

// src/hooks/useBulkDepreciation.ts
export const useBulkDepreciation = () => {
  const calculateMutation = useMutation({
    mutationFn: async ({ year, month, centroCode }: { year: number; month: number; centroCode: string }) => {
      const { data, error } = await supabase.functions.invoke("calculate-monthly-depreciations", {
        body: { year, month, centroCode },
      });
      if (error) throw error;
      return data;
    },
  });

  const postMutation = useMutation({
    mutationFn: async ({ year, month, centroCode, userId }: { year: number; month: number; centroCode: string; userId: string }) => {
      const { data, error } = await supabase.functions.invoke("post-depreciation-entries", {
        body: { year, month, centroCode, userId },
      });
      if (error) throw error;
      return data;
    },
  });

  return { 
    calculateDepreciations: calculateMutation.mutateAsync,
    postDepreciations: postMutation.mutateAsync
  };
};
```

📦 Edge Functions:
```typescript
// supabase/functions/generate-depreciation-schedule/index.ts
Deno.serve(async (req) => {
  const { assetId } = await req.json();
  
  // 1. Fetch asset
  const { data: asset } = await supabase.from("fixed_assets").select("*").eq("id", assetId).single();
  
  // 2. Calculate monthly depreciation
  const amortizableValue = asset.acquisition_value - asset.residual_value;
  const monthlyDepreciation = amortizableValue / asset.useful_life_months;
  
  // 3. Generate schedule
  const schedule = [];
  let accumulatedDepreciation = 0;
  const startDate = new Date(asset.acquisition_date);
  
  for (let i = 0; i < asset.useful_life_months; i++) {
    const periodDate = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 1);
    accumulatedDepreciation += monthlyDepreciation;
    
    schedule.push({
      asset_id: assetId,
      period_year: periodDate.getFullYear(),
      period_month: periodDate.getMonth() + 1,
      depreciation_amount: monthlyDepreciation,
      accumulated_depreciation: accumulatedDepreciation,
      book_value: asset.acquisition_value - accumulatedDepreciation
    });
  }
  
  // 4. Insert schedule
  const { error } = await supabase.from("asset_depreciations").insert(schedule);
  if (error) throw error;
  
  return new Response(JSON.stringify({ entries_generated: schedule.length }));
});

// supabase/functions/post-depreciation-entries/index.ts
Deno.serve(async (req) => {
  const { year, month, centroCode, userId } = await req.json();
  
  // 1. Fetch pending depreciations for period
  const { data: depreciations } = await supabase
    .from("asset_depreciations")
    .select("*, asset:fixed_assets(*)")
    .eq("period_year", year)
    .eq("period_month", month)
    .is("accounting_entry_id", null)
    .eq("asset.centro_code", centroCode)
    .eq("asset.status", "active");
  
  // 2. Get next entry number
  const { data: lastEntry } = await supabase.rpc("get_next_entry_number", { p_centro_code: centroCode });
  
  // 3. Create accounting entry
  const totalAmount = depreciations.reduce((sum, d) => sum + d.depreciation_amount, 0);
  
  const { data: accountingEntry } = await supabase.from("accounting_entries").insert({
    centro_code: centroCode,
    entry_number: lastEntry.next_number,
    entry_date: `${year}-${String(month).padStart(2, "0")}-01`,
    description: `Amortización mensual activos ${month}/${year}`,
    status: 'posted',
    created_by: userId
  }).select().single();
  
  // 4. Create transactions (agrupadas por cuenta)
  const transactionsByAccount = {};
  depreciations.forEach(dep => {
    if (!transactionsByAccount[dep.asset.expense_account]) {
      transactionsByAccount[dep.asset.expense_account] = 0;
    }
    if (!transactionsByAccount[dep.asset.depreciation_account]) {
      transactionsByAccount[dep.asset.depreciation_account] = 0;
    }
    transactionsByAccount[dep.asset.expense_account] += dep.depreciation_amount;
    transactionsByAccount[dep.asset.depreciation_account] += dep.depreciation_amount;
  });
  
  let lineNumber = 1;
  const transactions = [];
  Object.entries(transactionsByAccount).forEach(([account, amount]) => {
    if (account.startsWith('681')) {
      transactions.push({ entry_id: accountingEntry.id, account_code: account, movement_type: 'debit', amount, line_number: lineNumber++ });
    } else {
      transactions.push({ entry_id: accountingEntry.id, account_code: account, movement_type: 'credit', amount, line_number: lineNumber++ });
    }
  });
  
  await supabase.from("accounting_transactions").insert(transactions);
  
  // 5. Update depreciations
  await supabase.from("asset_depreciations").update({ accounting_entry_id: accountingEntry.id }).in("id", depreciations.map(d => d.id));
  
  // 6. Update assets accumulated_depreciation
  for (const dep of depreciations) {
    await supabase.from("fixed_assets").update({
      accumulated_depreciation: dep.accumulated_depreciation
    }).eq("id", dep.asset_id);
  }
  
  return new Response(JSON.stringify({ 
    entry_id: accountingEntry.id, 
    assets_depreciated: depreciations.length 
  }));
});
```

✅ Criterios de Aceptación (DoD):
- [ ] Usuario registra activo fijo con datos completos
- [ ] Sistema genera código único AF-{centro}-{NNNN}
- [ ] Sistema calcula tabla de amortización mensual automáticamente
- [ ] Usuario visualiza calendario de amortizaciones con VNC
- [ ] Usuario ejecuta amortización masiva para mes/año
- [ ] Sistema genera asiento único agrupado por cuentas
- [ ] Sistema actualiza `accumulated_depreciation` de cada activo
- [ ] Usuario puede dar de baja activo con asiento de venta
- [ ] Libro de bienes exportable a Excel con formato oficial
- [ ] Gráficos de evolución VNC y amortización acumulada
- [ ] Filtros: activos/amortizados/dados de baja
- [ ] Alertas: activos próximos a amortización completa
- [ ] Responsive y accesible AA
- [ ] Métricas: total activos, valor adquisición, VNC total
```

---

## 📌 Notas Finales

- Todos los prompts siguen convenciones PGC oficial
- Edge functions implementan idempotencia
- Componentes React reutilizan design system del proyecto
- Hooks TanStack Query con invalidación correcta
- Métricas visibles en dashboards
- Export a Excel en todos los módulos
- Responsive AA accesibilidad
- Toasts informativos para feedback usuario
- Documentación inline en código generado
