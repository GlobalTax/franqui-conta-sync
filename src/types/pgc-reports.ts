// ============================================================================
// TIPOS TYPESCRIPT PARA INFORMES PGC OFICIALES
// Balance de Situación, PyG, Sumas y Saldos con estructura jerárquica completa
// ============================================================================

// Opciones de nivel jerárquico PGC
export type NivelPGC = 1 | 2 | 3; // 1=Grupo, 2=Subgrupo, 3=Cuenta

// ============================================================================
// BALANCE DE SITUACIÓN (Balance Sheet)
// ============================================================================

export interface BalanceSheetItem {
  grupo: string;
  nombre_grupo: string;
  nivel: number;
  parent_code: string | null;
  balance: number;
}

export interface BalanceSheetData {
  items: BalanceSheetItem[];
  totals: {
    activo: number;
    pasivo: number;
    patrimonioNeto: number;
    total: number;
  };
}

// ============================================================================
// PyG PGC OFICIAL (Profit & Loss Statement)
// ============================================================================

export interface PyGPGCLine {
  cuenta: string;
  nombre: string;
  nivel: number;
  parent_code: string | null;
  debe: number;
  haber: number;
  saldo: number;
  porcentaje: number;
}

export interface PyGPGCData {
  items: PyGPGCLine[];
  totals: {
    totalIngresos: number;          // Grupo 7
    totalGastos: number;             // Grupo 6
    resultadoExplotacion: number;    // Resultado de explotación
    resultadoFinanciero: number;     // Resultado financiero (76x - 66x)
    resultadoAntesImpuestos: number; // BAI
    resultadoEjercicio: number;      // Resultado del ejercicio
  };
}

// ============================================================================
// SUMAS Y SALDOS (Trial Balance)
// ============================================================================

export interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  account_type: string;
  nivel: number;
  parent_code: string | null;
  debit_total: number;
  credit_total: number;
  balance: number;
}

// ============================================================================
// LIBRO MAYOR (General Ledger)
// ============================================================================

export interface LedgerLine {
  account_code: string;
  account_name: string;
  entry_date: string;
  entry_number: number;
  serie: string;
  description: string;
  document_ref: string | null;
  debit: number;
  credit: number;
  balance: number;
}
