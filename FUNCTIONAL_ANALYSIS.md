# 📊 ANÁLISIS FUNCIONAL - Sistema Contable Franquiciados McDonald's

## 🎯 VISIÓN GENERAL

Sistema contable-operativo donde cada **centro (restaurante)** es el núcleo de la actividad diaria, con cierres automáticos, consolidación financiera y cumplimiento normativo español.

---

## 📈 GAP ANALYSIS - Estado Actual vs. Requerido

### ✅ **IMPLEMENTADO (70%)**

#### 1. Estructura Base
- ✅ Franchisees → Companies → Centres
- ✅ Multi-empresa y multi-centro
- ✅ Roles y permisos por centro
- ❌ **FALTA:** Estructura de Grupo y Canales (drive-thru, delivery, kiosko)

#### 2. Contabilidad Core
- ✅ Plan contable (accounts)
- ✅ Asientos contables (accounting_entries + transactions)
- ✅ Balance y P&L
- ✅ Mayor, diario, balance de sumas y saldos
- ✅ Cierre de ejercicio fiscal
- ✅ Cierres de periodo

#### 3. Facturas
- ✅ Facturas recibidas (invoices_received)
- ✅ Facturas emitidas (invoices_issued)
- ✅ Líneas de factura con IVA
- ✅ Proveedores (suppliers)
- ❌ **FALTA:** OCR automático
- ❌ **FALTA:** Flujo de aprobación por importe
- ❌ **FALTA:** Estado "pendiente validación gerente"

#### 4. Tesorería
- ✅ Cuentas bancarias (bank_accounts)
- ✅ Transacciones bancarias (bank_transactions)
- ✅ Importación Norma 43
- ❌ **FALTA:** Conciliación bancaria automática con reglas
- ❌ **FALTA:** Arqueo de caja diario
- ❌ **FALTA:** Previsiones de tesorería

#### 5. IVA y Fiscalidad
- ✅ Libros IVA emitidas/recibidas
- ✅ Modelo 303 (generación automática)
- ❌ **FALTA:** Verifactu (hash + firma digital)
- ❌ **FALTA:** e-factura
- ❌ **FALTA:** Modelo 347, 390, 111, 190
- ❌ **FALTA:** Control de periodos fiscales (cerrado/abierto)

#### 6. Advanced Features
- ✅ Vencimientos (payment_terms)
- ✅ Remesas bancarias SEPA (bank_remittances)
- ✅ Inmovilizado (fixed_assets + depreciations)
- ✅ Centros de coste (cost_centers)
- ✅ Proyectos (projects)
- ✅ Dashboard contable con KPIs

#### 7. Integración Laboral
- ✅ Integración con Orquest (schedules, employees)
- ✅ Importación de turnos y horas
- ❌ **FALTA:** Cálculo de coste laboral real/hora
- ❌ **FALTA:** Asiento contable automático de nóminas
- ❌ **FALTA:** KPIs labor (CPLH, ventas/hora)

---

## ❌ **NO IMPLEMENTADO (30%) - CRÍTICO**

### 🔴 **PRIORIDAD MÁXIMA**

#### 1. **CIERRE DIARIO DE VENTAS** 🚨
**Núcleo del sistema. Sin esto, no hay operativa diaria.**

**Funcionalidad requerida:**
- Importar cierre del POS (automático o manual)
- Desglose automático de IVA (10% hostelería, 21% otros)
- Reparto de ventas por canal (in-store, drive-thru, delivery, kiosko)
- Asiento contable automático:
  - (430) Clientes - DEBE: Total ventas
  - (700) Ventas - HABER: Base imponible
  - (477) IVA repercutido - HABER: IVA
  - (570) Caja - Efectivo
  - (572) Bancos - TPV
  - (431) Comisiones 3PD - Delivery
- Control de arqueo: diferencias efectivo teórico vs. real
- Validación gerente → aprobación contabilidad
- Estado: borrador → validado_gerente → contabilizado → cerrado

**Tablas necesarias:**
```sql
CREATE TABLE daily_closures (
  id UUID PRIMARY KEY,
  centro_code TEXT NOT NULL,
  closure_date DATE NOT NULL,
  
  -- Ventas por canal
  sales_in_store NUMERIC DEFAULT 0,
  sales_drive_thru NUMERIC DEFAULT 0,
  sales_delivery NUMERIC DEFAULT 0,
  sales_kiosk NUMERIC DEFAULT 0,
  total_sales NUMERIC GENERATED ALWAYS AS (
    sales_in_store + sales_drive_thru + sales_delivery + sales_kiosk
  ) STORED,
  
  -- IVA
  tax_10_base NUMERIC DEFAULT 0,
  tax_10_amount NUMERIC DEFAULT 0,
  tax_21_base NUMERIC DEFAULT 0,
  tax_21_amount NUMERIC DEFAULT 0,
  total_tax NUMERIC DEFAULT 0,
  
  -- Formas de cobro
  cash_amount NUMERIC DEFAULT 0,
  card_amount NUMERIC DEFAULT 0,
  delivery_amount NUMERIC DEFAULT 0,
  
  -- Comisiones y royalties
  delivery_commission NUMERIC DEFAULT 0, -- Glovo, Uber Eats
  royalty_amount NUMERIC DEFAULT 0, -- McDonald's
  marketing_fee NUMERIC DEFAULT 0,
  
  -- Arqueo
  expected_cash NUMERIC DEFAULT 0,
  actual_cash NUMERIC DEFAULT 0,
  cash_difference NUMERIC GENERATED ALWAYS AS (actual_cash - expected_cash) STORED,
  
  -- Control
  status TEXT DEFAULT 'draft', -- draft, validated_manager, posted, closed
  validated_by UUID REFERENCES profiles(id),
  validated_at TIMESTAMPTZ,
  posted_by UUID REFERENCES profiles(id),
  posted_at TIMESTAMPTZ,
  accounting_entry_id UUID REFERENCES accounting_entries(id),
  
  -- Datos POS
  pos_data JSONB, -- Datos raw del cierre POS
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(centro_code, closure_date)
);
```

**Reportes:**
- "Informe de Cierre Diario" (PDF)
- "P&L Diario" (ventas – costes directos)
- "Arqueo Diario" (diferencias)

---

#### 2. **FLUJO DE APROBACIÓN DE FACTURAS** 🔶
**Control de gastos por centro con validación gerente/contabilidad.**

**Funcionalidad requerida:**
- OCR automático de facturas (integración con Mindee, Klippa o similar)
- Precontabilización automática:
  - Detectar proveedor → cuenta contable
  - Detectar concepto → centro de coste
  - Imputación automática al centro
- Flujo de validación:
  - < 500€ → validación automática
  - 500€ - 2.000€ → validación gerente
  - > 2.000€ → validación contabilidad + dirección
- Estados: pendiente → validado_gerente → validado_contabilidad → aprobado → contabilizado → pagado

**Tablas necesarias:**
```sql
CREATE TABLE invoice_approvals (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL,
  invoice_type TEXT NOT NULL, -- 'received' or 'issued'
  approver_user_id UUID REFERENCES profiles(id),
  approval_level TEXT NOT NULL, -- 'manager', 'accounting', 'director'
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  comments TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Añadir a invoices_received
ALTER TABLE invoices_received ADD COLUMN approval_status TEXT DEFAULT 'pending';
-- pending, approved_manager, approved_accounting, approved_director, rejected
ALTER TABLE invoices_received ADD COLUMN requires_approval_level TEXT;
-- none, manager, accounting, director
```

**Reglas configurables:**
```sql
CREATE TABLE approval_rules (
  id UUID PRIMARY KEY,
  centro_code TEXT,
  min_amount NUMERIC DEFAULT 0,
  max_amount NUMERIC,
  required_approver_role app_role NOT NULL,
  category TEXT, -- 'supplies', 'maintenance', 'marketing', etc.
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 3. **COSTE LABORAL CONTABLE** 🟡
**Integrar horas trabajadas → coste real → P&L.**

**Funcionalidad requerida:**
- Importar desde Orquest: horas trabajadas, empleado, fecha, centro
- Calcular coste/hora real (salario + SS + pluses)
- Generar asiento mensual de coste laboral:
  - (640) Sueldos y salarios - DEBE
  - (642) Seguridad Social - DEBE
  - (465) Remuneraciones pendientes de pago - HABER
  - (476) SS acreedora - HABER
- KPIs:
  - CPLH (Cost Per Labor Hour) = Coste total / Horas trabajadas
  - Ventas/hora = Ventas diarias / Horas trabajadas
  - % Coste laboral sobre ventas

**Tablas necesarias:**
```sql
CREATE TABLE labor_costs (
  id UUID PRIMARY KEY,
  centro_code TEXT NOT NULL,
  employee_id UUID REFERENCES employees(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Horas
  hours_worked NUMERIC DEFAULT 0,
  hours_overtime NUMERIC DEFAULT 0,
  
  -- Costes
  base_salary NUMERIC DEFAULT 0,
  overtime_cost NUMERIC DEFAULT 0,
  social_security NUMERIC DEFAULT 0,
  bonuses NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  
  -- KPIs
  cost_per_hour NUMERIC GENERATED ALWAYS AS (
    CASE WHEN hours_worked > 0 THEN total_cost / hours_worked ELSE 0 END
  ) STORED,
  
  accounting_entry_id UUID REFERENCES accounting_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 4. **CONCILIACIÓN BANCARIA AUTOMÁTICA** 🟢
**Emparejar movimientos bancarios con ventas, facturas y royalties.**

**Funcionalidad requerida:**
- Importar Norma 43 automáticamente
- Reglas de conciliación:
  1. **Cobro TPV** → Emparejar con ventas tarjeta del cierre diario
  2. **Comisiones 3PD** → Emparejar con facturas Glovo/UberEats
  3. **Royalties** → Emparejar con domiciliación McDonald's
  4. **Pagos proveedores** → Emparejar con facturas aprobadas
- Conciliación automática, manual y sugerida
- Estados: pendiente, conciliado, diferido, descuadrado

**Tablas necesarias:**
```sql
CREATE TABLE bank_reconciliation_rules (
  id UUID PRIMARY KEY,
  centro_code TEXT,
  rule_name TEXT NOT NULL,
  bank_account_id UUID REFERENCES bank_accounts(id),
  
  -- Condiciones
  transaction_type TEXT, -- 'debit', 'credit'
  description_pattern TEXT, -- Regex o keywords
  amount_min NUMERIC,
  amount_max NUMERIC,
  
  -- Acción
  auto_match_type TEXT, -- 'daily_closure', 'invoice', 'royalty', 'commission'
  suggested_account TEXT, -- Cuenta contable sugerida
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bank_reconciliations (
  id UUID PRIMARY KEY,
  bank_transaction_id UUID REFERENCES bank_transactions(id) UNIQUE,
  matched_type TEXT, -- 'daily_closure', 'invoice', 'entry', 'manual'
  matched_id UUID, -- ID del cierre, factura o asiento
  reconciliation_status TEXT DEFAULT 'pending', -- pending, matched, reviewed, confirmed
  confidence_score NUMERIC, -- 0-100, nivel de confianza del match automático
  reconciled_by UUID REFERENCES profiles(id),
  reconciled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

#### 5. **VERIFACTU + E-FACTURA** 🔵
**Cumplimiento normativo AEAT 2025.**

**Funcionalidad requerida:**
- Hash SHA-256 de cada factura emitida
- Firma digital (certificado electrónico)
- Registro inmediato en sistema de facturación
- Generación XML Facturae 3.2.2
- Envío a plataforma AEAT (FACe para B2G, opcional B2B)
- Control de integridad: alertas si falta hash o firma

**Tablas necesarias:**
```sql
-- Añadir a invoices_issued e invoices_received
ALTER TABLE invoices_issued ADD COLUMN verifactu_hash TEXT;
ALTER TABLE invoices_issued ADD COLUMN verifactu_signature TEXT;
ALTER TABLE invoices_issued ADD COLUMN verifactu_timestamp TIMESTAMPTZ;
ALTER TABLE invoices_issued ADD COLUMN facturae_xml TEXT; -- XML firmado
ALTER TABLE invoices_issued ADD COLUMN aeat_sent_at TIMESTAMPTZ;
ALTER TABLE invoices_issued ADD COLUMN aeat_status TEXT; -- pending, sent, accepted, rejected

-- Log de verificación
CREATE TABLE verifactu_logs (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL,
  invoice_type TEXT NOT NULL,
  action TEXT NOT NULL, -- 'hash_generated', 'signed', 'sent_aeat'
  status TEXT NOT NULL,
  hash TEXT,
  signature TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🗓️ ROADMAP PRIORIZADO

### **FASE 1 (CRÍTICA) - Sprint 1-2 semanas**
1. ✅ **Cierre Diario de Ventas**
   - Crear tablas `daily_closures`, `sales_channels`
   - UI: Formulario de cierre diario
   - UI: Validación gerente/contabilidad
   - Asiento contable automático
   - Reporte "Cierre Diario" PDF

2. ✅ **Arqueo de Caja**
   - Control efectivo esperado vs. real
   - Alertas si diferencia > 2%

### **FASE 2 (ALTA) - Sprint 2-3 semanas**
3. ✅ **Flujo de Aprobación Facturas**
   - OCR facturas (integración API)
   - Workflow de validación
   - Estados y niveles de aprobación

4. ✅ **Conciliación Bancaria Básica**
   - Reglas de conciliación
   - Match automático TPV ↔ ventas
   - UI conciliador

### **FASE 3 (MEDIA) - Sprint 3-4 semanas**
5. ✅ **Coste Laboral Contable**
   - Importar horas → coste/hora
   - Asiento mensual nóminas
   - KPIs labor (CPLH)

6. ✅ **Canales de Venta**
   - Estructura: Centro → Canal
   - Desglose ventas por canal
   - Reporting por canal

### **FASE 4 (NORMATIVA) - Sprint 4-5 semanas**
7. ✅ **Verifactu**
   - Hash SHA-256 + firma digital
   - Log de integridad
   - Alertas cumplimiento

8. ✅ **e-Factura / Facturae**
   - Generación XML 3.2.2
   - Envío AEAT (opcional)

### **FASE 5 (REPORTING) - Sprint 5-6 semanas**
9. ✅ **Dashboard Diario**
   - Ventas, labor, food cost, P&L diario
   - Comparador entre centros
   - Alertas automáticas

10. ✅ **Consolidación Multi-centro**
    - P&L consolidado
    - Balance consolidado
    - Comparativas y rankings

---

## 📋 PRÓXIMOS PASOS INMEDIATOS

### 1️⃣ **Implementar Cierre Diario** (AHORA)
- Crear migración para `daily_closures`
- Crear hook `useDailyClosures`
- Crear componentes:
  - `DailyClosureForm` (captura ventas + arqueo)
  - `DailyClosureValidation` (workflow gerente/contabilidad)
  - `DailyClosureReport` (PDF)
- Función SQL: `generate_daily_closure_entry()` → asiento automático

### 2️⃣ **Añadir Estructura de Canales**
- Migración: `sales_channels` (in-store, drive-thru, delivery, kiosk)
- Relación: `daily_closures` → líneas por canal

### 3️⃣ **Workflow de Aprobación**
- Migración: `invoice_approvals`, `approval_rules`
- UI: Bandeja de tareas pendientes
- Notificaciones push/email

---

## 🎨 UI/UX CRÍTICA

### Pantalla Principal (Home)
```
┌─────────────────────────────────────────────────────┐
│  [Selector Centro: 001 - Madrid Gran Vía ▾]        │
├─────────────────────────────────────────────────────┤
│  📊 RESUMEN HOY                                     │
│  ┌──────────┬──────────┬──────────┬──────────┐    │
│  │ Ventas   │ Arqueo   │ Labor    │ Margen   │    │
│  │ 8.450€   │ ✅ OK    │ 18.5%    │ 62.3%    │    │
│  └──────────┴──────────┴──────────┴──────────┘    │
│                                                     │
│  ⚠️ TAREAS PENDIENTES (3)                          │
│  • Validar cierre 25/11/2024                       │
│  • Aprobar factura Gas Natural 234€                │
│  • Conciliar movimiento bancario -1.250€           │
└─────────────────────────────────────────────────────┘
```

### Cierre Diario
```
┌─────────────────────────────────────────────────────┐
│  CIERRE DIARIO - 25/11/2024 - Centro 001           │
├─────────────────────────────────────────────────────┤
│  VENTAS POR CANAL                                   │
│  • Mostrador:        4.200€  (49.7%)               │
│  • Drive-Thru:       2.800€  (33.1%)               │
│  • Delivery:         1.250€  (14.8%)               │
│  • Kiosko:             200€  (2.4%)                 │
│  ───────────────────────────────────                │
│  TOTAL:              8.450€                         │
│                                                     │
│  ARQUEO DE CAJA                                     │
│  Efectivo esperado:    520€                         │
│  Efectivo real:        518€                         │
│  Diferencia:            -2€  ⚠️                     │
│                                                     │
│  [🔒 Validar y Cerrar]  [💾 Guardar Borrador]      │
└─────────────────────────────────────────────────────┘
```

---

## 🏁 CONCLUSIÓN

Tenemos una **base sólida (70%)** pero faltan **componentes operativos críticos (30%)** para que el sistema sea funcional día a día.

**Prioridad absoluta:** 
1. **Cierre Diario** (sin esto, no hay operativa)
2. **Workflow facturas** (control de gastos)
3. **Conciliación bancaria** (tesorería real)

¿Empezamos con la **implementación del Cierre Diario**?
