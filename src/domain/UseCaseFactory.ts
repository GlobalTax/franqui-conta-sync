// ============================================================================
// USE CASE FACTORY
// Centraliza la creación de casos de uso con Dependency Injection
// ============================================================================

import { AccountingRepositoryImpl } from '@/infrastructure/persistence/supabase/repositories/AccountingRepositoryImpl';
import { InvoiceRepositoryImpl } from '@/infrastructure/persistence/supabase/repositories/InvoiceRepositoryImpl';
import { BankingRepositoryImpl } from '@/infrastructure/persistence/supabase/repositories/BankingRepositoryImpl';

// Accounting Use Cases
import { CreateAccountingEntryUseCase } from './accounting/use-cases/CreateAccountingEntry';
import { PostEntryUseCase } from './accounting/use-cases/PostEntry';
import { CloseAccountingPeriodUseCase } from './accounting/use-cases/CloseAccountingPeriod';

// Accounting Services
import { EntryValidator } from './accounting/services/EntryValidator';
import { EntryCalculator } from './accounting/services/EntryCalculator';
import { PeriodValidator } from './accounting/services/PeriodValidator';
import { BalanceCalculator } from './accounting/services/BalanceCalculator';

// Invoicing Use Cases
import { CreateInvoiceReceivedUseCase } from './invoicing/use-cases/CreateInvoiceReceived';
import { ApproveInvoiceUseCase } from './invoicing/use-cases/ApproveInvoice';
import { RejectInvoiceUseCase } from './invoicing/use-cases/RejectInvoice';
import { BulkAssignCentreUseCase } from './invoicing/use-cases/BulkAssignCentre';

// Invoicing Services
import { InvoiceCalculator } from './invoicing/services/InvoiceCalculator';
import { InvoiceValidator } from './invoicing/services/InvoiceValidator';
import { ApprovalEngine } from './invoicing/services/ApprovalEngine';

// Banking Use Cases
import { ImportNorma43FileUseCase } from './banking/use-cases/ImportNorma43File';
import { ReconcileBankTransactionUseCase } from './banking/use-cases/ReconcileBankTransaction';
import { SuggestReconciliationMatchesUseCase } from './banking/use-cases/SuggestReconciliationMatches';

// Banking Services
import { Norma43Parser } from './banking/services/Norma43Parser';
import { ReconciliationEngine } from './banking/services/ReconciliationEngine';
import { ReconciliationValidator } from './banking/services/ReconciliationValidator';

/**
 * Factory para instanciar casos de uso con sus dependencias inyectadas
 * Sigue el patrón Singleton para los repositorios
 */
export class UseCaseFactory {
  // Repositorios (singleton)
  private static accountingRepo = new AccountingRepositoryImpl();
  private static invoiceRepo = new InvoiceRepositoryImpl();
  private static bankingRepo = new BankingRepositoryImpl();

  // ========== ACCOUNTING USE CASES ==========

  /**
   * Crea caso de uso para crear asientos contables
   */
  static createAccountingEntryUseCase(): CreateAccountingEntryUseCase {
    return new CreateAccountingEntryUseCase();
  }

  /**
   * Crea caso de uso para contabilizar asientos
   */
  static postEntryUseCase(): PostEntryUseCase {
    return new PostEntryUseCase();
  }

  /**
   * Crea caso de uso para cerrar períodos contables
   */
  static closeAccountingPeriodUseCase(): CloseAccountingPeriodUseCase {
    return new CloseAccountingPeriodUseCase();
  }

  // ========== INVOICING USE CASES ==========

  /**
   * Crea caso de uso para crear facturas recibidas
   */
  static createInvoiceReceivedUseCase(): CreateInvoiceReceivedUseCase {
    return new CreateInvoiceReceivedUseCase();
  }

  /**
   * Crea caso de uso para aprobar facturas
   */
  static approveInvoiceUseCase(): ApproveInvoiceUseCase {
    return new ApproveInvoiceUseCase();
  }

  /**
   * Crea caso de uso para rechazar facturas
   */
  static rejectInvoiceUseCase(): RejectInvoiceUseCase {
    return new RejectInvoiceUseCase();
  }

  /**
   * Crea caso de uso para asignación masiva de centro
   */
  static bulkAssignCentreUseCase(): BulkAssignCentreUseCase {
    return new BulkAssignCentreUseCase(this.invoiceRepo);
  }

  // ========== BANKING USE CASES ==========

  /**
   * Crea caso de uso para importar archivos Norma 43
   */
  static importNorma43FileUseCase(): ImportNorma43FileUseCase {
    return new ImportNorma43FileUseCase();
  }

  /**
   * Crea caso de uso para conciliar transacciones bancarias
   */
  static reconcileBankTransactionUseCase(): ReconcileBankTransactionUseCase {
    return new ReconcileBankTransactionUseCase();
  }

  /**
   * Crea caso de uso para sugerir coincidencias de conciliación
   */
  static suggestReconciliationMatchesUseCase(): SuggestReconciliationMatchesUseCase {
    return new SuggestReconciliationMatchesUseCase();
  }
}
