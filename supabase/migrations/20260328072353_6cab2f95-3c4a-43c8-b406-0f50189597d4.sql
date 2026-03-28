ALTER TABLE public.invoices_received DROP CONSTRAINT IF EXISTS invoices_received_approval_status_check;

ALTER TABLE public.invoices_received ADD CONSTRAINT invoices_received_approval_status_check 
  CHECK (approval_status IN ('draft', 'pending_approval', 'approved_manager', 'approved_accounting', 'posted', 'paid', 'rejected', 'auto_approved', 'needs_review'));