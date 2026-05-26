import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`${name}=(.*)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const targetId = '058aa0a8-5e53-4438-94ba-2db237595b35';
  console.log('Verifying if product ID exists:', targetId);
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', targetId);

  console.log('Result:', { product, error });
}

test();
