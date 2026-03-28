import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store as StoreIcon, 
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

interface Store {
  id: string;
  name: string;
  address: string | null;
  banner_url: string | null;
  logo_url: string | null;
  is_active: boolean;
  is_approved: boolean;
  has_pending_changes: boolean;
  created_at: string;
}

interface StoreSection {
  title: string;
  data: Store[];
}

const Stores: React.FC = () => {
  const navigate = useNavigate();
  const [storeSections, setStoreSections] = useState<StoreSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unactive' | 'unverified'>('all');

  const processStores = (stores: Store[], filter: string) => {
    const filtered = stores.filter(store => {
      if (filter === 'unactive') return !store.is_active;
      if (filter === 'unverified') return store.has_pending_changes;
      return true;
    });

    const groupedData: { [key: string]: Store[] } = {};

    filtered.forEach(store => {
      const dateString = store.created_at
        ? new Date(store.created_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
        : 'Unknown Date';

      if (!groupedData[dateString]) {
        groupedData[dateString] = [];
      }
      groupedData[dateString].push(store);
    });

    return Object.keys(groupedData).map(date => ({
      title: date,
      data: groupedData[date],
    }));
  };

  const fetchStores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const sections = processStores(data as Store[], activeFilter);
      setStoreSections(sections);
    } catch (error: any) {
      console.error('Error fetching stores:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [activeFilter]);

  return (
    <div className="stores-page">
      <header style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.25rem' }}>Stores</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Verify and manage registered business partners</p>
          </div>
        </div>

        {/* Parity Pill-Tab Bar */}
        <div style={{ display: 'flex', gap: '0.625rem', padding: '0.75rem 0' }}>
          {(['all', 'unactive', 'unverified'] as const).map((filter) => (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{ 
                padding: '0.5rem 1.125rem', borderRadius: '25px', fontSize: '13px', 
                fontWeight: 700, border: '1px solid var(--border)', cursor: 'pointer',
                background: activeFilter === filter ? 'var(--primary)' : 'white',
                color: activeFilter === filter ? 'white' : 'var(--text-secondary)',
                boxShadow: activeFilter === filter ? '0 4px 6px -1px var(--primary)' : 'none',
                transition: 'all 0.2s',
                textTransform: 'capitalize'
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}>
          <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <AnimatePresence>
            {storeSections.map((section) => (
              <div key={section.title}>
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 'bold', color: '#8E8E93', marginBottom: '1rem', paddingLeft: '0.25rem' }}>
                  {section.title}
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  {section.data.map((store) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={store.id} 
                      className="card"
                      onClick={() => navigate(`/stores/${store.id}`)}
                      style={{ 
                        padding: 0, overflow: 'hidden', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column'
                      }}
                    >
                      {/* Banner Image */}
                      <div style={{ height: '120px', background: '#E5E5EA' }}>
                        {store.banner_url ? (
                          <img src={store.banner_url} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
                            <ImageIcon size={40} />
                          </div>
                        )}
                      </div>

                      {/* Store Card Body */}
                      <div style={{ padding: '0.75rem', display: 'flex', alignItems: 'center' }}>
                        <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1C1C1E', marginBottom: '2px' }}>{store.name}</h3>
                          {store.address && (
                            <p style={{ fontSize: '0.75rem', color: '#8E8E93', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {store.address}
                            </p>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          {store.has_pending_changes && (
                            <div style={{ background: '#FF3B30', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800 }}>
                              Unverified Changes
                            </div>
                          )}
                          <div style={{ 
                            background: store.is_active ? '#34C759' : '#FF9500', 
                            color: 'white', padding: '4px 8px', borderRadius: '12px', 
                            fontSize: '10px', fontWeight: 800 
                          }}>
                            {store.is_active ? 'Active' : 'Unactive'}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </AnimatePresence>

          {storeSections.length === 0 && (
            <div style={{ textAlign: 'center', padding: '6rem 0', color: '#ccc' }}>
              <StoreIcon size={64} style={{ marginBottom: '1.5rem' }} />
              <p style={{ fontSize: '1.125rem', fontWeight: 500, color: '#8E8E93' }}>No stores found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Stores;
