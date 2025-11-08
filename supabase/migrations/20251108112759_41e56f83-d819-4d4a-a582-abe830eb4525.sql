-- Add workflow status to invoices_received
ALTER TABLE invoices_received 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'draft' 
CHECK (approval_status IN ('draft', 'pending_approval', 'approved_manager', 'approved_accounting', 'posted', 'paid', 'rejected'));

ALTER TABLE invoices_received 
ADD COLUMN IF NOT EXISTS requires_manager_approval boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_accounting_approval boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS rejected_reason text,
ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone;

-- Create invoice_approvals table for tracking approvals
CREATE TABLE IF NOT EXISTS invoice_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices_received(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL REFERENCES auth.users(id),
  approval_level text NOT NULL CHECK (approval_level IN ('manager', 'accounting')),
  action text NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_changes')),
  comments text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(invoice_id, approver_id, approval_level)
);

-- Create approval_rules table for configurable thresholds
CREATE TABLE IF NOT EXISTS approval_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_code text REFERENCES centres(codigo) ON DELETE CASCADE,
  rule_name text NOT NULL,
  min_amount numeric DEFAULT 0,
  max_amount numeric,
  requires_manager_approval boolean DEFAULT false,
  requires_accounting_approval boolean DEFAULT true,
  auto_approve_below_threshold boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoice_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_approvals
CREATE POLICY "Users can view approvals for accessible invoices"
ON invoice_approvals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM invoices_received ir
    WHERE ir.id = invoice_approvals.invoice_id
    AND ir.centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create approvals for accessible invoices"
ON invoice_approvals FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM invoices_received ir
    WHERE ir.id = invoice_approvals.invoice_id
    AND ir.centro_code IN (
      SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can manage all approvals"
ON invoice_approvals FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for approval_rules
CREATE POLICY "Users can view rules for accessible centres"
ON approval_rules FOR SELECT
USING (
  centro_code IN (
    SELECT centro_code FROM v_user_centres WHERE user_id = auth.uid()
  )
  OR centro_code IS NULL
);

CREATE POLICY "Admins can manage all approval rules"
ON approval_rules FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Function to determine required approvals based on rules
CREATE OR REPLACE FUNCTION calculate_required_approvals(
  p_centro_code text,
  p_total_amount numeric
)
RETURNS TABLE (
  requires_manager boolean,
  requires_accounting boolean,
  matching_rule_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.requires_manager_approval,
    ar.requires_accounting_approval,
    ar.id
  FROM approval_rules ar
  WHERE ar.centro_code = p_centro_code
    AND ar.active = true
    AND (ar.min_amount IS NULL OR p_total_amount >= ar.min_amount)
    AND (ar.max_amount IS NULL OR p_total_amount <= ar.max_amount)
  ORDER BY ar.min_amount DESC NULLS LAST
  LIMIT 1;
  
  -- Default if no rule matches
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, true, NULL::uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update invoice approval status
CREATE OR REPLACE FUNCTION update_invoice_approval_status()
RETURNS TRIGGER AS $$
DECLARE
  v_requires_manager boolean;
  v_requires_accounting boolean;
  v_manager_approved boolean;
  v_accounting_approved boolean;
  v_new_status text;
BEGIN
  -- Get requirements
  SELECT requires_manager_approval, requires_accounting_approval
  INTO v_requires_manager, v_requires_accounting
  FROM invoices_received
  WHERE id = NEW.invoice_id;

  -- Check if manager approved (if required)
  IF v_requires_manager THEN
    SELECT EXISTS(
      SELECT 1 FROM invoice_approvals
      WHERE invoice_id = NEW.invoice_id
        AND approval_level = 'manager'
        AND action = 'approved'
    ) INTO v_manager_approved;
  ELSE
    v_manager_approved := true;
  END IF;

  -- Check if accounting approved (if required)
  IF v_requires_accounting THEN
    SELECT EXISTS(
      SELECT 1 FROM invoice_approvals
      WHERE invoice_id = NEW.invoice_id
        AND approval_level = 'accounting'
        AND action = 'approved'
    ) INTO v_accounting_approved;
  ELSE
    v_accounting_approved := true;
  END IF;

  -- Determine new status
  IF NEW.action = 'rejected' THEN
    v_new_status := 'rejected';
  ELSIF v_manager_approved AND v_accounting_approved THEN
    v_new_status := 'approved_accounting';
  ELSIF v_manager_approved AND v_requires_accounting THEN
    v_new_status := 'approved_manager';
  ELSIF v_manager_approved THEN
    v_new_status := 'approved_accounting';
  ELSE
    v_new_status := 'pending_approval';
  END IF;

  -- Update invoice status
  UPDATE invoices_received
  SET approval_status = v_new_status,
      updated_at = now()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update invoice status on approval
CREATE TRIGGER update_invoice_status_on_approval
AFTER INSERT ON invoice_approvals
FOR EACH ROW
EXECUTE FUNCTION update_invoice_approval_status();

-- Insert default approval rules
INSERT INTO approval_rules (centro_code, rule_name, min_amount, max_amount, requires_manager_approval, requires_accounting_approval)
VALUES 
  (NULL, 'Facturas menores a 500€', 0, 500, false, true),
  (NULL, 'Facturas entre 500€ y 2000€', 500, 2000, true, true),
  (NULL, 'Facturas mayores a 2000€', 2000, NULL, true, true)
ON CONFLICT DO NOTHING;