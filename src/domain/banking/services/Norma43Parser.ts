// ============================================================================
// SERVICIO DE DOMINIO - Norma43Parser
// Parser puro de archivos Norma 43 (formato bancario español)
// Responsabilidad: Parsear y validar formato Norma 43 sin efectos secundarios
// ============================================================================

export interface Norma43Header {
  bankCode: string;
  officeCode: string;
  accountNumber: string;
  startDate: string;
  endDate: string;
  initialBalance: number;
  finalBalance: number;
  currency: string;
}

export interface Norma43Transaction {
  officeCode: string;
  accountNumber: string;
  transactionDate: string;
  valueDate: string;
  commonConcept: string;
  ownConcept: string;
  amount: number;
  documentNumber: string;
  reference1: string;
  reference2: string;
  description: string;
}

export interface Norma43ParseResult {
  header: Norma43Header;
  transactions: Norma43Transaction[];
  summary: {
    totalDebits: number;
    totalCredits: number;
    transactionsCount: number;
  };
  errors: string[];
}

/**
 * Servicio de parsing para archivos Norma 43 (formato bancario español)
 * Responsabilidad: Parsear y validar formato Norma 43 sin efectos secundarios
 */
export class Norma43Parser {
  /**
   * Parsea un archivo Norma 43 completo
   */
  static parse(fileContent: string): Norma43ParseResult {
    const lines = fileContent.split('\n').filter(line => line.trim());
    const errors: string[] = [];
    let header: Norma43Header | null = null;
    const transactions: Norma43Transaction[] = [];
    let lastTransaction: Norma43Transaction | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      try {
        // Registro tipo 11: Cabecera de cuenta
        if (line.startsWith('11')) {
          header = this.parseHeader(line);
        }
        
        // Registro tipo 22: Movimiento principal
        else if (line.startsWith('22')) {
          const transaction = this.parseTransaction(line);
          transactions.push(transaction);
          lastTransaction = transaction;
        }
        
        // Registro tipo 23: Conceptos adicionales
        else if (line.startsWith('23')) {
          if (lastTransaction) {
            const description = this.parseAdditionalConcept(line);
            lastTransaction.description = description;
          } else {
            errors.push(`Línea ${lineNumber}: Registro tipo 23 sin transacción previa`);
          }
        }
        
        // Registro tipo 88: Final de cuenta
        else if (line.startsWith('88')) {
          // Validar totales
          const footer = this.parseFooter(line);
          if (footer.transactionsCount !== transactions.length) {
            errors.push(
              `Total de movimientos no coincide: esperado ${footer.transactionsCount}, encontrado ${transactions.length}`
            );
          }
        }
      } catch (error) {
        errors.push(`Línea ${lineNumber}: ${(error as Error).message}`);
      }
    }

    if (!header) {
      errors.push('No se encontró registro de cabecera (tipo 11)');
    }

    // Calcular resumen
    const summary = this.calculateSummary(transactions);

    return {
      header: header || this.getEmptyHeader(),
      transactions,
      summary,
      errors,
    };
  }

  /**
   * Parsea el registro tipo 11 (cabecera)
   */
  private static parseHeader(line: string): Norma43Header {
    if (line.length < 80) {
      throw new Error('Registro de cabecera incompleto');
    }

    return {
      bankCode: line.substring(2, 6),
      officeCode: line.substring(6, 10),
      accountNumber: line.substring(10, 20),
      startDate: this.parseDate(line.substring(20, 26)),
      endDate: this.parseDate(line.substring(26, 32)),
      initialBalance: this.parseAmount(line.substring(59, 73), line.substring(73, 74)),
      finalBalance: this.parseAmount(line.substring(74, 88), line.substring(88, 89)),
      currency: 'EUR',
    };
  }

  /**
   * Parsea el registro tipo 22 (movimiento)
   */
  private static parseTransaction(line: string): Norma43Transaction {
    if (line.length < 86) {
      throw new Error('Registro de movimiento incompleto');
    }

    return {
      officeCode: line.substring(6, 10),
      accountNumber: line.substring(10, 20),
      transactionDate: this.parseDate(line.substring(20, 26)),
      valueDate: this.parseDate(line.substring(26, 32)),
      commonConcept: line.substring(32, 34),
      ownConcept: line.substring(34, 37),
      amount: this.parseAmount(line.substring(37, 51), line.substring(51, 52)),
      documentNumber: line.substring(52, 62).trim(),
      reference1: line.substring(62, 74).trim(),
      reference2: line.substring(74, 86).trim(),
      description: `Mov. ${line.substring(32, 34)}-${line.substring(34, 37)}`,
    };
  }

  /**
   * Parsea el registro tipo 23 (conceptos adicionales)
   */
  private static parseAdditionalConcept(line: string): string {
    const concept1 = line.substring(4, 42).trim();
    const concept2 = line.substring(42, 80).trim();
    return [concept1, concept2].filter(Boolean).join(' ');
  }

  /**
   * Parsea el registro tipo 88 (pie)
   */
  private static parseFooter(line: string): {
    transactionsCount: number;
    totalDebits: number;
    totalCredits: number;
  } {
    return {
      transactionsCount: parseInt(line.substring(20, 26)),
      totalDebits: this.parseAmount(line.substring(26, 40), line.substring(40, 41)),
      totalCredits: this.parseAmount(line.substring(41, 55), line.substring(55, 56)),
    };
  }

  /**
   * Convierte fecha YYMMDD a YYYY-MM-DD
   */
  private static parseDate(yymmdd: string): string {
    const year = '20' + yymmdd.substring(0, 2);
    const month = yymmdd.substring(2, 4);
    const day = yymmdd.substring(4, 6);
    return `${year}-${month}-${day}`;
  }

  /**
   * Convierte importe Norma 43 a decimal
   * @param amountStr - Importe sin decimales (últimos 2 dígitos son decimales)
   * @param signStr - '1' = haber (positivo), '2' = debe (negativo)
   */
  private static parseAmount(amountStr: string, signStr: string): number {
    const amount = parseFloat(amountStr) / 100;
    return signStr === '1' ? amount : -amount;
  }

  /**
   * Calcula resumen de transacciones
   */
  private static calculateSummary(transactions: Norma43Transaction[]): {
    totalDebits: number;
    totalCredits: number;
    transactionsCount: number;
  } {
    let totalDebits = 0;
    let totalCredits = 0;

    for (const tx of transactions) {
      if (tx.amount < 0) {
        totalDebits += Math.abs(tx.amount);
      } else {
        totalCredits += tx.amount;
      }
    }

    return {
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      transactionsCount: transactions.length,
    };
  }

  /**
   * Retorna cabecera vacía para casos de error
   */
  private static getEmptyHeader(): Norma43Header {
    return {
      bankCode: '',
      officeCode: '',
      accountNumber: '',
      startDate: '',
      endDate: '',
      initialBalance: 0,
      finalBalance: 0,
      currency: 'EUR',
    };
  }

  /**
   * Valida que el contenido parezca formato Norma 43
   */
  static isValidFormat(fileContent: string): boolean {
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    // Debe tener al menos 3 líneas (header + transacción + footer)
    if (lines.length < 3) return false;
    
    // Primera línea debe ser tipo 11 (cabecera)
    if (!lines[0].startsWith('11')) return false;
    
    // Última línea debe ser tipo 88 (pie)
    if (!lines[lines.length - 1].startsWith('88')) return false;
    
    return true;
  }
}
