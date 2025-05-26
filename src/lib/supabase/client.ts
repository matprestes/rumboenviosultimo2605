
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types'; // We'll generate this file next

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Supabase URL is not defined. Please set NEXT_PUBLIC_SUPABASE_URL in your .env file.");
}
if (!supabaseAnonKey) {
  throw new Error("Supabase anon key is not defined. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file.");
}

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
