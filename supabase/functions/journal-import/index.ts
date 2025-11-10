// ============================================================================
// EDGE FUNCTION: journal-import
// Importación avanzada de diario con soporte CSV y validación
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  path: string;
  centro_code: string;
  template_id?: string;
  dry_run?: boolean;
  options?: {
    skip_validation?: boolean;
    auto_balance?: boolean;
  };
}

interface ParsedRow {
  row_number: number;
  entry_date: string;
  description?: string;
  account_code: string;
  debit?: number;
  credit?: number;
  line_description?: string;
}

interface ValidationError {
  row_number: number;
  field: string;
  message: string;
  value?: any;
}

interface ImportResult {
  success: boolean;
  dry_run: boolean;
  stats: {
    total_rows: number;
    valid_rows: number;
    invalid_rows: number;
    total_entries: number;
    total_debit: number;
    total_credit: number;
  };
  entries?: Array<{
    entry_date: string;
    description: string;
    lines: ParsedRow[];
    totals: { debit: number; credit: number; balanced: boolean };
  }>;
  errors: ValidationError[];
  created_entry_ids?: string[];
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { path, centro_code, template_id, dry_run = false, options = {} }: ImportRequest = await req.json();

    console.log(`[journal-import] Processing: ${path}, centro: ${centro_code}, dry_run: ${dry_run}`);

    // Download file from Storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('journal-imports')
      .download(path);

    if (downloadError) {
      throw new Error(`Error descargando archivo: ${downloadError.message}`);
    }

    // Parse CSV file
    const rows = await parseCSV(fileData);

    console.log(`[journal-import] Parsed ${rows.length} rows`);

    // Validate rows
    const { validRows, errors } = await validateRows(rows, supabaseClient, centro_code, options);

    console.log(`[journal-import] Valid: ${validRows.length}, Errors: ${errors.length}`);

    // Group rows into entries
    const entries = groupIntoEntries(validRows);

    console.log(`[journal-import] Grouped into ${entries.length} entries`);

    // Calculate stats
    const stats = calculateStats(rows, validRows, entries);

    // Dry run - return preview
    if (dry_run) {
      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          stats,
          entries: entries.map(e => ({
            entry_date: e.entry_date,
            description: e.description,
            lines: e.items,
            totals: {
              debit: e.items.reduce((sum, l) => sum + (l.debit || 0), 0),
              credit: e.items.reduce((sum, l) => sum + (l.credit || 0), 0),
              balanced: Math.abs(
                e.items.reduce((sum, l) => sum + (l.debit || 0), 0) -
                e.items.reduce((sum, l) => sum + (l.credit || 0), 0)
              ) < 0.01
            }
          })),
          errors,
          message: errors.length > 0 
            ? `Preview completado con ${errors.length} errores de validación`
            : `Preview OK: ${entries.length} asientos listos para importar`
        } as ImportResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Production import
    if (errors.length > 0) {
      throw new Error(`Hay ${errors.length} errores de validación. Usa dry_run=true para revisar.`);
    }

    const createdIds = await importEntries(entries, centro_code, supabaseClient, req.headers);

    console.log(`[journal-import] Created ${createdIds.length} entries`);

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: false,
        stats,
        errors: [],
        created_entry_ids: createdIds,
        message: `Importación exitosa: ${createdIds.length} asientos creados`
      } as ImportResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[journal-import] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error',
        details: error?.stack || ''
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function parseCSV(fileData: Blob): Promise<ParsedRow[]> {
  const text = await fileData.text();
  const lines = text.split('\n').filter(l => l.trim());
  
  if (lines.length < 2) {
    throw new Error('El archivo debe contener al menos una cabecera y una línea de datos');
  }
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map(v => v.trim());
    const row: any = {};
    headers.forEach((h, i) => { row[h] = values[i]; });

    return {
      row_number: index + 2,
      entry_date: formatDate(row.entry_date || row.fecha || ''),
      description: row.description || row.descripcion || '',
      account_code: (row.account_code || row.cuenta || '').toString().trim(),
      debit: parseAmount(row.debit || row.debe || 0),
      credit: parseAmount(row.credit || row.haber || 0),
      line_description: row.line_description || row.concepto || '',
    };
  });
}

function formatDate(value: any): string {
  if (!value) return '';
  
  const str = value.toString().trim();
  
  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  
  // Formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m}-${d}`;
  }
  
  return '';
}

function parseAmount(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const str = value.toString().replace(',', '.').replace(/[^\d.-]/g, '');
  return parseFloat(str) || 0;
}

async function validateRows(
  rows: ParsedRow[],
  supabase: any,
  centro_code: string,
  options: any
): Promise<{ validRows: ParsedRow[]; errors: ValidationError[] }> {
  const errors: ValidationError[] = [];
  const validRows: ParsedRow[] = [];

  const { data: accounts } = await supabase
    .from('accounts')
    .select('code')
    .or(`centro_code.is.null,centro_code.eq.${centro_code}`);

  const validAccountCodes = new Set(accounts?.map((a: any) => a.code) || []);

  for (const row of rows) {
    const rowErrors: ValidationError[] = [];

    if (!row.entry_date || !/^\d{4}-\d{2}-\d{2}$/.test(row.entry_date)) {
      rowErrors.push({
        row_number: row.row_number,
        field: 'entry_date',
        message: 'Fecha inválida. Debe ser YYYY-MM-DD',
        value: row.entry_date
      });
    }

    if (!row.account_code) {
      rowErrors.push({
        row_number: row.row_number,
        field: 'account_code',
        message: 'Código de cuenta obligatorio',
        value: row.account_code
      });
    } else if (!/^\d{7}$/.test(row.account_code)) {
      rowErrors.push({
        row_number: row.row_number,
        field: 'account_code',
        message: 'Código debe tener 7 dígitos',
        value: row.account_code
      });
    } else if (!options.skip_validation && !validAccountCodes.has(row.account_code)) {
      rowErrors.push({
        row_number: row.row_number,
        field: 'account_code',
        message: 'Cuenta no existe en el plan contable',
        value: row.account_code
      });
    }

    if (row.debit! < 0 || row.credit! < 0) {
      rowErrors.push({
        row_number: row.row_number,
        field: 'amount',
        message: 'Los importes no pueden ser negativos',
        value: { debit: row.debit, credit: row.credit }
      });
    }

    if (row.debit! > 0 && row.credit! > 0) {
      rowErrors.push({
        row_number: row.row_number,
        field: 'amount',
        message: 'No puede tener Debe y Haber simultáneamente',
        value: { debit: row.debit, credit: row.credit }
      });
    }

    if (row.debit === 0 && row.credit === 0) {
      rowErrors.push({
        row_number: row.row_number,
        field: 'amount',
        message: 'Debe o Haber debe ser > 0',
        value: { debit: row.debit, credit: row.credit }
      });
    }

    if (rowErrors.length === 0) {
      validRows.push(row);
    } else {
      errors.push(...rowErrors);
    }
  }

  return { validRows, errors };
}

function groupIntoEntries(rows: ParsedRow[]) {
  const grouped = new Map<string, ParsedRow[]>();
  
  for (const row of rows) {
    const key = `${row.entry_date}|${row.description || 'IMPORTACIÓN'}`;
    const list = grouped.get(key) || [];
    list.push(row);
    grouped.set(key, list);
  }

  return Array.from(grouped.entries()).map(([key, items]) => {
    const [entry_date, description] = key.split('|');
    return { entry_date, description, items };
  });
}

function calculateStats(rows: ParsedRow[], validRows: ParsedRow[], entries: any[]) {
  return {
    total_rows: rows.length,
    valid_rows: validRows.length,
    invalid_rows: rows.length - validRows.length,
    total_entries: entries.length,
    total_debit: validRows.reduce((sum, r) => sum + (r.debit || 0), 0),
    total_credit: validRows.reduce((sum, r) => sum + (r.credit || 0), 0),
  };
}

async function importEntries(entries: any[], centro_code: string, supabase: any, headers: Headers): Promise<string[]> {
  const createdIds: string[] = [];

  const authHeader = headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  let userId: string | null = null;
  
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    userId = user?.id || null;
  }

  for (const entry of entries) {
    const { data: newEntry, error: entryError } = await supabase
      .from('accounting_entries')
      .insert({
        centro_code,
        entry_date: entry.entry_date,
        description: entry.description,
        status: 'draft',
        created_by: userId,
      })
      .select()
      .single();

    if (entryError) {
      console.error(`Error creating entry: ${entryError.message}`);
      continue;
    }

    const transactions = entry.items.map((item: ParsedRow, index: number) => ({
      entry_id: newEntry.id,
      account_code: item.account_code,
      movement_type: (item.debit || 0) > 0 ? 'debit' : 'credit',
      amount: (item.debit || 0) > 0 ? item.debit : item.credit,
      description: item.line_description || '',
      line_number: index + 1,
    }));

    const { error: txError } = await supabase
      .from('accounting_transactions')
      .insert(transactions);

    if (txError) {
      console.error(`Error creating transactions: ${txError.message}`);
      await supabase.from('accounting_entries').delete().eq('id', newEntry.id);
      continue;
    }

    createdIds.push(newEntry.id);
  }

  return createdIds;
}
