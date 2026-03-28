import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  ArrowLeft, 
  Save, 
  Store as StoreIcon, 
  Loader2, 
  Barcode as BarcodeIcon, 
  Camera,
  ChevronRight,
  Plus,
  Trash2,
  X,
  XCircle,
  Edit2,
  CheckCircle2
} from 'lucide-react';

const PRODUCT_CATEGORIES = [
  'Clothing',
  'Electronics',
  'Food',
  'Health',
  'Home',
  'Kids',
  'Sports',
  'Vehicles',
  'Hardware',
  'Animals',
  'Art',
  'Stationery',
];

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  image_url: string | null;
  product_type: string;
  barcode: string | null;
  weight_kg: number | null;
  is_info_complete: boolean;
  needs_changes: boolean;
  store_id: string;
  stores: {
    name: string;
    id: string;
  };
}

interface SpecItem {
  title: string;
  text: string;
}

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  
  // Form States
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0');
  const [weight, setWeight] = useState('0');
  const [category, setCategory] = useState('');
  const [descriptionPairs, setDescriptionPairs] = useState<SpecItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, stores(id, name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProduct(data);
      
      // Initialize form
      setName(data.name || '');
      setPrice(data.price?.toString() || '0');
      setWeight(data.weight_kg?.toString() || '0');
      setCategory(data.category || '');
      
      try {
        if (!data.description) {
          setDescriptionPairs([{ title: '', text: '' }]);
        } else {
          const parsed = JSON.parse(data.description);
          if (Array.isArray(parsed)) {
            setDescriptionPairs(parsed.length > 0 ? parsed : [{ title: '', text: '' }]);
          } else {
            setDescriptionPairs([{ title: 'Description', text: data.description }]);
          }
        }
      } catch (e) {
        setDescriptionPairs([{ title: 'Description', text: data.description || '' }]);
      }
    } catch (error: any) {
      console.error('Error fetching product:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !product) return;

    try {
      setUploading(true);
      const fileName = `${product.id}_${Date.now()}.jpg`;
      const filePath = `product_images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: publicUrl })
        .eq('id', product.id);

      if (updateError) throw updateError;

      setProduct(prev => prev ? { ...prev, image_url: publicUrl } : null);
      alert('Product image updated');
    } catch (error: any) {
      alert(`Upload Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!product) return;
    if (!name || isNaN(parseFloat(price))) {
      alert('Name and valid Price are required.');
      return;
    }

    try {
      setSaving(true);
      const validPairs = descriptionPairs.filter(p => p.title.trim() || p.text.trim());
      const isComplete = !!name && !!product.image_url && !!price && !!category;

      const { error } = await supabase
        .from('products')
        .update({
          name,
          price: parseFloat(price),
          weight_kg: parseFloat(weight) || 0,
          category,
          description: JSON.stringify(validPairs),
          is_info_complete: isComplete,
          needs_changes: false,
          is_wrong_barcode: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      alert('Product updated successfully!');
      setIsEditing(false);
      fetchProduct();
    } catch (error: any) {
      alert(`Save failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleWrongBarcode = async () => {
    if (!product || !window.confirm('Delete this product and notify the store about wrong barcode?')) return;
    
    try {
      setSaving(true);
      // 1. Notify store
      await supabase.from('notifications').insert({
        title: 'Product Removed',
        description: `The product "${product.name}" (Barcode: ${product.barcode || 'N/A'}) was removed by admin due to invalid barcode.`,
        target_group: 'business',
      });

      // 2. Soft delete
      const { error } = await supabase
        .from('products')
        .update({ is_deleted: true })
        .eq('id', product.id);

      if (error) throw error;
      alert('Product removed and store notified.');
      navigate('/products');
    } catch (error: any) {
      alert(`Action failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateSpecPair = (idx: number, field: keyof SpecItem, val: string) => {
    const newPairs = [...descriptionPairs];
    newPairs[idx][field] = val;
    setDescriptionPairs(newPairs);
  };

  const addSpecPair = () => setDescriptionPairs([...descriptionPairs, { title: '', text: '' }]);
  const removeSpecPair = (idx: number) => setDescriptionPairs(descriptionPairs.filter((_, i) => i !== idx));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'white' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  if (!product) return <div>Product not found</div>;

  return (
    <div className="product-details" style={{ minHeight: '100vh', background: 'white' }}>
      <header style={{ 
        position: 'sticky', top: 0, zIndex: 100, background: 'white', 
        padding: '1rem 1.5rem', borderBottom: '1px solid #F2F2F7',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <button onClick={() => navigate('/products')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#8E8E93', cursor: 'pointer', fontWeight: 600 }}>
          <ArrowLeft size={20} /> Back
        </button>

        {product.product_type === 'barcode' && (
          <button 
            onClick={() => setIsEditing(!isEditing)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 14px', borderRadius: '20px', fontWeight: 600,
              background: isEditing ? '#FFF2F2' : '#e7f1ff',
              color: isEditing ? '#FF3B30' : '#007bff',
              border: 'none', cursor: 'pointer', fontSize: '14px'
            }}
          >
            {isEditing ? <XCircle size={18} /> : <Edit2 size={16} />}
            {isEditing ? 'Close' : 'Edit'}
          </button>
        )}
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
        {/* Large Image Section */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#F8F8F8', overflow: 'hidden' }}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
              <Package size={80} />
              <p style={{ marginTop: '1rem', fontWeight: 600 }}>No Image Available</p>
            </div>
          )}

          {product.product_type !== 'personal' && (
            <label style={{ 
              position: 'absolute', bottom: '2.5rem', right: '1.25rem', 
              background: '#007bff', color: 'white', padding: '12px 20px', 
              borderRadius: '25px', display: 'flex', alignItems: 'center', 
              gap: '8px', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <input type="file" accept="image/*" onChange={handlePickImage} style={{ display: 'none' }} disabled={uploading} />
              {uploading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
              {product.image_url ? 'Change Photo' : 'Add Photo'}
            </label>
          )}
        </div>

        {/* Content Section Overlay */}
        <div style={{ 
          background: 'white', marginTop: '-2rem', borderTopLeftRadius: '30px', 
          borderTopRightRadius: '30px', padding: '1.5rem', position: 'relative'
        }}>
          {!isEditing ? (
            <>
              {/* View Mode */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1C1C1E' }}>{product.name}</h1>
                  <span style={{ 
                    background: '#F2F2F7', color: '#8E8E93', fontSize: '11px', 
                    fontWeight: 800, padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase' 
                  }}>{product.category || 'Uncategorized'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '24px', fontWeight: 800, color: '#007bff' }}>₹{product.price}</span>
                  {product.weight_kg !== null && (
                    <span style={{ fontSize: '18px', color: '#8E8E93', fontWeight: 500, marginLeft: '6px' }}> • {product.weight_kg} kg</span>
                  )}
                  <div style={{ 
                    marginLeft: '12px', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
                    background: product.product_type === 'barcode' ? '#e7f1ff' : product.product_type === 'common' ? '#FFF4E5' : '#F2F2F7',
                    color: product.product_type === 'barcode' ? '#007bff' : product.product_type === 'common' ? '#FF9500' : '#666'
                  }}>
                    {product.product_type}
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', background: '#F2F2F7', margin: '1.5rem 0' }} />

              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '1rem' }}>Description</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {descriptionPairs.filter(p => p.title || p.text).map((pair, idx) => (
                    <div key={idx} style={{ 
                      background: '#F8F9FA', padding: '12px', borderRadius: '10px', 
                      border: '1px solid #F1F3F5', display: 'flex', flexDirection: 'column'
                    }}>
                      <span style={{ fontSize: '10px', color: '#8E8E93', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                        {pair.title || 'Info'}
                      </span>
                      <p style={{ fontSize: '15px', color: '#1C1C1E', fontWeight: 600, lineHeight: 1.4 }}>{pair.text}</p>
                    </div>
                  ))}
                  {descriptionPairs.length === 0 && <p style={{ color: '#8E8E93' }}>N/A</p>}
                </div>
              </div>

              {/* Store Info Card (Parity Style) */}
              <div style={{ background: '#F8F8F8', borderRadius: '16px', padding: '16px', border: '1px solid #F2F2F7' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <StoreIcon size={18} color="#8E8E93" />
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source Store</span>
                </div>
                <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#1C1C1E', marginBottom: '12px' }}>{product.stores.name}</h4>
                <button 
                  onClick={() => navigate(`/stores/${product.stores.id}`)}
                  style={{ 
                    width: '100%', border: 'none', borderTop: '1px solid #E5E5EA', 
                    paddingTop: '12px', background: 'none', color: '#007bff', 
                    fontWeight: 700, display: 'flex', alignItems: 'center', 
                    justifyContent: 'space-between', cursor: 'pointer', fontSize: '14px'
                  }}
                >
                  View Store Profile
                  <ChevronRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Edit Mode */}
              <div style={{ paddingBottom: '80px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '1.5rem' }}>Edit Product Information</h2>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#8E8E93', textTransform: 'uppercase', marginBottom: '6px', marginLeft: '4px', display: 'block' }}>Product Name</label>
                  <input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    style={{ width: '100%', background: '#F2F2F7', border: '1px solid #E5E5EA', borderRadius: '12px', padding: '12px', fontSize: '16px' }} 
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#8E8E93', textTransform: 'uppercase', marginBottom: '6px', marginLeft: '4px', display: 'block' }}>Category</label>
                  <button 
                    onClick={() => setIsPickerVisible(true)}
                    style={{ 
                      width: '100%', background: '#F2F2F7', border: '1px solid #E5E5EA', 
                      borderRadius: '12px', padding: '12px', fontSize: '16px', 
                      textAlign: 'left', display: 'flex', justifyContent: 'space-between', 
                      alignItems: 'center', cursor: 'pointer' 
                    }}
                  >
                    <span style={{ color: category ? '#1C1C1E' : '#999', fontWeight: 600 }}>{category || 'Select Category'}</span>
                    <ChevronRight size={18} color="#007bff" />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#8E8E93', textTransform: 'uppercase', marginBottom: '6px', marginLeft: '4px', display: 'block' }}>Price (₹)</label>
                    <input 
                      type="number" value={price} 
                      onChange={e => setPrice(e.target.value)} 
                      style={{ width: '100%', background: '#F2F2F7', border: '1px solid #E5E5EA', borderRadius: '12px', padding: '12px', fontSize: '16px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#8E8E93', textTransform: 'uppercase', marginBottom: '6px', marginLeft: '4px', display: 'block' }}>Weight (kg)</label>
                    <input 
                      type="number" value={weight} 
                      onChange={e => setWeight(e.target.value)} 
                      style={{ width: '100%', background: '#F2F2F7', border: '1px solid #E5E5EA', borderRadius: '12px', padding: '12px', fontSize: '16px' }} 
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #F2F2F7', paddingTop: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Specifications</h3>
                    <button onClick={addSpecPair} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}>
                      <Plus size={24} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {descriptionPairs.map((pair, idx) => (
                      <div key={idx} style={{ 
                        background: '#FFF', border: '1px solid #F2F2F7', borderRadius: '12px', padding: '12px',
                        display: 'flex', flexDirection: 'column', gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '10px', color: '#8E8E93', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Detail Title</label>
                            <input 
                              placeholder="e.g. Material" value={pair.title} 
                              onChange={e => updateSpecPair(idx, 'title', e.target.value)} 
                              style={{ width: '100%', background: 'none', border: 'none', fontWeight: 700, borderBottom: '1px solid #F2F2F7', padding: '4px 0' }} 
                            />
                          </div>
                          <button onClick={() => removeSpecPair(idx)} style={{ color: '#FF3B30', background: 'none', border: 'none', marginLeft: '8px' }}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: '#8E8E93', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Detail Value</label>
                          <textarea 
                            placeholder="Value..." value={pair.text} 
                            onChange={e => updateSpecPair(idx, 'text', e.target.value)} 
                            style={{ width: '100%', background: 'none', border: 'none', fontSize: '14px', minHeight: '60px', resize: 'none' }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Actions Fixed for Mobile Parity */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button 
                    onClick={handleWrongBarcode}
                    disabled={saving}
                    style={{ 
                      flex: 1, padding: '14px', borderRadius: '15px', border: '1px solid #FF3B30',
                      background: 'none', color: '#FF3B30', fontWeight: 700, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer'
                    }}
                  >
                    <BarcodeIcon size={20} />
                    Wrong Barcode
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    style={{ 
                      flex: 1, padding: '14px', borderRadius: '15px', border: 'none',
                      background: '#007bff', color: 'white', fontWeight: 700, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer'
                    }}
                  >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                    Save Changes
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Category Picker Modal (Mobile Parity) */}
      <AnimatePresence>
        {isPickerVisible && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsPickerVisible(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ 
                position: 'fixed', bottom: 0, left: 0, right: 0, 
                background: 'white', borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
                zIndex: 1001, maxHeight: '80vh', display: 'flex', flexDirection: 'column'
              }}
            >
              <div style={{ padding: '1.25rem', borderBottom: '1px solid #F2F2F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Select Category</h3>
                <button onClick={() => setIsPickerVisible(false)} style={{ background: 'none', border: 'none', color: '#1C1C1E' }}><X size={24} /></button>
              </div>
              <div style={{ overflowY: 'auto', padding: '1rem' }}>
                {PRODUCT_CATEGORIES.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => { setCategory(cat); setIsPickerVisible(false); }}
                    style={{ 
                      width: '100%', padding: '1rem', textAlign: 'left', background: 'none', 
                      border: 'none', fontSize: '16px', fontWeight: category === cat ? 700 : 500,
                      color: category === cat ? '#007bff' : '#1C1C1E', display: 'flex', 
                      justifyContent: 'space-between', alignItems: 'center', borderRadius: '8px',
                      marginBottom: '4px'
                    }}
                  >
                    {cat}
                    {category === cat && <CheckCircle2 size={20} />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductDetails;
