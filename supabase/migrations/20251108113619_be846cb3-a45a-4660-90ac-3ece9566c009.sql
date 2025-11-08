-- Create verifactu_logs table for invoice integrity tracking
CREATE TABLE IF NOT EXISTS verifactu_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_type text NOT NULL CHECK (invoice_type IN ('issued', 'received')),
  invoice_id uuid NOT NULL,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  hash_sha256 text NOT NULL,
  previous_hash text,
  signature text,
  signature_algorithm text DEFAULT 'SHA256withRSA',
  signature_timestamp timestamp with time zone DEFAULT now(),
  chain_position integer NOT NULL,
  verified boolean DEFAULT false,
  verification_date timestamp with time zone,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create facturae_xml_files table for generated XML files
CREATE TABLE IF NOT EXISTS facturae_xml_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_type text NOT NULL CHECK (invoice_type IN ('issued', 'received')),
  invoice_id uuid NOT NULL,
  xml_version text NOT NULL DEFAULT '3.2.2',
  xml_content text NOT NULL,
  file_path text,
  signed boolean DEFAULT false,
  sent_to_aeat boolean DEFAULT false,
  sent_at timestamp with time zone,
  aeat_response jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create compliance_alerts table
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN (
    'missing_hash',
    'invalid_hash',
    'chain_broken',
    'unsigned_invoice',
    'unsent_to_aeat',
    'aeat_error',
    'duplicate_invoice'
  )),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  invoice_type text NOT NULL CHECK (invoice_type IN ('issued', 'received')),
  invoice_id uuid NOT NULL,
  centro_code text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamp with time zone,
  resolution_notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE verifactu_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturae_xml_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for verifactu_logs
CREATE POLICY "Users can view verifactu logs for accessible invoices"
ON verifactu_logs FOR SELECT
USING (
  (invoice_type = 'issued' AND EXISTS (
    SELECT 1 FROM invoices_issued ii
    WHERE ii.id = verifactu_logs.invoice_id
    AND ii.centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  ))
  OR
  (invoice_type = 'received' AND EXISTS (
    SELECT 1 FROM invoices_received ir
    WHERE ir.id = verifactu_logs.invoice_id
    AND ir.centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  ))
);

CREATE POLICY "System can insert verifactu logs"
ON verifactu_logs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all verifactu logs"
ON verifactu_logs FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for facturae_xml_files
CREATE POLICY "Users can view xml files for accessible invoices"
ON facturae_xml_files FOR SELECT
USING (
  (invoice_type = 'issued' AND EXISTS (
    SELECT 1 FROM invoices_issued ii
    WHERE ii.id = facturae_xml_files.invoice_id
    AND ii.centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  ))
  OR
  (invoice_type = 'received' AND EXISTS (
    SELECT 1 FROM invoices_received ir
    WHERE ir.id = facturae_xml_files.invoice_id
    AND ir.centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  ))
);

CREATE POLICY "System can manage xml files"
ON facturae_xml_files FOR ALL
USING (true);

-- RLS Policies for compliance_alerts
CREATE POLICY "Users can view compliance alerts for accessible centres"
ON compliance_alerts FOR SELECT
USING (
  centro_code IN (
    SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update compliance alerts for accessible centres"
ON compliance_alerts FOR UPDATE
USING (
  centro_code IN (
    SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can insert compliance alerts"
ON compliance_alerts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all compliance alerts"
ON compliance_alerts FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add verifactu fields to invoices_issued
ALTER TABLE invoices_issued
ADD COLUMN IF NOT EXISTS verifactu_hash text,
ADD COLUMN IF NOT EXISTS verifactu_signed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verifactu_sent_to_aeat boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verifactu_sent_at timestamp with time zone;

-- Add verifactu fields to invoices_received
ALTER TABLE invoices_received
ADD COLUMN IF NOT EXISTS verifactu_hash text,
ADD COLUMN IF NOT EXISTS verifactu_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verifactu_verified_at timestamp with time zone;

-- Function to generate SHA-256 hash for invoice
CREATE OR REPLACE FUNCTION generate_invoice_hash(
  p_invoice_type text,
  p_invoice_number text,
  p_invoice_date date,
  p_total numeric,
  p_previous_hash text DEFAULT NULL
)
RETURNS text AS $$
DECLARE
  v_data_string text;
  v_hash text;
BEGIN
  -- Concatenate invoice data for hashing
  v_data_string := CONCAT(
    p_invoice_type, '|',
    p_invoice_number, '|',
    p_invoice_date::text, '|',
    p_total::text, '|',
    COALESCE(p_previous_hash, '')
  );
  
  -- Generate SHA-256 hash using pgcrypto
  v_hash := encode(digest(v_data_string, 'sha256'), 'hex');
  
  RETURN v_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify hash chain integrity
CREATE OR REPLACE FUNCTION verify_hash_chain(
  p_centro_code text,
  p_invoice_type text
)
RETURNS TABLE (
  is_valid boolean,
  broken_at integer,
  total_checked integer
) AS $$
DECLARE
  v_prev_hash text := NULL;
  v_position integer := 0;
  v_log record;
  v_calculated_hash text;
  v_broken_at integer := NULL;
BEGIN
  FOR v_log IN
    SELECT vl.*, 
           CASE 
             WHEN vl.invoice_type = 'issued' THEN ii.centro_code
             ELSE ir.centro_code
           END as centro_code
    FROM verifactu_logs vl
    LEFT JOIN invoices_issued ii ON vl.invoice_type = 'issued' AND vl.invoice_id = ii.id
    LEFT JOIN invoices_received ir ON vl.invoice_type = 'received' AND vl.invoice_id = ir.id
    WHERE vl.invoice_type = p_invoice_type
    ORDER BY vl.chain_position
  LOOP
    v_position := v_position + 1;
    
    -- Only check invoices for the specified centro
    IF v_log.centro_code = p_centro_code THEN
      -- Verify previous hash matches
      IF v_prev_hash IS NOT NULL AND v_log.previous_hash != v_prev_hash THEN
        v_broken_at := v_position;
        EXIT;
      END IF;
      
      v_prev_hash := v_log.hash_sha256;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT 
    v_broken_at IS NULL,
    v_broken_at,
    v_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX idx_verifactu_logs_invoice ON verifactu_logs(invoice_type, invoice_id);
CREATE INDEX idx_verifactu_logs_chain ON verifactu_logs(invoice_type, chain_position);
CREATE INDEX idx_facturae_xml_invoice ON facturae_xml_files(invoice_type, invoice_id);
CREATE INDEX idx_compliance_alerts_centro ON compliance_alerts(centro_code, resolved);
CREATE INDEX idx_compliance_alerts_invoice ON compliance_alerts(invoice_type, invoice_id);