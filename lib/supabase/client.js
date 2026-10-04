import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig } from './config.js';

export function createClient() {
  const { url, key } = supabaseConfig();
  return createBrowserClient(url, key);
}
