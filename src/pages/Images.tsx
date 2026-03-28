import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Image as ImageIcon, 
  Loader2, 
  Trash2, 
  PlusCircle, 
  Camera, 
  Pencil
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

interface Banner {
  id: string;
  image_url: string;
  created_at: string;
}

const Images: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'banners' | 'categories'>('banners');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'banners') {
        const { data, error } = await supabase
          .from('home_banners')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setBanners(data || []);
      } else {
        const { data, error } = await supabase.from('category_images').select('*');
        if (error) throw error;
        const mapping: Record<string, string> = {};
        data?.forEach((item: any) => {
          mapping[item.category_name] = item.image_url;
        });
        setCategoryImages(mapping);
      }
    } catch (error: any) {
      console.error('Fetch error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handlePickImage = async (id: string, type: 'banner' | 'category', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(id);
      
      // Delete old image if it exists (Parity Logic)
      let oldUrl = '';
      if (type === 'banner') {
        if (id !== 'new') {
          const banner = banners.find(b => b.id === id);
          if (banner) oldUrl = banner.image_url;
        }
      } else {
        oldUrl = categoryImages[id] || '';
      }

      if (oldUrl) {
        try {
          const fileName = oldUrl.split('/').pop()?.split('?')[0];
          if (fileName) {
            await supabase.storage.from('banners').remove([`home/${fileName}`]);
          }
        } catch (e) {
          console.error('Error deleting old image:', e);
        }
      }

      const fileName = `${type}_${id.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
      const filePath = `home/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(filePath, file, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(filePath);

      if (type === 'banner') {
        if (id === 'new') {
          await supabase.from('home_banners').insert({ image_url: publicUrl });
        } else {
          await supabase.from('home_banners').update({ image_url: publicUrl, updated_at: new Date() }).eq('id', id);
        }
      } else {
        await supabase.from('category_images').upsert({ category_name: id, image_url: publicUrl, updated_at: new Date() }, { onConflict: 'category_name' });
      }

      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} image updated`);
      fetchData();
    } catch (error: any) {
      alert(`Upload Error: ${error.message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteBanner = async (id: string, imageUrl: string) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      const { error } = await supabase.from('home_banners').delete().eq('id', id);
      if (error) throw error;
      
      const fileName = imageUrl.split('/').pop()?.split('?')[0];
      if (fileName) {
        await supabase.storage.from('banners').remove([`home/${fileName}`]);
      }
      
      setBanners(prev => prev.filter(b => b.id !== id));
      alert('Banner deleted');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="images-page" style={{ minHeight: '100vh', background: '#F2F2F7', padding: '2rem' }}>
      
      {/* Pill Tab Bar (Parity) */}
      <div style={{ 
        background: 'white', borderRadius: '12px', padding: '8px', 
        display: 'flex', gap: '4px', margin: '0 auto 1.5rem auto', maxWidth: '600px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <button 
          onClick={() => setActiveTab('banners')}
          style={{ 
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s',
            background: activeTab === 'banners' ? '#007bff' : 'transparent',
            color: activeTab === 'banners' ? 'white' : '#666'
          }}
        >
          Banners
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          style={{ 
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s',
            background: activeTab === 'categories' ? '#007bff' : 'transparent',
            color: activeTab === 'categories' ? 'white' : '#666'
          }}
        >
          Categories
        </button>
      </div>

      <main style={{ maxWidth: '800px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
            <Loader2 className="animate-spin" size={48} color="#007bff" />
          </div>
        ) : activeTab === 'banners' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px', margin: '0 auto' }}>
             {/* Add New Banner (Dashed Placeholder) */}
             <label style={{ 
               display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
               background: 'white', border: '1px dashed #007bff',
               borderRadius: '12px', cursor: 'pointer', color: '#007bff', fontWeight: 600,
               width: 'fit-content', padding: '12px 24px', margin: '0 auto'
             }}>
                <input type="file" accept="image/*" onChange={(e) => handlePickImage('new', 'banner', e)} style={{ display: 'none' }} />
                <PlusCircle size={24} /> Add New Banner
             </label>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {banners.map(banner => (
                  <motion.div 
                    layout key={banner.id} 
                    style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  >
                     <div style={{ width: '100%', aspectRatio: '16/9', background: '#E5E5EA' }}>
                        <img src={banner.image_url} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px', borderTop: '1px solid #F2F2F7', gap: '1rem' }}>
                        <label style={{ padding: '8px', cursor: 'pointer', color: '#007bff' }}>
                          <input type="file" accept="image/*" onChange={(e) => handlePickImage(banner.id, 'banner', e)} style={{ display: 'none' }} />
                          {uploading === banner.id ? <Loader2 className="animate-spin" size={20} /> : <Pencil size={20} />}
                        </label>
                        <button 
                          onClick={() => handleDeleteBanner(banner.id, banner.image_url)}
                          style={{ background: 'none', border: 'none', padding: '8px', color: '#FF3B30', cursor: 'pointer' }}
                        >
                          <Trash2 size={20} />
                        </button>
                     </div>
                  </motion.div>
                ))}
                {banners.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '4rem', color: '#8E8E93' }}>
                    <ImageIcon size={64} color="#ccc" style={{ marginBottom: '1rem' }} />
                    <p>No banners added yet</p>
                  </div>
                )}
             </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {PRODUCT_CATEGORIES.map(cat => (
              <div 
                key={cat} 
                className="card" 
                style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                 <div style={{ width: '100%', aspectRatio: '1/1', background: '#F8F8F8', position: 'relative' }}>
                    {categoryImages[cat] ? (
                      <img src={categoryImages[cat]} alt={cat} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageIcon size={32} color="#ccc" />
                      </div>
                    )}
                    <label style={{ 
                      position: 'absolute', bottom: '8px', right: '8px', 
                      background: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px', 
                      borderRadius: '50%', cursor: 'pointer', display: 'flex'
                    }}>
                      <input type="file" accept="image/*" onChange={(e) => handlePickImage(cat, 'category', e)} style={{ display: 'none' }} />
                      {uploading === cat ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                    </label>
                 </div>
                 <div style={{ padding: '12px', textAlign: 'center' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#1C1C1E' }}>{cat}</h4>
                 </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Images;
