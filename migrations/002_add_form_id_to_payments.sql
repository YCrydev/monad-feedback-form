-- Add form_id column to payments table to track payments per form
ALTER TABLE payments ADD COLUMN form_id INTEGER;

-- Add foreign key constraint to link payments to forms
ALTER TABLE payments ADD CONSTRAINT fk_payments_form_id 
  FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_form_id ON payments(form_id);
CREATE INDEX IF NOT EXISTS idx_payments_wallet_form ON payments(wallet_address, form_id); 