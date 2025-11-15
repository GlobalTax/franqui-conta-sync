// Type-safe Supabase query helpers for accounting tables
import { supabase } from "@/integrations/supabase/client";
import type {
  Membership,
  Organization,
  Restaurant,
  Invoice,
  BankTransaction,
  Account,
  Supplier,
  JournalEntry,
  Period,
  CostCenter
} from "@/types/accounting";

// Memberships - Using materialized view for better performance
export async function getMemberships(userId: string) {
  try {
    const { data, error } = await supabase
      .from("v_user_memberships" as any)
      .select("*")
      .eq("user_id", userId)
      .eq("active", true);
    
    if (error) throw error;
    
    // Map view data to Membership type
    const memberships: Membership[] = (data || []).map((row: any) => ({
      id: row.membership_id,
      user_id: row.user_id,
      organization_id: row.organization_id,
      restaurant_id: row.restaurant_id,
      role: row.role,
      active: row.active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: null,
      organization: row.organization_id ? {
        id: row.organization_id,
        name: row.organization_name,
        email: row.organization_email,
        company_tax_id: row.organization_tax_id,
        cif: null,
        orquest_business_id: null,
        orquest_api_key: null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } : null,
      restaurant: row.restaurant_id ? {
        id: row.restaurant_id,
        codigo: row.restaurant_code,
        nombre: row.restaurant_name,
        direccion: row.restaurant_address,
        ciudad: row.restaurant_city,
        activo: row.restaurant_active,
        franchisee_id: row.organization_id,
        site_number: null,
        pais: null,
        state: null,
        postal_code: null,
        cost_center_code: null,
        seating_capacity: null,
        square_meters: null,
        opening_date: null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } : null,
    }));
    
    return { data: memberships, error: null };
  } catch (err) {
    console.error("Error in getMemberships:", err);
    return { data: null, error: err };
  }
}

export async function getMembershipWithRelations(userId: string) {
  // Reuse the optimized getMemberships function
  return getMemberships(userId);
}

// Organizations
export async function getOrganization(id: string) {
  const { data, error } = await supabase
    .from("franchisees" as any)
    .select("*")
    .eq("id", id)
    .single();
  
  return { data: (data as unknown) as Organization | null, error };
}

// Restaurants
export async function getRestaurant(id: string) {
  const { data, error } = await supabase
    .from("centres" as any)
    .select("*")
    .eq("id", id)
    .single();
  
  return { data: (data as unknown) as Restaurant | null, error };
}

export async function getRestaurantsByOrganization(organizationId: string) {
  const { data, error } = await supabase
    .from("centres" as any)
    .select("*")
    .eq("franchisee_id", organizationId)
    .eq("activo", true);
  
  return { data: (data as unknown) as Restaurant[] | null, error };
}

// Invoices
export async function getInvoices(organizationId: string, restaurantId?: string) {
  let query = supabase
    .from("invoices" as any)
    .select("*")
    .eq("organization_id", organizationId)
    .order("issue_date", { ascending: false });
  
  if (restaurantId) {
    query = query.eq("restaurant_id", restaurantId);
  }
  
  const { data, error } = await query;
  return { data: (data as unknown) as Invoice[] | null, error };
}

export async function getInvoicesByStatus(
  organizationId: string,
  status: string,
  restaurantId?: string
) {
  let query = supabase
    .from("invoices" as any)
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", status);
  
  if (restaurantId) {
    query = query.eq("restaurant_id", restaurantId);
  }
  
  const { data, error } = await query;
  return { data: (data as unknown) as Invoice[] | null, error };
}

export async function getInvoiceCount(
  organizationId: string,
  status?: string,
  restaurantId?: string
) {
  let query = supabase
    .from("invoices" as any)
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  
  if (status) {
    query = query.eq("status", status);
  }
  
  if (restaurantId) {
    query = query.eq("restaurant_id", restaurantId);
  }
  
  const { count, error } = await query;
  return { count, error };
}

// Bank Transactions
export async function getBankTransactions(
  organizationId: string,
  status?: string
) {
  let query = supabase
    .from("bank_transactions" as any)
    .select("*")
    .eq("organization_id", organizationId)
    .order("transaction_date", { ascending: false });
  
  if (status) {
    query = query.eq("status", status);
  }
  
  const { data, error } = await query;
  return { data: (data as unknown) as BankTransaction[] | null, error };
}

export async function getBankTransactionCount(
  organizationId: string,
  status?: string
) {
  let query = supabase
    .from("bank_transactions" as any)
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  
  if (status) {
    query = query.eq("status", status);
  }
  
  const { count, error } = await query;
  return { count, error };
}

// Accounts
export async function getAccounts(centroCode: string, companyId?: string | null, active = true) {
  let query = supabase
    .from("accounts" as any)
    .select("*")
    .eq("centro_code", centroCode)
    .order("code", { ascending: true });
  
  if (companyId) {
    query = query.eq("company_id", companyId);
  }
  
  if (active) {
    query = query.eq("active", true);
  }
  
  const { data, error } = await query;
  return { data: (data as unknown) as Account[] | null, error };
}

// Suppliers
export async function getSuppliers(organizationId: string, active = true) {
  let query = supabase
    .from("suppliers" as any)
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });
  
  if (active) {
    query = query.eq("active", true);
  }
  
  const { data, error } = await query;
  return { data: (data as unknown) as Supplier[] | null, error };
}

// Journal Entries (ahora en accounting_entries)
export async function getJournalEntries(
  organizationId: string,
  periodId?: string,
  status?: string
) {
  let query = supabase
    .from("accounting_entries" as any)
    .select("*")
    .eq("organization_id", organizationId)
    .order("entry_date", { ascending: false });
  
  if (periodId) {
    query = query.eq("fiscal_year_id", periodId);
  }
  
  if (status) {
    query = query.eq("status", status);
  }
  
  const { data, error } = await query;
  return { data: (data as unknown) as JournalEntry[] | null, error };
}

// Periods (ahora en fiscal_years)
export async function getPeriods(organizationId: string, isClosed?: boolean) {
  let query = supabase
    .from("fiscal_years" as any)
    .select("*")
    .eq("organization_id", organizationId)
    .order("year", { ascending: false });
  
  if (isClosed !== undefined) {
    query = query.eq("is_closed", isClosed);
  }
  
  const { data, error } = await query;
  return { data: (data as unknown) as Period[] | null, error };
}

// Cost Centers
export async function getCostCenters(
  organizationId: string,
  restaurantId?: string,
  active = true
) {
  let query = supabase
    .from("cost_centers" as any)
    .select("*")
    .eq("organization_id", organizationId);
  
  if (restaurantId) {
    query = query.eq("restaurant_id", restaurantId);
  }
  
  if (active) {
    query = query.eq("active", true);
  }
  
  const { data, error } = await query;
  return { data: (data as unknown) as CostCenter[] | null, error };
}

// ============= Account Management Functions =============

/**
 * Crea una nueva cuenta contable
 */
export async function createAccount(
  account: Omit<Account, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await supabase
    .from("accounts" as any)
    .insert(account)
    .select()
    .single();

  return {
    data: (data as unknown) as Account | null,
    error,
  };
}

/**
 * Actualiza una cuenta contable existente
 */
export async function updateAccount(id: string, updates: Partial<Account>) {
  const { data, error } = await supabase
    .from("accounts" as any)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  return {
    data: (data as unknown) as Account | null,
    error,
  };
}

/**
 * Desactiva una cuenta (no la elimina)
 */
export async function deactivateAccount(id: string) {
  return updateAccount(id, { active: false });
}

/**
 * Obtiene transacciones contables para calcular saldos
 */
export async function getAccountingTransactionsForBalances(
  centroCode: string,
  startDate?: string,
  endDate?: string
) {
  let query = supabase
    .from("accounting_transactions" as any)
    .select(
      `
      account_code,
      amount,
      movement_type,
      accounting_entries!inner(
        centro_code,
        entry_date,
        status
      )
    `
    )
    .eq("accounting_entries.centro_code", centroCode)
    .eq("accounting_entries.status", "posted");

  if (startDate) {
    query = query.gte("accounting_entries.entry_date", startDate);
  }

  if (endDate) {
    query = query.lte("accounting_entries.entry_date", endDate);
  }

  const { data, error } = await query;

  return {
    data: (data as unknown) as Array<{
      account_code: string;
      amount: number;
      movement_type: 'debit' | 'credit';
    }> | null,
    error,
  };
}

// ============= Centre Management Functions =============

/**
 * Get users assigned to a centre
 */
export async function getCentreUsers(centroCodigo: string) {
  const { data, error } = await supabase
    .from('user_roles')
    .select(`
      id,
      role,
      user_id,
      profiles!inner(id, nombre, apellidos, email)
    `)
    .eq('centro', centroCodigo);
  
  if (error) throw error;
  return data;
}

/**
 * Get all users in the system
 */
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre, apellidos, email')
    .order('apellidos', { ascending: true });
  
  if (error) throw error;
  return data;
}

/**
 * Add a user to a centre
 */
export async function addUserToCentre(
  userId: string,
  role: string,
  centroCodigo: string,
  franchiseeId?: string
) {
  const { data, error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role: role as any,
      centro: centroCodigo,
      franchisee_id: franchiseeId
    } as any)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update a user's role
 */
export async function updateUserRole(userRoleId: string, newRole: string) {
  const { error } = await supabase
    .from('user_roles')
    .update({ role: newRole as any } as any)
    .eq('id', userRoleId);
  
  if (error) throw error;
}

/**
 * Revoke a user's access to a centre
 */
export async function revokeUserFromCentre(userRoleId: string) {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('id', userRoleId);
  
  if (error) throw error;
}

/**
 * Toggle centre active status
 */
export async function toggleCentreStatus(centreId: string, newStatus: boolean) {
  const { error } = await supabase
    .from('centres')
    .update({ activo: newStatus })
    .eq('id', centreId);
  
  if (error) throw error;
}

/**
 * Get companies (CIFs) for a centre
 */
export async function getCentreCompanies(centreId: string) {
  const { data, error } = await supabase
    .from('centre_companies')
    .select('*')
    .eq('centre_id', centreId)
    .eq('activo', true)
    .order('es_principal', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Add a new company to a centre
 */
export async function addCentreCompany(
  centreId: string,
  cif: string,
  razonSocial: string,
  tipoSociedad: string,
  esPrincipal: boolean
) {
  // If setting as principal, unmark others first
  if (esPrincipal) {
    await supabase
      .from('centre_companies')
      .update({ es_principal: false })
      .eq('centre_id', centreId);
  }

  const { data, error } = await supabase
    .from('centre_companies')
    .insert({
      centre_id: centreId,
      cif: cif.toUpperCase(),
      razon_social: razonSocial,
      tipo_sociedad: tipoSociedad,
      es_principal: esPrincipal
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update a centre company
 */
export async function updateCentreCompany(
  companyId: string,
  cif: string,
  razonSocial: string,
  tipoSociedad: string
) {
  const { error } = await supabase
    .from('centre_companies')
    .update({
      cif: cif.toUpperCase(),
      razon_social: razonSocial,
      tipo_sociedad: tipoSociedad
    })
    .eq('id', companyId);
  
  if (error) throw error;
}

/**
 * Set a company as principal for a centre
 */
export async function setPrincipalCompany(centreId: string, companyId: string) {
  const { error } = await supabase.rpc('set_primary_company', {
    _centre_id: centreId,
    _company_id: companyId
  });
  
  if (error) throw error;
}

/**
 * Delete (soft delete) a centre company
 */
export async function deleteCentreCompany(companyId: string) {
  const { error } = await supabase
    .from('centre_companies')
    .update({ activo: false })
    .eq('id', companyId);
  
  if (error) throw error;
}

// ============= Admin Panel Functions =============

/**
 * Get all users with their roles
 * Uses 3-step approach as primary method to avoid join issues
 */
export async function getAllUsersWithRoles() {
  try {
    // Paso 1: Cargar profiles básicos
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, nombre, apellidos, email, created_at, updated_at, theme")
      .order("apellidos", { ascending: true });
    
    if (profilesError) {
      return { data: null, error: profilesError };
    }

    if (!profilesData || profilesData.length === 0) {
      return { data: [], error: null };
    }

    // Paso 2: Cargar user_roles de esos usuarios
    const userIds = profilesData.map(p => p.id);
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("id, user_id, role, centro, franchisee_id, created_at")
      .in("user_id", userIds);
    
    if (rolesError) {
      console.warn("Error loading user_roles, continuing without roles:", rolesError);
    }

    // Paso 3: Cargar centres y franchisees por separado
    const allRoles = rolesData || [];
    const centroIds = Array.from(new Set(allRoles.map(r => r.centro).filter(Boolean)));
    const franchiseeIds = Array.from(new Set(allRoles.map(r => r.franchisee_id).filter(Boolean)));

    const [centresRes, franchiseesRes] = await Promise.all([
      centroIds.length ? supabase.from("centres").select("id, codigo, nombre").in("codigo", centroIds) : Promise.resolve({ data: [], error: null }),
      franchiseeIds.length ? supabase.from("franchisees").select("id, name").in("id", franchiseeIds) : Promise.resolve({ data: [], error: null })
    ]);

    const centresMap = new Map((centresRes.data || []).map((c: any) => [c.codigo, c]));
    const franchiseesMap = new Map((franchiseesRes.data || []).map((f: any) => [f.id, f]));

    // Recomponer profiles con user_roles enriquecidos
    const enrichedProfiles = profilesData.map(profile => ({
      ...profile,
      user_roles: allRoles
        .filter((r: any) => r.user_id === profile.id)
        .map((role: any) => ({
          id: role.id,
          role: role.role,
          centro: role.centro,
          franchisee_id: role.franchisee_id,
          created_at: role.created_at,
          centres: role.centro ? centresMap.get(role.centro) || null : null,
          franchisees: role.franchisee_id ? franchiseesMap.get(role.franchisee_id) || null : null
        }))
    }));

    return { data: enrichedProfiles, error: null };
  } catch (err) {
    console.error("Error in getAllUsersWithRoles:", err);
    return { data: null, error: err as any };
  }
}

/**
 * Create or update user role
 */
export async function upsertUserRole(
  userId: string, 
  role: string, 
  centro?: string, 
  franchiseeId?: string
) {
  const { data, error } = await supabase
    .from("user_roles" as any)
    .upsert({
      user_id: userId,
      role,
      centro,
      franchisee_id: franchiseeId
    } as any)
    .select();
  return { data, error };
}

/**
 * Revoke specific user role
 */
export async function revokeUserRole(userRoleId: string) {
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("id", userRoleId);
  return { error };
}

/**
 * Get audit logs with optional filters
 */
export async function getAuditLogs(
  filters?: {
    userId?: string;
    action?: string;
    tableName?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  let query = supabase
    .from("audit_logs" as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.userId) query = query.eq("user_id", filters.userId);
  if (filters?.action) query = query.eq("action", filters.action as any);
  if (filters?.tableName) query = query.eq("table_name", filters.tableName);
  if (filters?.startDate) query = query.gte("created_at", filters.startDate);
  if (filters?.endDate) query = query.lte("created_at", filters.endDate);

  const { data, error } = await query.limit(100);
  return { data, error };
}

// =====================================================
// PERMISSION MANAGEMENT
// =====================================================

export async function getRolePermissions(role: string) {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('*')
    .eq('role', role as any)
    .order('permission');
  return { data, error };
}

export async function updateRolePermission(
  role: string,
  permission: string,
  granted: boolean
) {
  const { error } = await supabase
    .from('role_permissions')
    .upsert({
      role: role as any,
      permission: permission as any,
      granted,
      updated_at: new Date().toISOString()
    } as any, {
      onConflict: 'role,permission'
    });
  return { error };
}

export async function getUserCustomPermissions(
  userId: string,
  centro?: string
) {
  let query = supabase
    .from('user_centre_permissions')
    .select('*')
    .eq('user_id', userId);
  
  if (centro) {
    query = query.eq('centro', centro);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  return { data, error };
}

export async function addCustomPermission(
  userId: string,
  centro: string,
  permission: string,
  granted: boolean,
  notes?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from('user_centre_permissions')
    .insert({
      user_id: userId,
      centro,
      permission: permission as any,
      granted,
      notes,
      granted_by: user?.id
    } as any);
  
  return { error };
}

export async function revokeCustomPermission(permissionId: string) {
  const { error } = await supabase
    .from('user_centre_permissions')
    .delete()
    .eq('id', permissionId);
  
  return { error };
}

export async function getUserAllPermissions(userId: string, centro?: string) {
  const { data, error } = await supabase
    .rpc('get_user_permissions', {
      _user_id: userId,
      _centro: centro || null
    });
  
  return { data, error };
}

export async function checkPermission(permission: string, centro?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { hasPermission: false };

  const { data, error } = await supabase.rpc('has_permission', {
    _user_id: user.id,
    _permission: permission as any,
    _centro: centro || null
  });

  return { hasPermission: data === true && !error, error };
}
