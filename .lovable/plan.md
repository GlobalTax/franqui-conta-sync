

# Plan: Generador de Demo Completo con Todos los Datos

## Situacion actual

El generador actual solo crea la **estructura base**: franchisee, 2 sociedades, 4 centros, 1 año fiscal y 3 proveedores. No genera datos transaccionales.

## Que se añadira

Expandir `DemoDataGenerator` para crear un grupo demo completo con datos en **todos los módulos**:

### Datos a generar (por cada centro)

| Paso | Tabla(s) | Volumen |
|------|----------|---------|
| 1. Estructura base | franchisees, companies, centres, suppliers | 1 + 2 + 4 + 3 |
| 2. Plan contable | accounts | ~50 cuentas PGC esenciales por centro (60x, 62x, 64x, 70x, 57x, 47x, 40x) |
| 3. Años fiscales | fiscal_years | 2025 para los 4 centros |
| 4. Cuentas bancarias | bank_accounts | 1 por centro (4 total) |
| 5. Facturas recibidas | invoices_received | 3-5 por centro/mes x 3 meses = ~48 facturas |
| 6. Asientos contables | accounting_entries + accounting_transactions | 1 por factura + asientos de nómina = ~60 asientos |
| 7. Movimientos bancarios | bank_transactions | 1 por factura pagada + ingresos ventas = ~80 transacciones |
| 8. Facturas emitidas | invoices_issued | 2 por centro/mes = ~24 |

### Datos realistas McDonald's

- **Proveedores**: HAVI Logistics (materia prima), McCormick (condimentos), Coca-Cola European Partners, Ecolab (limpieza), Endesa (electricidad)
- **Cuentas PGC**: 6000000 (Compras mercaderías), 6210000 (Arrendamientos), 6260000 (Royalties), 6280000 (Marketing), 6400000 (Sueldos), 7000000 (Ventas)
- **Facturas**: importes realistas (HAVI ~8.000-15.000€/mes, Electricidad ~2.000-4.000€, Royalties 5% ventas)
- **Ventas**: ingresos 150.000-250.000€/mes por centro

## Cambios tecnicos

### 1. `src/lib/demo/demoDataGenerators.ts` (NUEVO)
Funciones puras que generan los arrays de datos:
- `generateDemoAccounts(centreCodes)` — plan contable PGC
- `generateDemoBankAccounts(centres)` — cuentas bancarias con IBAN ficticio
- `generateDemoInvoicesReceived(centres, suppliers, months)` — facturas proveedor
- `generateDemoAccountingEntries(invoices, centres)` — asientos por factura
- `generateDemoBankTransactions(bankAccounts, invoices, months)` — movimientos
- `generateDemoInvoicesIssued(centres, months)` — facturas emitidas (ventas)

### 2. `src/components/admin/DemoDataGenerator.tsx` (MODIFICAR)
Añadir los pasos 2-8 al flujo de generación, cada uno con su updateStep y manejo de errores. Añadir checkboxes para elegir qué datos generar.

### 3. `src/types/demo-config.ts` (MODIFICAR)
Ampliar `AdvancedDemoConfig` para que los toggles `generateBankData`, `generateInvoices`, `generateEntries` controlen qué pasos se ejecutan.

### 4. `src/components/admin/DemoDataConfigDialog.tsx` (MODIFICAR)
Añadir pestaña "Datos Avanzados" con switches para: plan contable, facturas recibidas, facturas emitidas, asientos, banco, y selector de meses (ene-mar 2025).

### 5. Limpieza (`cleanDemoData`)
Ampliar para borrar en orden inverso: bank_transactions → bank_accounts → accounting_transactions → accounting_entries → invoices_received → invoices_issued → accounts → (lo existente).

## Orden de insercion (respeta foreign keys)

```text
1. franchisee
2. companies (→ franchisee_id)
3. centres (→ company_id, franchisee_id)
4. fiscal_years (→ centro_code)
5. accounts (→ centro_code)
6. suppliers
7. bank_accounts (→ centro_code)
8. invoices_received (→ centro_code, supplier_id)
9. accounting_entries (→ centro_code, fiscal_year_id)
10. accounting_transactions (→ entry_id)
11. bank_transactions (→ bank_account_id)
12. invoices_issued (→ centro_code)
```

## Archivos

| Archivo | Accion |
|---------|--------|
| `src/lib/demo/demoDataGenerators.ts` | Crear |
| `src/components/admin/DemoDataGenerator.tsx` | Modificar |
| `src/types/demo-config.ts` | Modificar |
| `src/components/admin/DemoDataConfigDialog.tsx` | Modificar |

No se necesitan migraciones — todas las tablas ya existen.

