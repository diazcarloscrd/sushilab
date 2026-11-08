import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdhnpsowlsesoobrytvh.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaG5wc293bHNlc29vYnJ5dHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMDY1NTksImV4cCI6MjEwNzU4MjU1OX0.CzhYFCsCDGHm5jUhEvGIBhfS84AYChRrFYCkq2fNNK8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
