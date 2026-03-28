-- Drop dependent view, alter column, recreate view
DROP VIEW IF EXISTS v_ocr_metrics;

ALTER TABLE public.invoices_received 
  ALTER COLUMN ocr_confidence TYPE NUMERIC(5,2);

CREATE OR REPLACE VIEW v_ocr_metrics AS
SELECT ir.centro_code,
    ir.status AS invoice_status,
    count(DISTINCT ir.id) AS total_invoices,
    avg(ir.ocr_confidence) AS avg_confidence,
    count(DISTINCT
        CASE
            WHEN ir.status = 'pending_ocr'::text THEN ir.id
            ELSE NULL::uuid
        END) AS pending_count,
    count(DISTINCT ocr.id) AS total_runs,
    avg(ocr.duration_ms) AS avg_duration_ms,
    sum(ocr.cost_estimate_eur) AS total_cost_eur,
    count(DISTINCT logs.id) FILTER (WHERE logs.event = 'error'::text) AS error_count
   FROM invoices_received ir
     LEFT JOIN ocr_runs ocr ON ocr.invoice_id = ir.id
     LEFT JOIN ocr_logs logs ON logs.invoice_id = ir.id
  GROUP BY ir.centro_code, ir.status;