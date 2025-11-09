-- Make franchisee_id nullable in companies table to allow flexible company management
ALTER TABLE companies 
ALTER COLUMN franchisee_id DROP NOT NULL;

-- Add comment to explain the nullable field
COMMENT ON COLUMN companies.franchisee_id IS 'Optional franchisee association. NULL means company is not assigned to any franchisee yet.';