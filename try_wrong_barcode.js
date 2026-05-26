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
  console.log('Fetching details of product ID:', targetId);
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .eq('id', targetId)
    .single();

  if (fetchError) {
    console.error('Error fetching product:', fetchError);
    return;
  }

  console.log('Inserting notification...');
  const notifResult = await supabase.from('notifications').insert({
    title: 'Product Removed',
    description: `The product "${product.name}" (Barcode: ${product.barcode || 'N/A'}) was removed by admin due to invalid barcode.`,
    target_group: 'business',
  }).select();

  console.log('Notification insert result:', notifResult);

  console.log('Attempting delete/soft-delete by barcode...');
  const isBarcodeProduct = (product.product_type === 'barcode' || !product.product_type) && product.barcode;
    
  let query = supabase.from('products').delete();
  if (isBarcodeProduct && product.barcode) {
    query = query.eq('barcode', product.barcode);
  } else {
    query = query.eq('id', product.id);
  }

  const deleteResult = await query;
  console.log('Delete result:', deleteResult);

  if (deleteResult.error) {
    console.log('Delete failed, trying fallback soft-delete update...');
    let updateQuery = supabase.from('products').update({ is_deleted: true, in_stock: false });
    if (isBarcodeProduct && product.barcode) {
      updateQuery = updateQuery.eq('barcode', product.barcode);
    } else {
      updateQuery = updateQuery.eq('id', product.id);
    }
    
    const updateResult = await updateQuery;
    console.log('Update result:', updateResult);
  }
}

test();
