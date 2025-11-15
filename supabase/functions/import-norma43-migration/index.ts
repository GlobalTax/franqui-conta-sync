import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// NORMA 43 PARSER (Simplified inline version)
// ============================================================================

interface Norma43Header {
  bankCode: string;
  officeCode: string;
  accountNumber: string;
  startDate: string;
  endDate: string;
  initialBalance: number;
  finalBalance: number;
  currency: string;
}

interface Norma43Transaction {
  transactionDate: string;
  valueDate: string;
  amount: number;
  description: string;
  commonConcept: string;
  ownConcept: string;
  reference1: string;
  reference2: string;
  documentNumber: string;
}

interface ParseResult {
  header: Norma43Header | null;
  transactions: Norma43Transaction[];
  errors: string[];
}

function parseNorma43(fileContent: string): ParseResult {
  const lines = fileContent.split('\n').filter(line => line.trim());
  const errors: string[] = [];
  let header: Norma43Header | null = null;
  const transactions: Norma43Transaction[] = [];
  let lastTransaction: Norma43Transaction | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    try {
      // Registro tipo 11: Cabecera
      if (line.startsWith('11')) {
        if (line.length < 80) throw new Error('Registro de cabecera incompleto');
        
        header = {
          bankCode: line.substring(2, 6),
          officeCode: line.substring(6, 10),
          accountNumber: line.substring(10, 20).trim(),
          startDate: parseDate(line.substring(20, 26)),
          endDate: parseDate(line.substring(26, 32)),
          initialBalance: parseAmount(line.substring(33, 47)),
          finalBalance: parseAmount(line.substring(59, 73)),
          currency: line.substring(47, 50),
        };
      }
      
      // Registro tipo 22: Movimiento
      else if (line.startsWith('22')) {
        if (line.length < 80) throw new Error('Registro de movimiento incompleto');
        
        const transaction: Norma43Transaction = {
          transactionDate: parseDate(line.substring(10, 16)),
          valueDate: parseDate(line.substring(16, 22)),
          commonConcept: line.substring(22, 24),
          ownConcept: line.substring(24, 27),
          amount: parseAmount(line.substring(27, 41)),
          documentNumber: line.substring(41, 51).trim(),
          reference1: line.substring(51, 63).trim(),
          reference2: line.substring(63, 80).trim(),
          description: '',
        };
        transactions.push(transaction);
        lastTransaction = transaction;
      }
      
      // Registro tipo 23: Conceptos adicionales
      else if (line.startsWith('23')) {
        if (lastTransaction) {
          const additionalConcept = line.substring(4, 42).trim();
          lastTransaction.description = additionalConcept;
        }
      }
    } catch (error) {
      errors.push(`Línea ${lineNumber}: ${(error as Error).message}`);
    }
  }

  if (!header) {
    errors.push('No se encontró registro de cabecera (tipo 11)');
  }

  return { header, transactions, errors };
}

function parseDate(dateStr: string): string {
  // Format: YYMMDD -> YYYY-MM-DD
  const year = parseInt(dateStr.substring(0, 2)) + 2000;
  const month = dateStr.substring(2, 4);
  const day = dateStr.substring(4, 6);
  return `${year}-${month}-${day}`;
}

function parseAmount(amountStr: string): number {
  // Format: SSSSSSSSSSSSSC donde C es el signo (+ o -)
  const sign = amountStr.slice(-1);
  const value = parseInt(amountStr.substring(0, amountStr.length - 1)) / 100;
  return sign === '+' ? value : -value;
}

// ============================================================================
// EDGE FUNCTION HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      centroCode,
      fiscalYearId,
      fiscalYearStart,
      fiscalYearEnd,
      fileContent,
      bankAccountId,
    } = await req.json();

    console.log('🏦 Starting Norma 43 import for centro:', centroCode);

    // PASO 1: Parsear archivo
    console.log('📄 Parsing Norma 43 file...');
    const parseResult = parseNorma43(fileContent);

    if (parseResult.errors.length > 0) {
      console.error('❌ Parse errors:', parseResult.errors);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error al parsear archivo Norma 43',
          details: parseResult.errors,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!parseResult.header) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No se encontró cabecera válida en el archivo',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`✅ Parsed ${parseResult.transactions.length} transactions`);

    // PASO 2: Validar fechas dentro del ejercicio fiscal
    console.log('📅 Validating dates...');
    const startDate = new Date(fiscalYearStart);
    const endDate = new Date(fiscalYearEnd);
    
    const outOfRangeTransactions = parseResult.transactions.filter(t => {
      const txDate = new Date(t.transactionDate);
      return txDate < startDate || txDate > endDate;
    });

    if (outOfRangeTransactions.length > 0) {
      console.warn(`⚠️ ${outOfRangeTransactions.length} transactions out of range`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `${outOfRangeTransactions.length} movimientos fuera del ejercicio fiscal (${fiscalYearStart} - ${fiscalYearEnd})`,
          outOfRangeCount: outOfRangeTransactions.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // PASO 3: Buscar o crear cuenta bancaria
    console.log('🔍 Finding or creating bank account...');
    let accountId = bankAccountId;

    if (!accountId) {
      // Buscar por número de cuenta
      const { data: existingAccount } = await supabaseClient
        .from('bank_accounts')
        .select('id')
        .eq('centro_code', centroCode)
        .eq('iban', parseResult.header.accountNumber)
        .single();

      if (existingAccount) {
        accountId = existingAccount.id;
        console.log('✅ Found existing bank account:', accountId);
      } else {
        // Crear nueva cuenta bancaria
        const { data: newAccount, error: createError } = await supabaseClient
          .from('bank_accounts')
          .insert({
            centro_code: centroCode,
            iban: parseResult.header.accountNumber,
            account_name: `Cuenta ${parseResult.header.accountNumber}`,
            currency: parseResult.header.currency || 'EUR',
            current_balance: parseResult.header.finalBalance,
            active: true,
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Error creating bank account:', createError);
          throw createError;
        }

        accountId = newAccount.id;
        console.log('✅ Created new bank account:', accountId);
      }
    }

    // PASO 4: Insertar movimientos bancarios
    console.log('💾 Inserting bank transactions...');
    const transactionsToInsert = parseResult.transactions.map(t => ({
      bank_account_id: accountId,
      transaction_date: t.transactionDate,
      value_date: t.valueDate,
      amount: t.amount,
      description: t.description || t.commonConcept || 'Sin descripción',
      reference: t.reference1 || t.documentNumber,
      status: 'pending',
    }));

    const { data: insertedTransactions, error: insertError } = await supabaseClient
      .from('bank_transactions')
      .insert(transactionsToInsert)
      .select();

    if (insertError) {
      console.error('❌ Error inserting transactions:', insertError);
      throw insertError;
    }

    console.log(`✅ Inserted ${insertedTransactions?.length || 0} transactions`);

    // PASO 5: Calcular estadísticas
    const totalDebits = parseResult.transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalCredits = parseResult.transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const result = {
      success: true,
      bank_account_id: accountId,
      account_number: parseResult.header.accountNumber,
      movements_imported: insertedTransactions?.length || 0,
      total_debits: totalDebits,
      total_credits: totalCredits,
      initial_balance: parseResult.header.initialBalance,
      final_balance: parseResult.header.finalBalance,
      date_range: {
        start: parseResult.header.startDate,
        end: parseResult.header.endDate,
      },
    };

    console.log('✅ Import completed successfully:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error in import-norma43-migration:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
