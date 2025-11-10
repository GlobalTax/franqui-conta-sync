-- ============================================================================
-- FASE 3: OCR Metrics RPC Functions y Vista Materializada (FIXED)
-- ============================================================================

-- ============================================================================
-- Vista Materializada: Métricas OCR agregadas por motor
-- ============================================================================

create materialized view if not exists mv_ocr_metrics as
select 
  engine,
  count(*) as total_invocations,
  sum(cost_estimate_eur) as total_cost_eur,
  avg(cost_estimate_eur) as avg_cost_eur,
  avg(confidence * 100) as avg_confidence,
  avg(processing_time_ms) as avg_processing_time_ms,
  sum(tokens_in) as total_tokens_in,
  sum(tokens_out) as total_tokens_out,
  avg(tokens_in) as avg_tokens_in,
  avg(tokens_out) as avg_tokens_out,
  sum(pages) as total_pages,
  avg(pages) as avg_pages
from ocr_processing_log
where engine is not null
group by engine;

-- Índice para refresh rápido
create unique index if not exists idx_mv_ocr_metrics_engine on mv_ocr_metrics(engine);

-- ============================================================================
-- RPC: Refresh manual de vista materializada
-- ============================================================================

create or replace function refresh_ocr_metrics()
returns void
language plpgsql
security definer
as $$
begin
  refresh materialized view mv_ocr_metrics;
end;
$$;

-- ============================================================================
-- RPC: Distribución de páginas procesadas
-- ============================================================================

create or replace function get_page_distribution()
returns table(page_range text, count bigint)
language sql
security definer
as $$
  select 
    case 
      when pages = 1 then '1 página'
      when pages between 2 and 3 then '2-3 páginas'
      when pages between 4 and 5 then '4-5 páginas'
      when pages between 6 and 10 then '6-10 páginas'
      else '10+ páginas'
    end as page_range,
    count(*) as count
  from ocr_processing_log
  where pages is not null
  group by page_range
  order by min(pages);
$$;

-- ============================================================================
-- RPC: Evolución de costes diarios (últimos 30 días)
-- ============================================================================

create or replace function get_cost_trend_30d()
returns table(date date, daily_cost numeric, invoice_count bigint)
language sql
security definer
as $$
  select 
    created_at::date as date,
    sum(cost_estimate_eur) as daily_cost,
    count(*) as invoice_count
  from ocr_processing_log
  where created_at >= current_date - interval '30 days'
  group by created_at::date
  order by date desc;
$$;

-- ============================================================================
-- Grant permisos
-- ============================================================================

grant execute on function refresh_ocr_metrics() to authenticated;
grant execute on function get_page_distribution() to authenticated;
grant execute on function get_cost_trend_30d() to authenticated;
grant select on mv_ocr_metrics to authenticated;