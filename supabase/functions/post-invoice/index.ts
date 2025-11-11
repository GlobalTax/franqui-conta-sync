import { corsHeaders } from '../_shared/cors.ts';
import { postInvoiceEntry } from '../_shared/accounting/post-invoice.ts';
import type { PostInvoiceParams } from '../_shared/accounting/post-invoice.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const params: PostInvoiceParams = await req.json();

    console.log('[post-invoice] Starting posting process:', {
      invoiceId: params.invoiceId,
      invoiceType: params.invoiceType,
      entryDate: params.entryDate,
    });

    const result = await postInvoiceEntry(params, supabaseUrl, supabaseKey);

    console.log('[post-invoice] Posting successful:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('[post-invoice] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    const details = err instanceof Error ? (err.stack || String(err)) : JSON.stringify(err);
    return new Response(
      JSON.stringify({
        error: message,
        details,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
