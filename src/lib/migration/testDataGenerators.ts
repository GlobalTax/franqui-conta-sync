/**
 * Test Data Generators for Historical Migration
 * 
 * Purpose: Generadores de datos sintéticos para testing del wizard de migración
 * 
 * Features:
 * - Genera CSVs válidos para cada tipo de importación
 * - Datos coherentes con PGC español
 * - Valores realistas para restaurantes McDonald's
 * - Opciones de volumen (small, medium, large)
 */

export type TestDataSize = 'small' | 'medium' | 'large';

interface GeneratorConfig {
  year: number;
  centroCode: string;
  size: TestDataSize;
}

// Cuentas PGC típicas de restauración
const TYPICAL_ACCOUNTS = {
  activo: ['2180000', '5720000', '4300000', '5700000'],
  pasivo: ['1000000', '4000000', '4100000', '5200000'],
  ingresos: ['7000000', '7050000', '7060000'],
  gastos: ['6000000', '6010000', '6020000', '6400000', '6410000', '6200000', '6210000'],
  iva_soportado: ['4720000', '4721000'],
  iva_repercutido: ['4770000', '4771000'],
};

/**
 * Genera CSV de saldos de apertura
 */
export function generateAperturaCSV(config: GeneratorConfig): string {
  const rows: string[] = ['cuenta,saldo_deudor,saldo_acreedor'];
  
  const sizes = { small: 10, medium: 30, large: 100 };
  const count = sizes[config.size];
  
  // Generar activos (saldo deudor)
  TYPICAL_ACCOUNTS.activo.forEach(cuenta => {
    const saldo = Math.floor(Math.random() * 50000) + 10000;
    rows.push(`${cuenta},${saldo.toFixed(2)},0`);
  });
  
  // Generar pasivos (saldo acreedor)
  TYPICAL_ACCOUNTS.pasivo.forEach(cuenta => {
    const saldo = Math.floor(Math.random() * 40000) + 5000;
    rows.push(`${cuenta},0,${saldo.toFixed(2)}`);
  });
  
  // Completar hasta el count deseado con cuentas aleatorias
  const remaining = count - (TYPICAL_ACCOUNTS.activo.length + TYPICAL_ACCOUNTS.pasivo.length);
  for (let i = 0; i < remaining; i++) {
    const isDeudor = Math.random() > 0.5;
    const cuenta = `${Math.floor(Math.random() * 7) + 1}${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;
    const saldo = Math.floor(Math.random() * 30000) + 1000;
    
    if (isDeudor) {
      rows.push(`${cuenta},${saldo.toFixed(2)},0`);
    } else {
      rows.push(`${cuenta},0,${saldo.toFixed(2)}`);
    }
  }
  
  return rows.join('\n');
}

/**
 * Genera CSV de libro diario
 */
export function generateDiarioCSV(config: GeneratorConfig): string {
  const rows: string[] = ['entry_date,description,account_code,debit,credit,line_description'];
  
  const sizes = { small: 20, medium: 100, large: 500 };
  const entryCount = sizes[config.size];
  
  const startDate = new Date(`${config.year}-01-01`);
  const endDate = new Date(`${config.year}-12-31`);
  
  for (let i = 0; i < entryCount; i++) {
    // Fecha aleatoria en el año
    const randomDate = new Date(
      startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
    );
    const dateStr = randomDate.toISOString().split('T')[0];
    
    // Tipo de asiento (compra, venta, gasto, etc)
    const entryTypes = [
      { desc: 'Compra mercaderías', debit: '6000000', credit: '4100000' },
      { desc: 'Venta mostrador', debit: '5720000', credit: '7000000' },
      { desc: 'Gasto suministros', debit: '6280000', credit: '5720000' },
      { desc: 'Nómina empleados', debit: '6400000', credit: '4650000' },
    ];
    
    const entry = entryTypes[Math.floor(Math.random() * entryTypes.length)];
    const amount = Math.floor(Math.random() * 5000) + 100;
    
    // Línea débito
    rows.push(`${dateStr},${entry.desc},${entry.debit},${amount.toFixed(2)},0,${entry.desc} - Debe`);
    // Línea crédito
    rows.push(`${dateStr},${entry.desc},${entry.credit},0,${amount.toFixed(2)},${entry.desc} - Haber`);
  }
  
  return rows.join('\n');
}

/**
 * Genera CSV de facturas emitidas
 */
export function generateIVAEmitidasCSV(config: GeneratorConfig): string {
  const rows: string[] = [
    'fecha_factura,numero_factura,nombre_cliente,cif_cliente,base_imponible,tipo_iva,cuota_iva,total_factura,descripcion'
  ];
  
  const sizes = { small: 15, medium: 50, large: 200 };
  const count = sizes[config.size];
  
  const clientes = [
    { nombre: 'Cliente A SL', cif: 'B12345678' },
    { nombre: 'Cliente B SA', cif: 'A87654321' },
    { nombre: 'Cliente C SLU', cif: 'B11223344' },
  ];
  
  for (let i = 0; i < count; i++) {
    const mes = Math.floor(Math.random() * 12) + 1;
    const dia = Math.floor(Math.random() * 28) + 1;
    const fecha = `${config.year}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    
    const numeroFactura = `F${config.year}${String(i + 1).padStart(4, '0')}`;
    const cliente = clientes[Math.floor(Math.random() * clientes.length)];
    
    const base = Math.floor(Math.random() * 3000) + 100;
    const tipoIva = Math.random() > 0.3 ? 21 : 10;
    const cuotaIva = base * (tipoIva / 100);
    const total = base + cuotaIva;
    
    rows.push(
      `${fecha},${numeroFactura},${cliente.nombre},${cliente.cif},${base.toFixed(2)},${tipoIva},${cuotaIva.toFixed(2)},${total.toFixed(2)},Venta productos`
    );
  }
  
  return rows.join('\n');
}

/**
 * Genera CSV de facturas recibidas
 */
export function generateIVARecibidasCSV(config: GeneratorConfig): string {
  const rows: string[] = [
    'fecha_factura,numero_factura,nombre_proveedor,cif_proveedor,base_imponible,tipo_iva,cuota_iva,total_factura,descripcion'
  ];
  
  const sizes = { small: 15, medium: 50, large: 200 };
  const count = sizes[config.size];
  
  const proveedores = [
    { nombre: 'Proveedor Alimentos SA', cif: 'A11111111' },
    { nombre: 'Distribuciones XYZ SL', cif: 'B22222222' },
    { nombre: 'Suministros McD SLU', cif: 'B33333333' },
  ];
  
  for (let i = 0; i < count; i++) {
    const mes = Math.floor(Math.random() * 12) + 1;
    const dia = Math.floor(Math.random() * 28) + 1;
    const fecha = `${config.year}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    
    const numeroFactura = `P${config.year}${String(i + 1).padStart(4, '0')}`;
    const proveedor = proveedores[Math.floor(Math.random() * proveedores.length)];
    
    const base = Math.floor(Math.random() * 5000) + 200;
    const tipoIva = Math.random() > 0.2 ? 21 : 10;
    const cuotaIva = base * (tipoIva / 100);
    const total = base + cuotaIva;
    
    rows.push(
      `${fecha},${numeroFactura},${proveedor.nombre},${proveedor.cif},${base.toFixed(2)},${tipoIva},${cuotaIva.toFixed(2)},${total.toFixed(2)},Compra mercaderías`
    );
  }
  
  return rows.join('\n');
}

/**
 * Genera archivo Norma 43 sintético
 */
export function generateNorma43File(config: GeneratorConfig): string {
  const lines: string[] = [];
  
  const sizes = { small: 10, medium: 30, large: 100 };
  const movementCount = sizes[config.size];
  
  // Registro cabecera de cuenta (11)
  const cuentaBancaria = '01490001501234567890';
  const fechaInicial = `${String(config.year).slice(2)}0101`;
  const fechaFinal = `${String(config.year).slice(2)}1231`;
  
  lines.push(
    `11${cuentaBancaria}${fechaInicial}${fechaFinal}0D0000000000000000EUR${' '.repeat(39)}`
  );
  
  // Registros de movimiento (22)
  let saldoAcumulado = 50000; // Saldo inicial
  
  for (let i = 0; i < movementCount; i++) {
    const mes = Math.floor(Math.random() * 12) + 1;
    const dia = Math.floor(Math.random() * 28) + 1;
    const fecha = `${String(config.year).slice(2)}${String(mes).padStart(2, '0')}${String(dia).padStart(2, '0')}`;
    
    const esIngreso = Math.random() > 0.4;
    const importe = Math.floor(Math.random() * 3000) + 100;
    const signo = esIngreso ? 'D' : 'H';
    
    if (esIngreso) {
      saldoAcumulado += importe;
    } else {
      saldoAcumulado -= importe;
    }
    
    const importeStr = String(importe).padStart(12, '0');
    const concepto = esIngreso ? 'INGRESO VENTAS' : 'PAGO PROVEEDOR';
    
    lines.push(
      `22000${fecha}${fecha}00000${signo}${importeStr}00000000${concepto.padEnd(40, ' ')}`
    );
  }
  
  // Registro final de cuenta (33)
  const numRegistros = String(movementCount + 2).padStart(5, '0');
  lines.push(
    `33${cuentaBancaria}${numRegistros}0000000000000000000000000000000000${' '.repeat(39)}`
  );
  
  // Registro fin de archivo (88)
  lines.push(`88999999${numRegistros}${' '.repeat(70)}`);
  
  return lines.join('\r\n');
}

/**
 * Download helper para generar archivo y descargarlo
 */
export function downloadTestFile(content: string, filename: string, type: 'csv' | 'txt' = 'csv') {
  const mimeType = type === 'csv' ? 'text/csv' : 'text/plain';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
