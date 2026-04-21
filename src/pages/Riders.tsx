import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { supabase } from '../services/supabaseClient';
import { 
  Bike, 
  Phone, 
  User, 
  MapPin, 
  CreditCard, 
  Search, 
  AlertCircle,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Verified
} from 'lucide-react';
import './Riders.css';

interface RiderProfile {
  vehicle_type: string | null;
  vehicle_number: string | null;
  is_verified: boolean;
}

interface Address {
  address_line: string;
  city: string;
  pincode: string;
  is_default: boolean;
}

interface Rider {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  upi_id: string | null;
  rider_profiles: RiderProfile[] | RiderProfile | null;
  addresses: Address[] | null;
}

const Riders: React.FC = () => {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRiders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          avatar_url,
          upi_id,
          rider_profiles (
            vehicle_type,
            vehicle_number,
            is_verified
          ),
          addresses (
            address_line,
            city,
            pincode,
            is_default
          )
        `)
        .eq('role', 'rider')
        .order('full_name', { ascending: true });

      if (fetchError) throw fetchError;
      setRiders((data as Rider[]) || []);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch riders');
      console.error('Error fetching riders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRiders();
  }, [fetchRiders]);

  const handleCall = useCallback((phone: string) => {
    window.location.href = `tel:${phone}`;
  }, []);

  const handleToggleVerify = useCallback(async (riderId: string, currentStatus: boolean) => {
    const confirmMsg = currentStatus 
      ? 'Are you sure you want to unverify this rider?' 
      : 'Are you sure you want to verify this rider?';
      
    if (!window.confirm(confirmMsg)) return;

    try {
      const { data: updatedData, error: updateError } = await supabase
        .from('rider_profiles')
        .update({ is_verified: !currentStatus })
        .eq('profile_id', riderId)
        .select();

      if (updateError) throw updateError;
      
      if (!updatedData || updatedData.length === 0) {
        throw new Error('Rider profile record not found. Please ensure the rider has completed their profile.');
      }
      
      setRiders(prev => prev.map(r => {
        if (r.id === riderId) {
          const profiles = Array.isArray(r.rider_profiles) ? r.rider_profiles : [r.rider_profiles];
          return {
            ...r,
            rider_profiles: profiles.map(p => p ? { ...p, is_verified: !currentStatus } : p)
          };
        }
        return r;
      }));

      alert(`Rider ${!currentStatus ? 'verified' : 'unverified'} successfully!`);
    } catch (err: unknown) {
      console.error('Error updating verification status:', err);
      alert((err as Error).message || 'Failed to update verification status');
    }
  }, []);

  const filteredRiders = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return riders.filter(rider => 
      rider.full_name?.toLowerCase().includes(term) ||
      rider.phone?.includes(searchTerm) ||
      rider.email?.toLowerCase().includes(term)
    );
  }, [riders, searchTerm]);

  if (loading) {
    return (
      <div className="loading-state">
        <Loader2 className="animate-spin" size={48} color="#007bff" />
        <p>Loading riders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <AlertCircle size={48} color="#dc3545" />
        <p>{error}</p>
        <button onClick={fetchRiders} className="call-btn" style={{ width: 'auto', borderRadius: '8px', padding: '0 20px', marginTop: '10px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="riders-container">
      <div className="riders-header">
        <h1 className="riders-title">Registered Riders</h1>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search riders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '0.75rem 1rem 0.75rem 2.5rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              width: '300px',
              outline: 'none'
            }}
          />
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      {filteredRiders.length === 0 ? (
        <div className="empty-state">
          <Bike size={64} />
          <p>No riders found matching your search.</p>
        </div>
      ) : (
        <div className="riders-grid">
          {filteredRiders.map((rider) => (
            <RiderCard 
              key={rider.id} 
              rider={rider} 
              onCall={handleCall} 
              onToggleVerify={handleToggleVerify}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface RiderCardProps {
  rider: Rider;
  onCall: (phone: string) => void;
  onToggleVerify: (riderId: string, currentStatus: boolean) => void;
}

const RiderCard: React.FC<RiderCardProps> = memo(({ rider, onCall, onToggleVerify }) => {
  const riderProfile = Array.isArray(rider.rider_profiles) 
    ? rider.rider_profiles[0] 
    : rider.rider_profiles;
  
  const isVerified = riderProfile?.is_verified || false;
  const defaultAddress = rider.addresses?.find(a => a.is_default) || rider.addresses?.[0];

  return (
    <div className="rider-card">
      <div className="rider-header">
        <div className="rider-avatar">
          {rider.avatar_url ? (
            <img 
              src={rider.avatar_url} 
              alt={rider.full_name} 
              loading="lazy" 
              decoding="async" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
            />
          ) : (
            <User size={30} />
          )}
        </div>
        <div className="rider-info">
          <h3>{rider.full_name || 'Unnamed Rider'}</h3>
          <div className="rider-phone">{rider.phone || 'No phone'}</div>
        </div>
      </div>

      <div className="rider-divider" />

      <div className="rider-details">
        <div className="detail-item">
          <Bike size={16} />
          <span>{riderProfile?.vehicle_type || 'No vehicle info'}</span>
        </div>
        <div className="detail-item">
          <CreditCard size={16} />
          <span>{riderProfile?.vehicle_number || 'N/A'}</span>
        </div>
      </div>

      {defaultAddress && (
        <div className="rider-address">
          <MapPin size={16} className="address-icon" />
          <div className="address-text">
            {defaultAddress.address_line}, {defaultAddress.city} - {defaultAddress.pincode}
          </div>
        </div>
      )}

      <div className="rider-footer">
        <div className="upi-badge" title={rider.upi_id || 'Not provided'}>
          <CreditCard size={14} />
          <span className="full-text">{rider.upi_id || 'No UPI ID'}</span>
        </div>

        <div className="rider-actions">
          <div className={`verification-badge ${isVerified ? 'verified' : 'unverified'}`}>
            {isVerified ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
            <span>{isVerified ? 'Verified' : 'Pending'}</span>
          </div>

          <button 
            onClick={() => onToggleVerify(rider.id, isVerified)}
            className={`verify-btn-text ${isVerified ? 'unverify' : 'verify'}`}
          >
            {isVerified ? <Verified size={16} /> : <ShieldCheck size={16} />}
            <span>{isVerified ? 'Unverify' : 'Verify'}</span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default memo(Riders);
