-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  payment_hash VARCHAR(66) NOT NULL,
  amount VARCHAR(20) NOT NULL DEFAULT '5.0',
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create forms table
CREATE TABLE IF NOT EXISTS forms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  payment_amount VARCHAR(20) NOT NULL DEFAULT '0.01',
  admin_wallet_address VARCHAR(42) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (admin_wallet_address) REFERENCES admins(wallet_address) ON DELETE CASCADE
);

-- Create form_questions table
CREATE TABLE IF NOT EXISTS form_questions (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL DEFAULT 'text', -- text, textarea, select, radio, checkbox
  question_options TEXT[], -- For select, radio, checkbox options
  is_required BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);

-- Create form_responses table
CREATE TABLE IF NOT EXISTS form_responses (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL,
  response_data JSONB NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  payment_hash VARCHAR(66) NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admins_wallet_address ON admins(wallet_address);
CREATE INDEX IF NOT EXISTS idx_forms_slug ON forms(slug);
CREATE INDEX IF NOT EXISTS idx_forms_admin ON forms(admin_wallet_address);
CREATE INDEX IF NOT EXISTS idx_form_questions_form_id ON form_questions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_form_id ON form_responses(form_id);
CREATE INDEX IF NOT EXISTS idx_form_responses_wallet ON form_responses(wallet_address);

-- Add updated_at trigger for forms table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 