// ============================================================================
// Account Mapper - Conversión entre tipos DB y Domain
// Aísla la lógica de mapeo para facilitar cambios en la estructura de datos
// ============================================================================

import type { Database } from "@/integrations/supabase/types";
import type { Account } from "@/domain/accounting/types";

type AccountDB = Database['public']['Tables']['accounts']['Row'];
type AccountInsert = Database['public']['Tables']['accounts']['Insert'];

export class AccountMapper {
  /**
   * Convierte de formato DB a entidad de dominio
   */
  static toDomain(dbAccount: AccountDB): Account {
    return {
      id: dbAccount.id,
      code: dbAccount.code,
      name: dbAccount.name,
      accountType: dbAccount.account_type,
      centroCode: dbAccount.centro_code,
      companyId: dbAccount.company_id,
      parentCode: dbAccount.parent_code,
      level: dbAccount.level || 0,
      active: dbAccount.active,
      createdAt: dbAccount.created_at,
      updatedAt: dbAccount.updated_at,
    };
  }

  /**
   * Convierte de entidad de dominio a formato DB (para INSERT/UPDATE)
   */
  static toDatabase(account: Partial<Account>): Partial<AccountInsert> {
    const dbAccount: Partial<AccountInsert> = {};

    if (account.code !== undefined) dbAccount.code = account.code;
    if (account.name !== undefined) dbAccount.name = account.name;
    if (account.accountType !== undefined) dbAccount.account_type = account.accountType as any;
    if (account.centroCode !== undefined) dbAccount.centro_code = account.centroCode;
    if (account.companyId !== undefined) dbAccount.company_id = account.companyId;
    if (account.parentCode !== undefined) dbAccount.parent_code = account.parentCode;
    if (account.level !== undefined) dbAccount.level = account.level;
    if (account.active !== undefined) dbAccount.active = account.active;

    return dbAccount;
  }

  /**
   * Convierte lista de DB a lista de dominio
   */
  static toDomainList(dbAccounts: AccountDB[]): Account[] {
    return dbAccounts.map(this.toDomain);
  }
}
