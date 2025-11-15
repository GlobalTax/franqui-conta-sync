// ============================================================================
// IMPORT IVA HISTORICAL - Edge Function
// Purpose: Import VAT books (emitidas/recibidas) for historical fiscal years
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IVARow {
  fecha: string;
  numero: string;
  nif: string;
  nombre: string;
  base: number;
  tipo: number;
  cuota: number;
  total: number;
}

interface ImportRequest {
  centroCode: string;
  fiscalYear: number;
  invoiceType: 'emitidas' | 'recibidas';
  rows: IVARow[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: ImportRequest = await req.json();
    const { centroCode, fiscalYear, invoiceType, rows } = body;

    console.log(`[import-iva-historical] Starting import: ${invoiceType}, ${rows.length} rows`);

    // Create import_run
    const { data: importRun, error: runError } = await supabase
      .from('import_runs')
      .insert({
        import_type: `iva_${invoiceType}`,
        centro_code: centroCode,
        source_file: `migration_${fiscalYear}_${invoiceType}.csv`,
        created_by: user.id,
        status: 'processing',
      })
      .select()
      .single();

    if (runError) {
      console.error('[import-iva-historical] Error creating import_run:', runError);
      throw new Error(`Error al crear import_run: ${runError.message}`);
    }

    console.log(`[import-iva-historical] Import run created: ${importRun.id}`);

    // Validate and prepare rows
    const validRows: any[] = [];
    const errors: string[] = [];
    let totalBase = 0;
    let totalCuota = 0;
    let totalAmount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Validation
      if (!row.fecha || !row.numero || !row.nif) {
        errors.push(`Fila ${rowNum}: campos obligatorios vacíos (fecha, numero, nif)`);
        continue;
      }

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.fecha)) {
        errors.push(`Fila ${rowNum}: fecha debe estar en formato YYYY-MM-DD`);
        continue;
      }

      // Validate amounts
      const base = Number(row.base);
      const cuota = Number(row.cuota);
      const total = Number(row.total);

      if (isNaN(base) || isNaN(cuota) || isNaN(total)) {
        errors.push(`Fila ${rowNum}: importes no numéricos`);
        continue;
      }

      // Validate calculation: base + cuota = total (with tolerance)
      if (Math.abs(base + cuota - total) > 0.01) {
        errors.push(
          `Fila ${rowNum}: base (${base}) + cuota (${cuota}) ≠ total (${total})`
        );
        continue;
      }

      // Validate VAT rate
      const tipo = Number(row.tipo);
      if (![0, 4, 10, 21].includes(tipo)) {
        errors.push(`Fila ${rowNum}: tipo IVA inválido (debe ser 0, 4, 10 o 21)`);
        continue;
      }

      // Calculate expected VAT
      const expectedCuota = Math.round(base * (tipo / 100) * 100) / 100;
      if (Math.abs(cuota - expectedCuota) > 0.02) {
        errors.push(
          `Fila ${rowNum}: cuota (${cuota}) no coincide con cálculo (${expectedCuota})`
        );
        // Warning but don't skip
      }

      // Calculate hash for deduplication
      const hash = await crypto.subtle
        .digest(
          'SHA-256',
          new TextEncoder().encode(
            `${row.fecha}-${row.numero}-${row.nif}-${total}`
          )
        )
        .then((buf) =>
          Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
        );

      totalBase += base;
      totalCuota += cuota;
      totalAmount += total;

      validRows.push({
        import_run_id: importRun.id,
        centro_code: centroCode,
        invoice_date: row.fecha,
        invoice_number: row.numero,
        tax_id: row.nif,
        supplier_name: invoiceType === 'recibidas' ? row.nombre : null,
        customer_name: invoiceType === 'emitidas' ? row.nombre : null,
        subtotal: base,
        tax_rate: tipo,
        tax_amount: cuota,
        total_amount: total,
        invoice_hash: hash,
        status: 'validated',
      });
    }

    console.log(
      `[import-iva-historical] Validated ${validRows.length}/${rows.length} rows, ${errors.length} errors`
    );

    // Check error threshold
    const errorRate = errors.length / rows.length;
    if (errorRate > 0.2) {
      // More than 20% errors
      await supabase
        .from('import_runs')
        .update({
          status: 'failed',
          error_message: `Demasiados errores: ${errors.length}/${rows.length}`,
        })
        .eq('id', importRun.id);

      return new Response(
        JSON.stringify({
          success: false,
          message: `Demasiados errores (${Math.round(errorRate * 100)}%)`,
          errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert valid rows
    const tableName =
      invoiceType === 'emitidas' ? 'stg_iva_emitidas' : 'stg_iva_recibidas';
    const { error: insertError } = await supabase.from(tableName).insert(validRows);

    if (insertError) {
      console.error('[import-iva-historical] Error inserting rows:', insertError);

      await supabase
        .from('import_runs')
        .update({
          status: 'failed',
          error_message: insertError.message,
        })
        .eq('id', importRun.id);

      throw new Error(`Error al insertar facturas: ${insertError.message}`);
    }

    // Mark as completed
    await supabase
      .from('import_runs')
      .update({
        status: 'completed',
        rows_processed: validRows.length,
        rows_failed: errors.length,
      })
      .eq('id', importRun.id);

    console.log(
      `[import-iva-historical] ✅ Import completed: ${validRows.length} invoices`
    );

    return new Response(
      JSON.stringify({
        success: true,
        import_run_id: importRun.id,
        count: validRows.length,
        total_base: Math.round(totalBase * 100) / 100,
        total_cuota: Math.round(totalCuota * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[import-iva-historical] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
