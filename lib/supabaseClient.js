// lib/supabaseClient.js
// SwasthyaSathi · Supabase JS Client Setup

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  console.warn(
    '[SwasthyaSathi] Missing Supabase environment variables.\n' +
    'Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local\n' +
    'The app will not function without these variables.'
  );
}

// Use placeholder values during build so createClient doesn't throw.
// At runtime on Vercel, the real env vars will be present.
export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseAnon || 'placeholder-key'
);
