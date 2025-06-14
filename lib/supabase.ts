import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types for our database tables
export interface Payment {
  payment_hash: string
  wallet_address: string
  amount: string
  status: 'pending' | 'confirmed' | 'failed'
  block_number?: number
  gas_used?: number
  created_at: string
  confirmed_at?: string
} 