import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store as StoreIcon, 
  ArrowLeft, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Loader2, 
  Package,
  Image as ImageIcon,
  XCircle,
  ClipboardCheck,
  ArrowRight,
  Clock,
  Compass,
  Globe,
  ExternalLink,
  CheckCircle2,
  MessageCircle,
  Map
} from 'lucide-react';

interface Store {
  id: string;
  name: string;
  description: string | null;
  category: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  banner_url: string | null;
  is_active: boolean;
  is_approved: boolean;
  has_pending_changes: boolean;
  created_at: string;
  owner_name: string | null;
  owner_number: string | null;
  upi_id: string | null;
  location_wkt: string | null;
  opening_hours: any;
  approved_details: any;
  verification_images: string[] | null;
  whatsapp_number: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  address_line_1: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

const StoreDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'info'>('products');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [changedFields, setChangedFields] = useState<{ label: string; old: string; new: string }[]>([]);

  const fetchStoreDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setStore(data);

      const { data: prodData } = await supabase
        .from('products')
        .select('id, name, price, image_url')
        .eq('store_id', id)
        .eq('in_stock', true)
        .eq('is_deleted', false);
      
      setProducts(prodData || []);
    } catch (error: any) {
      console.error('Error fetching store:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreDetails();
  }, [id]);

  const renderFormattedValue = (key: string, value: any) => {
    if (!value || value === 'Not set' || value === 'Not provided') return 'Not set';
    if (key === 'opening_hours') {
      try {
        const hours = typeof value === 'string' ? JSON.parse(value) : value;
        if (Array.isArray(hours) && hours.length > 0) {
          return hours.map((h: any) => `${h.start} - ${h.end}`).join(', ');
        }
      } catch (e) { return String(value); }
    }
    if (key === 'location_wkt' || key === 'location') {
      if (typeof value === 'string') {
        return value.replace('POINT(', '').replace(')', '').split(' ').reverse().join(', ');
      }
    }
    return String(value);
  };

  const getChanges = () => {
    if (!store) return [];
    const fields = [
      { key: 'name', label: 'Store Name' },
      { key: 'description', label: 'Description' },
      { key: 'category', label: 'Category' },
      { key: 'upi_id', label: 'UPI ID' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'whatsapp_number', label: 'WhatsApp' },
      { key: 'address_line_1', label: 'Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'pincode', label: 'Pincode' },
      { key: 'owner_name', label: 'Owner Name' },
      { key: 'owner_number', label: 'Owner Number' },
      { key: 'location_wkt', label: 'Location' },
      { key: 'opening_hours', label: 'Opening Hours' },
    ];

    const approved = store.approved_details || {};
    const diffs: any[] = [];

    fields.forEach(f => {
      const oldV = renderFormattedValue(f.key, approved[f.key]);
      const newV = renderFormattedValue(f.key, (store as any)[f.key]);
      if (oldV !== newV) diffs.push({ label: f.label, old: oldV, new: newV });
    });

    return diffs;
  };

  const handleVerifyChanges = () => {
    const diffs = getChanges();
    if (diffs.length === 0) {
      confirmVerification();
    } else {
      setChangedFields(diffs);
      setIsModalOpen(true);
    }
  };

  const confirmVerification = async () => {
    if (!store) return;
    try {
      setActionLoading(true);
      const snapshot = {
        name: store.name,
        description: store.description,
        category: store.category,
        upi_id: store.upi_id,
        phone: store.phone,
        email: store.email,
        whatsapp_number: store.whatsapp_number,
        address_line_1: store.address_line_1,
        city: store.city,
        state: store.state,
        pincode: store.pincode,
        owner_name: store.owner_name,
        owner_number: store.owner_number,
        location: store.location_wkt,
        opening_hours: store.opening_hours,
      };

      const { error } = await supabase
        .from('stores')
        .update({ 
          has_pending_changes: false, 
          approved_details: snapshot 
        })
        .eq('id', store.id);

      if (error) throw error;
      alert('Changes verified successfully!');
      setIsModalOpen(false);
      fetchStoreDetails();
    } catch (error: any) {
      alert(`Action failed: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async (type: 'activate' | 'deactivate') => {
    if (!store) return;
    try {
      setActionLoading(true);
      const snapshot = {
        name: store.name,
        description: store.description,
        category: store.category,
        upi_id: store.upi_id,
        phone: store.phone,
        email: store.email,
        whatsapp_number: store.whatsapp_number,
        address_line_1: store.address_line_1,
        city: store.city,
        state: store.state,
        pincode: store.pincode,
        owner_name: store.owner_name,
        owner_number: store.owner_number,
        location: store.location_wkt,
        opening_hours: store.opening_hours,
      };

      const updates = type === 'activate' 
        ? { is_active: true, is_approved: true, approved_details: snapshot, verification_images: [] }
        : { is_active: false, is_approved: false };

      const { error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', store.id);

      if (error) throw error;
      alert(`Store ${type}d successfully!`);
      fetchStoreDetails();
    } catch (error: any) {
      alert(`Action failed: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleContact = (type: 'tel' | 'whatsapp' | 'url', value: string) => {
    if (!value) return;
    let url = '';
    if (type === 'tel') url = `tel:${value}`;
    else if (type === 'whatsapp') url = `https://wa.me/${value.replace(/\D/g, '')}`;
    else url = value.startsWith('http') ? value : `https://${value}`;
    window.open(url, '_blank');
  };

  const openInMap = () => {
    if (!store?.location_wkt) return;
    const match = store.location_wkt.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (match) {
      const [lng, lat] = [match[1], match[2]];
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'white' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  if (!store) return <div>Store not found</div>;

  return (
    <div className="store-details" style={{ minHeight: '100vh', background: '#F8F9FA', display: 'flex', flexDirection: 'column' }}>
      
      {/* Sticky Header (Parity) */}
      <header style={{ 
        position: 'sticky', top: 0, zIndex: 100, background: '#F8F9FA', 
        padding: '1rem 1.5rem', borderBottom: '1px solid #E5E5EA',
        display: 'flex', alignItems: 'center', gap: '1rem'
      }}>
        <button onClick={() => navigate('/stores')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1C1C1E' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1C1C1E' }}>Store</h1>
      </header>

      <main style={{ maxWidth: '800px', width: '100%', margin: '0 auto', paddingBottom: '120px' }}>
        {/* Banner Section */}
        <div style={{ width: '100%', aspectRatio: '2.5/1', background: '#E5E5EA', overflow: 'hidden' }}>
          {store.banner_url ? (
            <img src={store.banner_url} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#AEAEB2' }}>
               <StoreIcon size={60} />
               <p style={{ marginTop: '8px', fontWeight: 600 }}>Welcome to our store</p>
            </div>
          )}
        </div>

        {/* Branding Container */}
        <div style={{ padding: '1rem 1.5rem', background: '#F8F9FA' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1C1C1E', maxWidth: '70%' }}>{store.name}</h2>
              <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
                 {store.is_active ? (
                   <span style={{ 
                     background: '#E5F6ED', color: '#34C759', border: '1px solid rgba(52,199,89,0.3)',
                     fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '4px' 
                   }}>ACTIVE</span>
                 ) : (
                   <span style={{ 
                     background: '#FFF2F2', color: '#FF3B30', border: '1px solid rgba(255,59,48,0.3)',
                     fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '4px' 
                   }}>INACTIVE</span>
                 )}
                 {store.has_pending_changes && (
                   <span style={{ 
                     background: '#FFF4E5', color: '#FF9500', border: '1px solid rgba(255,149,0,0.3)',
                     fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '4px' 
                   }}>UNVERIFIED</span>
                 )}
              </div>
           </div>
           <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: '#E5F1FF', color: '#007AFF', fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '10px' }}>
                {store.category}
              </span>
              {store.city && (
                <span style={{ background: '#E5F1FF', color: '#007AFF', fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '10px' }}>
                  {store.city}
                </span>
              )}
           </div>
        </div>

        {/* Sticky Tabs */}
        <div style={{ 
          position: 'sticky', top: '60px', zIndex: 90, background: '#F8F9FA', 
          padding: '0.5rem 1.5rem', borderBottom: '1px solid #E5E5EA' 
        }}>
          <div style={{ 
            background: '#E5E5EA', borderRadius: '25px', padding: '4px', 
            display: 'flex', gap: '4px' 
          }}>
            <button 
              onClick={() => setActiveTab('products')}
              style={{ 
                flex: 1, padding: '10px', borderRadius: '22px', border: 'none', fontSize: '14px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer',
                background: activeTab === 'products' ? '#007AFF' : 'transparent',
                color: activeTab === 'products' ? 'white' : '#007AFF'
              }}
            >
              <Package size={20} /> Products
            </button>
            <button 
              onClick={() => setActiveTab('info')}
              style={{ 
                flex: 1, padding: '10px', borderRadius: '22px', border: 'none', fontSize: '14px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer',
                background: activeTab === 'info' ? '#007AFF' : 'transparent',
                color: activeTab === 'info' ? 'white' : '#007AFF'
              }}
            >
              <ImageIcon size={20} /> Store Info
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '1.5rem' }}>
          {activeTab === 'products' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
               {products.map(p => (
                 <motion.div 
                   key={p.id} 
                   layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                   style={{ background: 'white', borderRadius: '16px', padding: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                 >
                   <div style={{ width: '100%', aspectRatio: '1/1', background: '#F2F2F7', borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
                      {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={32} color="#ccc" style={{ margin: 'auto' }} />}
                   </div>
                   <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px', color: '#1C1C1E' }}>{p.name}</h4>
                   <p style={{ fontSize: '16px', fontWeight: 800, color: '#007AFF' }}>₹{p.price}</p>
                 </motion.div>
               ))}
               {products.length === 0 && (
                 <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem 0', color: '#AEAEB2' }}>
                   <Package size={64} style={{ marginBottom: '1rem' }} />
                   <p>No products available right now.</p>
                 </div>
               )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Owner Info Section */}
              <div className="card" style={{ padding: '1rem', borderRadius: '20px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#8E8E93', textTransform: 'uppercase', marginBottom: '12px' }}>Owner Information</h3>
                <div style={{ marginBottom: '1rem' }}>
                   <p style={{ fontSize: '13px', color: '#8E8E93', fontWeight: 600 }}>Owner Name</p>
                   <p style={{ fontSize: '16px', fontWeight: 700 }}>{store.owner_name || 'Not provided'}</p>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                   <p style={{ fontSize: '13px', color: '#8E8E93', fontWeight: 600 }}>Owner Number</p>
                   <button 
                     onClick={() => handleContact('tel', store.owner_number || '')}
                     style={{ background: 'none', border: 'none', padding: 0, fontSize: '16px', fontWeight: 700, color: '#007AFF', cursor: 'pointer' }}
                   >
                     {store.owner_number || 'Not provided'}
                   </button>
                </div>

                {store.verification_images && store.verification_images.length > 0 && (
                  <div style={{ borderTop: '1px solid #F2F2F7', paddingTop: '1rem' }}>
                    <p style={{ fontSize: '13px', color: '#8E8E93', fontWeight: 600, marginBottom: '10px' }}>Verification Documents</p>
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
                      {store.verification_images.map((img, i) => (
                        <div key={i} style={{ flexShrink: 0, width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E5EA' }}>
                          <img src={img} alt="Doc" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(img, '_blank')} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Business Info Section */}
              <div className="card" style={{ padding: '1rem', borderRadius: '20px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#8E8E93', textTransform: 'uppercase', marginBottom: '12px' }}>Business Information</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   <div>
                     <p style={{ fontSize: '13px', color: '#8E8E93', fontWeight: 600 }}>UPI ID</p>
                     <p style={{ fontSize: '16px', fontWeight: 700 }}>{store.upi_id || 'Not provided'}</p>
                   </div>
                   <div>
                     <p style={{ fontSize: '13px', color: '#8E8E93', fontWeight: 600 }}>Email</p>
                     <p style={{ fontSize: '16px', fontWeight: 700 }}>{store.email || 'Not provided'}</p>
                   </div>
                </div>
              </div>

              {/* About Section */}
              <div className="card" style={{ padding: '1rem', borderRadius: '20px' }}>
                 <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#8E8E93', textTransform: 'uppercase', marginBottom: '12px' }}>About the Store</h3>
                 <p style={{ fontSize: '15px', color: '#1C1C1E', lineHeight: 1.5, fontWeight: 500 }}>
                   {store.description || 'Quality products from your neighborhood store.'}
                 </p>
              </div>

              {/* Hours & Location Sections */}
              <div className="card" style={{ padding: '0', borderRadius: '20px', overflow: 'hidden' }}>
                 <div style={{ padding: '1rem', borderBottom: '1px solid #F2F2F7' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#8E8E93', textTransform: 'uppercase', marginBottom: '12px' }}>Operating Hours</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={18} color="#007AFF" />
                      <p style={{ fontSize: '15px', fontWeight: 600 }}>
                        {renderFormattedValue('opening_hours', store.opening_hours)}
                      </p>
                    </div>
                 </div>
                 <div style={{ padding: '1rem' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#8E8E93', textTransform: 'uppercase', marginBottom: '12px' }}>Live Location</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <Compass size={18} color="#007AFF" />
                      <p style={{ fontSize: '15px', fontWeight: 600 }}>
                        {renderFormattedValue('location_wkt', store.location_wkt)}
                      </p>
                    </div>
                    <button 
                      onClick={openInMap}
                      style={{ 
                        background: 'none', border: 'none', color: '#007AFF', fontWeight: 800, 
                        fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' 
                      }}
                    >
                      <Map size={16} /> View on Map
                    </button>
                 </div>
              </div>

              {/* Address Section */}
              <div className="card" style={{ padding: '1rem', borderRadius: '20px' }}>
                 <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#8E8E93', textTransform: 'uppercase', marginBottom: '12px' }}>Address</h3>
                 <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <MapPin size={20} color="#FF3B30" />
                    <p style={{ fontSize: '15px', fontWeight: 600, color: '#1C1C1E', lineHeight: 1.4 }}>
                      {store.address_line_1 || store.address}
                      {store.pincode && ` - ${store.pincode}`}
                      {store.city && <><br />{store.city}</>}
                      {store.state && `, ${store.state}`}
                    </p>
                 </div>
              </div>

              {/* Contact Information (Pill Buttons) */}
              {(store.phone || store.whatsapp_number) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                   <div style={{ display: 'flex', gap: '1rem' }}>
                     {store.phone && (
                       <button 
                         onClick={() => handleContact('tel', store.phone || '')}
                         style={{ 
                           flex: 1, background: '#007AFF', color: 'white', border: 'none', 
                           padding: '12px', borderRadius: '25px', fontWeight: 800, fontSize: '14px',
                           display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                         }}
                       >
                         <Phone size={18} /> Call
                       </button>
                     )}
                     {store.whatsapp_number && (
                       <button 
                         onClick={() => handleContact('whatsapp', store.whatsapp_number || '')}
                         style={{ 
                           flex: 1, background: '#34C759', color: 'white', border: 'none', 
                           padding: '12px', borderRadius: '25px', fontWeight: 800, fontSize: '14px',
                           display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                         }}
                       >
                         <MessageCircle size={18} /> WhatsApp
                       </button>
                     )}
                   </div>
                </div>
              )}

              {/* Social Media */}
              {(store.instagram_url || store.facebook_url) && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem', padding: '1rem 0' }}>
                   {store.instagram_url && (
                     <button onClick={() => handleContact('url', store.instagram_url || '')} style={{ background: 'white', border: '1px solid #E5E5EA', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E4405F' }}>
                        <Globe size={24} />
                     </button>
                   )}
                   {store.facebook_url && (
                     <button onClick={() => handleContact('url', store.facebook_url || '')} style={{ background: 'white', border: '1px solid #E5E5EA', width: '48px', height: '48px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1877F2' }}>
                        <ExternalLink size={24} />
                     </button>
                   )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Sticky Bottom Footer (Parity Actions) */}
      <footer style={{ 
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 110,
        background: 'white', borderTop: '1px solid #E5E5EA', padding: '1rem 1.5rem 2.5rem 1.5rem',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
      }}>
         <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {store.is_active ? (
              <>
                {store.has_pending_changes && (
                  <button 
                    onClick={handleVerifyChanges}
                    disabled={actionLoading}
                    style={{ 
                      width: '100%', background: '#34C759', color: 'white', border: 'none', 
                      padding: '14px', borderRadius: '15px', fontWeight: '800', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    <CheckCircle2 size={24} /> Verify Changed Details
                  </button>
                )}
                <button 
                  onClick={() => handleStatusUpdate('deactivate')}
                  disabled={actionLoading}
                  style={{ 
                    width: '100%', background: '#FF3B30', color: 'white', border: 'none', 
                    padding: '14px', borderRadius: '15px', fontWeight: '800', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <XCircle size={24} /> Deactivate Store
                </button>
              </>
            ) : (
              <button 
                onClick={() => handleStatusUpdate('activate')}
                disabled={actionLoading}
                style={{ 
                  width: '100%', background: '#007AFF', color: 'white', border: 'none', 
                  padding: '14px', borderRadius: '15px', fontWeight: '800', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {actionLoading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={24} />} 
                Activate Store
              </button>
            )}
         </div>
      </footer>

      {/* Verification Changes Modal (Parity) */}
      <AnimatePresence>
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} 
              className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0', borderRadius: '30px' }}
            >
               <div style={{ padding: '1.5rem', borderBottom: '1px solid #F2F2F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ClipboardCheck size={24} color="#007AFF" />
                    <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Review Changes</h2>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><XCircle size={24} color="#8E8E93" /></button>
               </div>
               
               <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
                  <p style={{ color: '#8E8E93', fontSize: '14px', fontWeight: 500, marginBottom: '1.5rem', lineHeight: 1.4 }}>
                    The following details have been updated by the owner. Please review before accepting.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {changedFields.map((f, i) => (
                      <div key={i} style={{ background: '#F8F9FA', padding: '1rem', borderRadius: '16px', border: '1px solid #F2F2F7' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#8E8E93', letterSpacing: '0.05em' }}>{f.label}</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
                          <div style={{ background: '#FFF2F2', padding: '10px', borderRadius: '10px', fontSize: '12px', color: '#FF3B30', fontWeight: 700 }}>{f.old}</div>
                          <ArrowRight size={16} color="#8E8E93" />
                          <div style={{ background: '#E5F6ED', padding: '10px', borderRadius: '10px', fontSize: '12px', color: '#34C759', fontWeight: 700 }}>{f.new}</div>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>

               <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', borderTop: '1px solid #F2F2F7' }}>
                  <button className="btn" style={{ flex: 1, background: '#E5E5EA', color: '#8E8E93' }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button className="btn" style={{ flex: 1, background: '#007AFF', color: 'white' }} onClick={confirmVerification} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <span>Accept Changes</span>}
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoreDetails;
