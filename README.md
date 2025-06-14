# Monad Feedback App

This is a feedback collection app built with [**Privy Auth**](https://www.privy.io/) and [NextJS](https://nextjs.org/) that integrates with Monad testnet for payment verification and PostgreSQL/Supabase for payment tracking.

## Features

- **Anonymous Feedback**: Users can submit feedback anonymously after making a payment
- **Custom Forms**: Admins can create custom forms with their own payment requirements
- **Form-Specific Payments**: Payments are tracked per form, requiring separate payments for different forms
- **Payment Verification**: Integrates with Monad testnet to verify payments
- **Spam Protection**: Prevents duplicate submissions by tracking payments per form in PostgreSQL database
- **Wallet Integration**: Uses Privy for seamless wallet connection

## Setup

1. Clone this repository and open it in your terminal. 
```sh
git clone https://github.com/privy-io/create-next-app
```

2. Install the necessary dependencies (including [Privy Auth](https://www.npmjs.com/package/@privy-io/react-auth) and PostgreSQL client) with `npm`.
```sh
npm i 
```

3. Initialize your environment variables by copying the `.env.example` file to an `.env.local` file. Then, in `.env.local`, add your configuration:

```sh
# In your terminal, create .env.local from .env.example
cp .env.example .env.local
```

Add the following environment variables to `.env.local`:

### Option 1: PostgreSQL with DATABASE_URL (Recommended)

```env
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=<your-privy-app-id>
PRIVY_APP_SECRET=<your-privy-app-secret>

# PostgreSQL Database
DATABASE_URL=postgresql://username:password@hostname:port/database_name
```

### Option 2: Supabase (Alternative)

```env
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=<your-privy-app-id>
PRIVY_APP_SECRET=<your-privy-app-secret>

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

4. Set up your PostgreSQL database with the following table:

```sql
CREATE TABLE payments (
    payment_hash VARCHAR(66) PRIMARY KEY,  -- Ethereum transaction hash (0x + 64 chars)
    wallet_address VARCHAR(42) NOT NULL,   -- Ethereum wallet address (0x + 40 chars)
    amount DECIMAL(18, 18) NOT NULL,       -- Payment amount in MON (supports up to 18 decimals)
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'confirmed', 'failed'
    block_number BIGINT,                   -- Block number where transaction was confirmed
    gas_used BIGINT,                       -- Gas used for the transaction
    form_id INTEGER,                       -- Links payment to specific form (NULL for general payments)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP NULL,
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_payments_wallet_address ON payments(wallet_address);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_form_id ON payments(form_id);
CREATE INDEX idx_payments_wallet_form ON payments(wallet_address, form_id);
```

Run the migrations to set up all required tables:
```bash
# Run all migrations in order
psql $DATABASE_URL -f migrations/001_create_admin_tables.sql
psql $DATABASE_URL -f migrations/002_add_form_id_to_payments.sql
```

## Building locally

In your project directory, run `npm run dev`. You can now visit http://localhost:3000 to see your app and login with Privy!

## Database Options

### PostgreSQL (Default)
The app now uses a direct PostgreSQL connection via `DATABASE_URL`. This works with:
- **Local PostgreSQL**: `postgresql://user:pass@localhost:5432/dbname`
- **Railway**: `postgresql://user:pass@railway.com:5432/dbname`
- **Supabase**: `postgresql://postgres:pass@db.project.supabase.co:5432/postgres`
- **Neon**: `postgresql://user:pass@ep-project.us-east-1.aws.neon.tech/dbname`
- **Any PostgreSQL provider**

### Supabase (Legacy)
If you prefer using the Supabase client SDK, the old implementation is still available in the git history.

## How it works

1. **Connect Wallet**: Users connect their wallet using Privy
2. **Payment Check**: The app checks if the wallet has made a payment for the specific form
3. **Payment Process**: If no payment exists for that form, users must pay the required amount to unlock form submission
4. **Payment Tracking**: All payments are tracked per form in PostgreSQL to prevent duplicates
5. **Form Submission**: Once payment is verified for the specific form, users can submit their responses

### Form-Specific Payments
- Each form can have its own payment requirement
- Payments are tracked per form - paying for one form doesn't unlock others
- Users must make separate payments for each form they want to access
- Admins receive payments directly to their wallet addresses

## Check out:
- `pages/_app.tsx` for how to use the `PrivyProvider` and initialize it with your Privy App ID
- `pages/index.tsx` for the main feedback interface with payment integration
- `pages/forms/[slug].tsx` for custom form interface with form-specific payments
- `pages/api/forms/check-payment.ts` for checking if a wallet has paid for a specific form
- `pages/api/forms/record-payment.ts` for recording form-specific payment transactions
- `lib/database.ts` for PostgreSQL client configuration with form-specific payment methods
- `migrations/` for database schema files

**Check out [our docs](https://docs.privy.io/) for more guidance around using Privy in your app!**
