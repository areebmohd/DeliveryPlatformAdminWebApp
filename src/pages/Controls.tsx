import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  Save, 
  AlertOctagon, 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle,
  MessageSquare,
  Bike,
  Truck,
  IndianRupee,
  Shuffle
} from 'lucide-react';
import './Controls.css';

interface AppConfig {
  id: number;
  min_version_code: number;
  latest_version_name: string;
  apk_url: string;
  maintenance_mode: boolean;
  maintenance_message: string;
  // Logistics & Pricing parameters
  bike_first_km_fee: number;
  bike_next_km_fee: number;
  truck_first_km_fee: number;
  truck_next_km_fee: number;
  helper_fee: number;
  min_price_offers_batch: number;
  min_price_offers_fast: number;
  // Tiered Platform Fees, Bike Range, and Offer Limits
  platform_fee_tier1: number;
  platform_fee_tier2: number;
  platform_fee_tier3: number;
  bike_max_distance: number;
  max_batch_distance: number;
  max_offer_distance_batch: number;
  max_offer_distance_fast: number;
}

const Controls: React.FC = () => {
  const [configId, setConfigId] = useState<number | null>(null);
  
  // Platform Alert & Releases state
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>('');
  const [minVersionCode, setMinVersionCode] = useState<number>(1);
  const [latestVersionName, setLatestVersionName] = useState<string>('1.0.0');
  const [apkUrl, setApkUrl] = useState<string>('');

  // Logistics & Pricing state
  const [bikeFirstKmFee, setBikeFirstKmFee] = useState<number>(20);
  const [bikeNextKmFee, setBikeNextKmFee] = useState<number>(10);
  
  const [truckFirstKmFee, setTruckFirstKmFee] = useState<number>(300);
  const [truckNextKmFee, setTruckNextKmFee] = useState<number>(30);
  
  const [helperFee, setHelperFee] = useState<number>(300);
  
  const [minPriceOffersBatch, setMinPriceOffersBatch] = useState<number>(49);
  const [minPriceOffersFast, setMinPriceOffersFast] = useState<number>(149);

  // Tiered platform fees, bike range, and offer distance
  const [platformFeeTier1, setPlatformFeeTier1] = useState<number>(5);
  const [platformFeeTier2, setPlatformFeeTier2] = useState<number>(10);
  const [platformFeeTier3, setPlatformFeeTier3] = useState<number>(20);
  const [bikeMaxDistance, setBikeMaxDistance] = useState<number>(2);
  const [maxBatchDistance, setMaxBatchDistance] = useState<number>(1);
  
  // Separated max offer distances
  const [maxOfferDistanceBatch, setMaxOfferDistanceBatch] = useState<number>(1);
  const [maxOfferDistanceFast, setMaxOfferDistanceFast] = useState<number>(1);

  // Status state
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch settings from Supabase
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .single();

      if (error) {
        // If no row exists, initialize one
        if (error.code === 'PGRST116') {
          const defaultData = {
            id: 1,
            min_version_code: 1,
            latest_version_name: '1.0.0',
            apk_url: '',
            maintenance_mode: false,
            maintenance_message: 'Platform is currently undergoing scheduled maintenance. Please try again later.',
            bike_first_km_fee: 20,
            bike_next_km_fee: 10,
            truck_first_km_fee: 300,
            truck_next_km_fee: 30,
            helper_fee: 300,
            min_price_offers_batch: 49,
            min_price_offers_fast: 149,
            platform_fee_tier1: 5,
            platform_fee_tier2: 10,
            platform_fee_tier3: 20,
            bike_max_distance: 2,
            max_batch_distance: 1,
            max_offer_distance_batch: 1,
            max_offer_distance_fast: 1
          };
          
          const { data: insertedData, error: insertError } = await supabase
            .from('app_config')
            .insert(defaultData)
            .select()
            .single();

          if (insertError) throw insertError;
          if (insertedData) {
            populateState(insertedData as AppConfig);
          }
        } else {
          throw error;
        }
      } else if (data) {
        populateState(data as AppConfig);
      }
    } catch (err: unknown) {
      console.error('Error fetching controls:', err);
      showNotification('error', `Failed to load settings: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const populateState = (data: AppConfig) => {
    setConfigId(data.id);
    setMaintenanceMode(Boolean(data.maintenance_mode));
    setMaintenanceMessage(data.maintenance_message ?? '');
    setMinVersionCode(data.min_version_code ?? 1);
    setLatestVersionName(data.latest_version_name ?? '');
    setApkUrl(data.apk_url ?? '');
    
    // Logistics settings - use ?? to preserve 0 values
    setBikeFirstKmFee(Number(data.bike_first_km_fee ?? 20));
    setBikeNextKmFee(Number(data.bike_next_km_fee ?? 10));
    setTruckFirstKmFee(Number(data.truck_first_km_fee ?? 300));
    setTruckNextKmFee(Number(data.truck_next_km_fee ?? 30));
    setHelperFee(Number(data.helper_fee ?? 300));
    setMinPriceOffersBatch(Number(data.min_price_offers_batch ?? 49));
    setMinPriceOffersFast(Number(data.min_price_offers_fast ?? 149));

    // Tiers and ranges
    setPlatformFeeTier1(Number(data.platform_fee_tier1 ?? 5));
    setPlatformFeeTier2(Number(data.platform_fee_tier2 ?? 10));
    setPlatformFeeTier3(Number(data.platform_fee_tier3 ?? 20));
    setBikeMaxDistance(Number(data.bike_max_distance ?? 2));
    setMaxBatchDistance(Number(data.max_batch_distance ?? 1));
    setMaxOfferDistanceBatch(Number(data.max_offer_distance_batch ?? 1));
    setMaxOfferDistanceFast(Number(data.max_offer_distance_fast ?? 1));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      setNotification(null);

      // Validate inputs
      if (minVersionCode < 1) {
        throw new Error('Minimum App Version Code must be greater than or equal to 1.');
      }
      if (!latestVersionName.trim()) {
        throw new Error('Latest App Version Name cannot be empty.');
      }
      if (maintenanceMode && !maintenanceMessage.trim()) {
        throw new Error('Please provide an alert message when Maintenance Mode is enabled.');
      }
      
      // Numeric Validations
      const validateNonNegative = (val: number, label: string) => {
        if (isNaN(val) || val < 0) {
          throw new Error(`${label} must be a non-negative number.`);
        }
      };

      validateNonNegative(bikeFirstKmFee, 'Bike First KM Fee');
      validateNonNegative(bikeNextKmFee, 'Bike Next KM Fee');
      validateNonNegative(truckFirstKmFee, 'Truck First KM Fee');
      validateNonNegative(truckNextKmFee, 'Truck Next KM Fee');
      validateNonNegative(helperFee, 'Helper Fee');
      validateNonNegative(minPriceOffersBatch, 'Minimum Offer Price (Batch)');
      validateNonNegative(minPriceOffersFast, 'Minimum Offer Price (Fast)');
      validateNonNegative(platformFeeTier1, 'Platform Fee Tier 1');
      validateNonNegative(platformFeeTier2, 'Platform Fee Tier 2');
      validateNonNegative(platformFeeTier3, 'Platform Fee Tier 3');
      validateNonNegative(bikeMaxDistance, 'Bike Max Distance');
      validateNonNegative(maxBatchDistance, 'Max Batch Distance');
      validateNonNegative(maxOfferDistanceBatch, 'Max Batch Offer Distance');
      validateNonNegative(maxOfferDistanceFast, 'Max Fast Offer Distance');

      const updateData = {
        min_version_code: minVersionCode,
        latest_version_name: latestVersionName,
        apk_url: apkUrl,
        maintenance_mode: maintenanceMode,
        maintenance_message: maintenanceMessage,
        // Logistics fields
        bike_first_km_fee: bikeFirstKmFee,
        bike_next_km_fee: bikeNextKmFee,
        truck_first_km_fee: truckFirstKmFee,
        truck_next_km_fee: truckNextKmFee,
        helper_fee: helperFee,
        min_price_offers_batch: minPriceOffersBatch,
        min_price_offers_fast: minPriceOffersFast,
        // Tiers and ranges
        platform_fee_tier1: platformFeeTier1,
        platform_fee_tier2: platformFeeTier2,
        platform_fee_tier3: platformFeeTier3,
        bike_max_distance: bikeMaxDistance,
        max_batch_distance: maxBatchDistance,
        max_offer_distance_batch: maxOfferDistanceBatch,
        max_offer_distance_fast: maxOfferDistanceFast
      };

      const { error } = await supabase
        .from('app_config')
        .update(updateData)
        .eq('id', configId || 1);

      if (error) throw error;
      showNotification('success', 'Platform settings saved and applied successfully!');
    } catch (err: unknown) {
      console.error('Error saving settings:', err);
      showNotification('error', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="controls-loader-container">
        <Loader2 className="animate-spin" size={48} color="#007bff" />
        <p>Fetching platform settings...</p>
      </div>
    );
  }

  return (
    <div className="page-container controls-page">
      <header className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Platform Controls</h1>
            <p className="page-subtitle">Configure global service levels, release parameters, and logistics/pricing formulas</p>
          </div>
        </div>
      </header>

      {/* Notification banner */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            className={`controls-notification ${notification.type}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="notification-icon" size={20} />
            ) : (
              <AlertTriangle className="notification-icon" size={20} />
            )}
            <span className="notification-text">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSave} className="controls-form">
        <div className="controls-stack">
          
          {/* TOP SECTION: Alert Toggles & App Updates */}
          <div className="controls-row-grid">
            
            {/* Card 1: Maintenance Status & Custom Alert Message */}
            <motion.div 
              className={`card controls-card ${maintenanceMode ? 'maintenance-active' : ''}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="controls-card-header">
                <div className="controls-card-icon-wrapper maintenance">
                  <AlertOctagon size={24} />
                </div>
                <div>
                  <h3>Platform Service Alert</h3>
                  <p>Put the app offline and show custom messages to users</p>
                </div>
              </div>

              <div className="controls-card-body">
                <div className="toggle-setting-row">
                  <div className="setting-info">
                    <span className="setting-label">Maintenance Mode (Block Ordering)</span>
                    <p className="setting-description">
                      When enabled, users opening the mobile app are met with a banner notification containing your custom message. 
                      They will also be blocked from creating or placing any new orders.
                    </p>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={maintenanceMode}
                      onChange={(e) => setMaintenanceMode(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                <AnimatePresence initial={false}>
                  {maintenanceMode && (
                    <motion.div 
                      className="maintenance-message-container"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="message-input-wrapper">
                        <div className="message-label-row">
                          <label className="field-label">Custom Alert Message to Users</label>
                          <span className="char-indicator"><MessageSquare size={14} /> live alert</span>
                        </div>
                        <textarea
                          className="controls-textarea"
                          placeholder="Enter the alert text that will be shown to users immediately..."
                          value={maintenanceMessage}
                          onChange={(e) => setMaintenanceMessage(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Card 2: App Releases & Force Updates */}
            <motion.div 
              className="card controls-card"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="controls-card-header">
                <div className="controls-card-icon-wrapper release">
                  <Smartphone size={24} />
                </div>
                <div>
                  <h3>App Release & Updates</h3>
                  <p>Enforce latest builds and control downloads of Zoro Mobile Apps</p>
                </div>
              </div>

              <div className="controls-card-body form-grid">
                <div className="form-group">
                  <label className="field-label">
                    Minimum Version Code 
                    <span className="tooltip-indicator" title="Any user on a version lower than this is blocked and forced to update.">?</span>
                  </label>
                  <input
                    type="number"
                    className="controls-input"
                    value={minVersionCode}
                    onChange={(e) => setMinVersionCode(parseInt(e.target.value) || 0)}
                    min="1"
                    required
                  />
                  <p className="input-helper">The minimum build number required (e.g. 5)</p>
                </div>

                <div className="form-group">
                  <label className="field-label">Latest Version Name</label>
                  <input
                    type="text"
                    className="controls-input"
                    value={latestVersionName}
                    onChange={(e) => setLatestVersionName(e.target.value)}
                    placeholder="e.g. 1.0.4"
                    required
                  />
                  <p className="input-helper">Display release tag (e.g. 1.2.0)</p>
                </div>


              </div>
            </motion.div>

          </div>

          {/* BOTTOM WIDE SECTION: Card 3 - Logistics & Pricing Engine */}
          <motion.div 
            className="card controls-card full-width-controls-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="controls-card-header">
              <div className="controls-card-icon-wrapper logistics">
                <IndianRupee size={24} />
              </div>
              <div>
                <h3>Logistics & Pricing Engine</h3>
                <p>Manage distances, fees, dispatch formulas, and offer thresholds for Bike and Truck orders</p>
              </div>
            </div>

            <div className="controls-card-body">
              
              {/* Nested grid structure */}
              <div className="logistics-grid">
                
                {/* Subsection: Bike Rates */}
                <div className="logistics-section">
                  <div className="subsection-title">
                    <Bike size={18} />
                    <h4>Bike Delivery Rates</h4>
                  </div>
                  <div className="subsection-fields two-column">
                    <div className="form-group">
                      <label className="field-label">First KM Fee</label>
                      <div className="input-prefix-wrapper">
                        <span className="input-prefix">₹</span>
                        <input
                          type="number"
                          className="controls-input"
                          value={bikeFirstKmFee}
                          onChange={(e) => setBikeFirstKmFee(Number(e.target.value) || 0)}
                          min="0"
                          required
                        />
                      </div>
                      <p className="input-helper">Fee for the first kilometer</p>
                    </div>

                    <div className="form-group">
                      <label className="field-label">Next KM Fee</label>
                      <div className="input-prefix-wrapper">
                        <span className="input-prefix">₹</span>
                        <input
                          type="number"
                          className="controls-input"
                          value={bikeNextKmFee}
                          onChange={(e) => setBikeNextKmFee(Number(e.target.value) || 0)}
                          min="0"
                          required
                        />
                      </div>
                      <p className="input-helper">Per-kilometer fee after the 1st KM</p>
                    </div>
                  </div>
                </div>

                {/* Subsection: Truck Rates */}
                <div className="logistics-section">
                  <div className="subsection-title">
                    <Truck size={18} />
                    <h4>Truck Delivery Rates</h4>
                  </div>
                  <div className="subsection-fields two-column">
                    <div className="form-group">
                      <label className="field-label">First KM Fee</label>
                      <div className="input-prefix-wrapper">
                        <span className="input-prefix">₹</span>
                        <input
                          type="number"
                          className="controls-input"
                          value={truckFirstKmFee}
                          onChange={(e) => setTruckFirstKmFee(Number(e.target.value) || 0)}
                          min="0"
                          required
                        />
                      </div>
                      <p className="input-helper">Fee for the first kilometer</p>
                    </div>

                    <div className="form-group">
                      <label className="field-label">Next KM Fee</label>
                      <div className="input-prefix-wrapper">
                        <span className="input-prefix">₹</span>
                        <input
                          type="number"
                          className="controls-input"
                          value={truckNextKmFee}
                          onChange={(e) => setTruckNextKmFee(Number(e.target.value) || 0)}
                          min="0"
                          required
                        />
                      </div>
                      <p className="input-helper">Per-kilometer fee after the 1st KM</p>
                    </div>
                  </div>
                </div>

                {/* Subsection: Surcharges & Platform Fees */}
                <div className="logistics-section">
                  <div className="subsection-title">
                    <IndianRupee size={18} />
                    <h4>Other Service Fees</h4>
                  </div>
                  <div className="subsection-fields two-column">
                    <div className="form-group">
                      <label className="field-label">Helper Service Fee</label>
                      <div className="input-prefix-wrapper">
                        <span className="input-prefix">₹</span>
                        <input
                          type="number"
                          className="controls-input"
                          value={helperFee}
                          onChange={(e) => setHelperFee(Number(e.target.value) || 0)}
                          min="0"
                          required
                        />
                      </div>
                      <p className="input-helper">Flat load/unload assist charge</p>
                    </div>

                    <div className="form-group">
                      <label className="field-label">Platform Fee Tier 1 (&lt; ₹500)</label>
                      <div className="input-prefix-wrapper">
                        <span className="input-prefix">₹</span>
                        <input
                          type="number"
                          className="controls-input"
                          value={platformFeeTier1}
                          onChange={(e) => setPlatformFeeTier1(Number(e.target.value) || 0)}
                          min="0"
                          required
                        />
                      </div>
                      <p className="input-helper">For orders under ₹500</p>
                    </div>

                    <div className="form-group">
                      <label className="field-label">Platform Fee Tier 2 (₹500 - ₹1k)</label>
                      <div className="input-prefix-wrapper">
                        <span className="input-prefix">₹</span>
                        <input
                          type="number"
                          className="controls-input"
                          value={platformFeeTier2}
                          onChange={(e) => setPlatformFeeTier2(Number(e.target.value) || 0)}
                          min="0"
                          required
                        />
                      </div>
                      <p className="input-helper">For orders between ₹500 and ₹1,000</p>
                    </div>

                    <div className="form-group">
                      <label className="field-label">Platform Fee Tier 3 (&gt; ₹1k)</label>
                      <div className="input-prefix-wrapper">
                        <span className="input-prefix">₹</span>
                        <input
                          type="number"
                          className="controls-input"
                          value={platformFeeTier3}
                          onChange={(e) => setPlatformFeeTier3(Number(e.target.value) || 0)}
                          min="0"
                          required
                        />
                      </div>
                      <p className="input-helper">For orders over ₹1,000</p>
                    </div>
                  </div>
                </div>

                {/* Subsection: Batching & Offers */}
                <div className="logistics-section">
                  <div className="subsection-title">
                    <Shuffle size={18} />
                    <h4>Logistics & Offers Thresholds</h4>
                  </div>
                  <div className="subsection-fields">
                    <div className="form-group">
                      <label className="field-label">Max Batch Distance</label>
                      <div className="input-prefix-wrapper">
                        <input
                          type="number"
                          className="controls-input suffix-input"
                          value={maxBatchDistance}
                          onChange={(e) => setMaxBatchDistance(Number(e.target.value) || 0)}
                          min="0"
                          required
                        />
                        <span className="input-suffix">KM</span>
                      </div>
                      <p className="input-helper">Maximum distance allowed to batch deliveries together</p>
                    </div>

                    <div className="form-group">
                      <label className="field-label">Max Fast Bike Dist</label>
                      <div className="input-prefix-wrapper">
                        <input
                          type="number"
                          className="controls-input suffix-input"
                          value={bikeMaxDistance}
                          onChange={(e) => setBikeMaxDistance(Number(e.target.value) || 0)}
                          min="0"
                          required
                        />
                        <span className="input-suffix">KM</span>
                      </div>
                      <p className="input-helper">Maximum delivery radius allowed for standard bike deliveries</p>
                    </div>

                    <div className="form-group">
                      <label className="field-label">Max Batch Off Dist</label>
                      <div className="input-prefix-wrapper">
                        <input
                          type="number"
                          className="controls-input suffix-input"
                          value={maxOfferDistanceBatch}
                          onChange={(e) => setMaxOfferDistanceBatch(Number(e.target.value) || 0)}
                          min="0"
                          required
                        />
                        <span className="input-suffix">KM</span>
                      </div>
                      <p className="input-helper">Maximum distance under which batch app offers are active</p>
                    </div>

                    <div className="form-group">
                      <label className="field-label">Max Fast Offer Dist</label>
                      <div className="input-prefix-wrapper">
                        <input
                          type="number"
                          className="controls-input suffix-input"
                          value={maxOfferDistanceFast}
                          onChange={(e) => setMaxOfferDistanceFast(Number(e.target.value) || 0)}
                          min="0"
                          required
                        />
                        <span className="input-suffix">KM</span>
                      </div>
                      <p className="input-helper">Maximum distance under which fast app offers are active</p>
                    </div>

                    <div className="form-group">
                      <label className="field-label">Min Batch Off Price</label>
                      <div className="input-prefix-wrapper">
                        <span className="input-prefix">₹</span>
                        <input
                          type="number"
                          className="controls-input"
                          value={minPriceOffersBatch}
                          onChange={(e) => setMinPriceOffersBatch(Number(e.target.value) || 0)}
                          min="0"
                          required
                        />
                      </div>
                      <p className="input-helper">Minimum subtotal required to apply offers on Batch Delivery</p>
                    </div>

                    <div className="form-group">
                      <label className="field-label">Min Fast Offer Price</label>
                      <div className="input-prefix-wrapper">
                        <span className="input-prefix">₹</span>
                        <input
                          type="number"
                          className="controls-input"
                          value={minPriceOffersFast}
                          onChange={(e) => setMinPriceOffersFast(Number(e.target.value) || 0)}
                          min="0"
                          required
                        />
                      </div>
                      <p className="input-helper">Minimum subtotal required to apply offers on Fast Delivery</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>

        </div>

        {/* Floating action save panel */}
        <div className="controls-action-bar">
          <button 
            type="submit" 
            className="btn btn-primary controls-save-btn" 
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Saving Changes...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Platform Controls
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Controls;
