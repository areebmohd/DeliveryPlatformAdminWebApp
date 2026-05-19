import React, { useEffect, useState, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  ArrowLeft, 
  Loader2, 
  Barcode as BarcodeIcon, 
  Camera,
  ChevronRight,
  Plus,
  Trash2,
  X,
  XCircle,
  Edit2,
  CheckCircle2,
  Store as StoreIcon
} from 'lucide-react';
import { PRODUCT_CATEGORIES } from '../constants/productCategories';
import type { Product, SpecItem } from '../types';

import './ProductDetails.css';

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [productType, setProductType] = useState<'barcode' | 'common' | 'personal'>('barcode');
  const [barcode, setBarcode] = useState('');
  
  // Form States
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0');
  const [weight, setWeight] = useState('0');
  const [category, setCategory] = useState('');
  const [deliveryVehicle, setDeliveryVehicle] = useState<'bike' | 'truck'>('bike');
  const [descriptionPairs, setDescriptionPairs] = useState<SpecItem[]>([]);
  const [productOptions, setProductOptions] = useState<{ title: string; values: any[] }[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);


  const fetchProduct = useCallback(async () => {
    if (id === 'new') {
      navigate('/products', { replace: true });
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, stores(id, name), master_product:master_product_id(*)')
        .eq('id', id!)
        .single();

      if (error) throw error;
      const productData = data as Product;
      setProduct(productData);
      
      
      // Initialize form
      setName(productData.name || '');
      setPrice(productData.price?.toString() || '0');
      setWeight(productData.weight_kg?.toString() || '0');
      setCategory(productData.category || '');
      setDeliveryVehicle(productData.delivery_vehicle || 'bike');
      setProductType(productData.product_type as any || 'barcode');
      setBarcode(productData.barcode || '');
      // Use master details if available
      if (productData.master_product) {
        setName(productData.master_product.name);
        setCategory(productData.master_product.category);
        setTags(productData.master_product.tags || []);
      }
      
      try {
        if (!productData.description) {
          setDescriptionPairs([{ title: '', text: '' }]);
        } else {
          let parsed;
          if (typeof productData.description === 'object') {
            parsed = productData.description;
          } else {
            parsed = JSON.parse(productData.description);
          }

          if (Array.isArray(parsed)) {
            setDescriptionPairs(parsed.length > 0 ? parsed : [{ title: '', text: '' }]);
          } else {
            setDescriptionPairs([{ title: 'Description', text: typeof parsed === 'string' ? parsed : JSON.stringify(parsed) }]);
          }
        }
      } catch {
        setDescriptionPairs([{ title: 'Description', text: String(productData.description || '') }]);
      }
      
      const normalizedOptions = (productData.options || []).map((opt: any) => ({
        ...opt,
        values: (opt.values || []).map((v: any) => 
          typeof v === 'string' 
            ? { value: v, price_adjustment: 0, weight_adjustment: 0 } 
            : { ...v, price_adjustment: parseFloat(v.price_adjustment) || 0, weight_adjustment: parseFloat(v.weight_adjustment) || 0 }
        )
      }));
      setProductOptions(normalizedOptions);
      setTags(Array.isArray(productData.tags) ? productData.tags : []);
    } catch (error: unknown) {
      console.error('Error fetching product:', (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (id) fetchProduct();
  }, [id, fetchProduct]);

  const handlePickImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        .eq('name', product.name); // Sync image for all products with the same name

      if (updateError) throw updateError;

      setProduct(prev => prev ? { ...prev, image_url: publicUrl } : null);
      alert('Product image updated');
    } catch (error: unknown) {
      alert(`Upload Error: ${(error as Error).message}`);
    } finally {
      setUploading(false);
    }
  }, [product, fetchProduct]);

  const handleSave = useCallback(async () => {
    if (!name || isNaN(parseFloat(price))) {
      alert('Name and valid Price are required.');
      return;
    }

    try {
      setSaving(true);
      const validPairs = descriptionPairs.filter(p => p.title.trim() || p.text.trim());
      const isComplete = !!name && !!price && !!category;

      const sanitizedOptions = (productOptions || [])
        .map(o => ({
          title: (o.title || '').trim(),
          values: (o.values || [])
            .filter((v: any) => (typeof v === 'string' ? v : (v.value || '')).trim() !== '')
            .map((v: any) => ({
              value: (typeof v === 'string' ? v : (v.value || '')).trim(),
              price_adjustment: parseFloat(typeof v === 'string' ? '0' : (v.price_adjustment || 0)) || 0,
              weight_adjustment: parseFloat(typeof v === 'string' ? '0' : (v.weight_adjustment || 0)) || 0
            }))
        }))
        .filter(o => o.title !== '' || o.values.length > 0);

      const saveData: any = {
        name,
        price: parseFloat(price),
        weight_kg: parseFloat(weight) || 0,
        category,
        description: JSON.stringify(validPairs),
        options: sanitizedOptions,
        tags: tags,
        is_info_complete: isComplete,
        delivery_vehicle: deliveryVehicle,
        needs_large_vehicle: deliveryVehicle === 'truck' || (parseFloat(weight) || 0) > 20,
        needs_changes: false,
        is_wrong_barcode: false,
        updated_at: new Date().toISOString(),
        product_type: productType,
        barcode: productType === 'barcode' ? barcode : null,
      };

      if (!product) return;
      saveData.image_url = product.image_url;
      saveData.raw_image_url = null;

      let query = supabase.from('products').update(saveData);

      const isBarcodeProduct = (product.product_type === 'barcode' || !product.product_type) && product.barcode;

      if (isBarcodeProduct && product.barcode) {
        query = query.eq('barcode', product.barcode);
      } else {
        query = query.eq('id', id!);
      }

      const { error } = await query;
      if (error) throw error;

      // Cleanup raw image from storage if it exists
      if (product.raw_image_url) {
        try {
          const path = product.raw_image_url.split('products/')[1];
          if (path) {
            await supabase.storage.from('products').remove([path]);
          }
        } catch (cleanupError) {
          console.error('Failed to cleanup raw image:', cleanupError);
        }
      }
      alert('Product updated successfully!');
      setIsEditing(false);
      fetchProduct();
    } catch (error: unknown) {
      alert(`Save failed: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [id, name, price, weight, category, descriptionPairs, productOptions, tags, deliveryVehicle, productType, barcode, product, navigate, fetchProduct]);

  const handleWrongBarcode = useCallback(async () => {
    if (!product || !window.confirm('Delete this product and notify the store about wrong barcode?')) return;
    
    try {
      setSaving(true);
      // 1. Notify store
      await supabase.from('notifications').insert({
        title: 'Product Removed',
        description: `The product "${product.name}" (Barcode: ${product.barcode || 'N/A'}) was removed by admin due to invalid barcode.`,
        target_group: 'business',
      });

      // 2. Hard delete
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      // Cleanup raw image from storage if it exists
      if (product.raw_image_url) {
        try {
          const path = product.raw_image_url.split('products/')[1];
          if (path) {
            await supabase.storage.from('products').remove([path]);
          }
        } catch (cleanupError) {
          console.error('Failed to cleanup raw image:', cleanupError);
        }
      }
      alert('Product removed and store notified.');
      navigate('/products');
    } catch (error: unknown) {
      alert(`Action failed: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [product, navigate]);

  const updateSpecPair = useCallback((idx: number, field: keyof SpecItem, val: string) => {
    setDescriptionPairs(prev => {
      const newPairs = [...prev];
      newPairs[idx] = { ...newPairs[idx], [field]: val };
      return newPairs;
    });
  }, []);

  const addSpecPair = useCallback(() => setDescriptionPairs(prev => [...prev, { title: '', text: '' }]), []);
  const removeSpecPair = useCallback((idx: number) => setDescriptionPairs(prev => prev.filter((_, i) => i !== idx)), []);

  const handleProductAlreadyAvailable = useCallback(async () => {
    const confirmDelete = window.confirm(`Are you sure? This will delete "${product.name}" and notify the store that it is already available in the catalog.`);
    if (!product || !confirmDelete) return;

    try {
      setSaving(true);
      // 1. Notify store
      await supabase.from('notifications').insert({
        user_id: product.store_id,
        title: 'Product Already Available',
        description: `The product "${product.name}" is already available in our catalog. This entry has been removed. Please search and select it from suggestions next time.`,
        target_group: 'business',
      });

      // 2. Delete product
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      alert('Product deleted and store notified.');
      navigate('/products');
    } catch (error: unknown) {
      alert(`Action failed: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [product, navigate]);

  const handleAcceptProduct = useCallback(async () => {
    if (!product || !window.confirm('Accept this product and make it permanent?')) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('products')
        .update({ 
          is_info_complete: true,
          needs_changes: false 
        })
        .eq('id', product.id);

      if (error) throw error;

      alert('Product accepted successfully.');
      fetchProduct();
    } catch (error: unknown) {
      alert(`Action failed: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [product, fetchProduct]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'white' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  if (!product) return <div style={{ padding: '2rem', textAlign: 'center' }}>Product not found</div>;

  return (
    <div className="detail-page-container">
      <header className="detail-header">
        <button onClick={() => navigate('/products')} className="detail-back-btn">
          <ArrowLeft size={20} /> Back
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          {!isEditing && product.product_type === 'common' && !product.master_product_id && !product.is_info_complete && (
            <>
              <button 
                onClick={handleProductAlreadyAvailable}
                className="detail-action-btn danger"
              >
                <XCircle size={18} />
                Already Available (Delete)
              </button>
              <button 
                onClick={handleAcceptProduct}
                className="detail-action-btn success"
              >
                <CheckCircle2 size={18} />
                Accept Product
              </button>
            </>
          )}

          {id !== 'new' && (
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={`detail-action-btn ${isEditing ? 'danger' : 'primary'}`}
            >
              {isEditing ? <XCircle size={18} /> : <Edit2 size={16} />}
              {isEditing ? 'Close' : 'Edit Details'}
            </button>
          )}
        </div>
      </header>

      <main className="product-details-main">
        {/* Large Image Section */}
        <div className="product-details-hero-image">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} loading="lazy" decoding="async" className="product-details-img" />
          ) : (
            <div className="product-details-img-placeholder">
              <Package size={80} />
              <p>No Image Available</p>
            </div>
          )}

          {id !== 'new' && product.product_type !== 'personal' && (
            <label className="product-details-upload-btn">
              <input type="file" accept="image/*" onChange={handlePickImage} style={{ display: 'none' }} disabled={uploading} />
              {uploading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
              {product.image_url ? 'Change Photo' : 'Add Photo'}
            </label>
          )}

          {product.raw_image_url && (
            <div className="raw-image-badge" onClick={() => window.open(product.raw_image_url!, '_blank')}>
              <Camera size={14} />
              <span>Raw Image Available</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="product-details-content-overlay">
          {!isEditing ? (
            <>
              {/* View Mode */}
                <div className="product-details-title-row">
                  <h1 className="product-details-title">{String(product.name || 'Unknown Product')}</h1>
                  <span className="product-details-category-badge">{String(product.category || 'Uncategorized')}</span>
                </div>

                <div className="product-details-price-row">
                  <span className="product-details-price">₹{typeof product.price === 'number' ? product.price : parseFloat(String(product.price || 0)) || 0}</span>
                  {product.weight_kg !== null && (
                    <span className="product-details-weight"> • {typeof product.weight_kg === 'number' ? product.weight_kg : parseFloat(String(product.weight_kg || 0)) || 0} kg</span>
                  )}
                  <div className={`product-details-type-badge ${String(product.product_type || 'barcode')}`}>
                    {String(product.product_type || 'barcode')}
                  </div>
                </div>

              <div className="product-details-divider" />

              <div style={{ marginBottom: '2rem' }}>
                <h3 className="product-details-section-title">Description & Specs</h3>
                <div className="product-details-spec-list">
                  {descriptionPairs.filter(p => p && (p.title || p.text)).map((pair, idx) => (
                    <div key={idx} className="product-details-spec-item">
                      <span className="product-details-spec-title">
                        {pair.title || 'Info'}
                      </span>
                      <p className="product-details-spec-value">{String(pair.text || '')}</p>
                    </div>
                  ))}
                  {descriptionPairs.filter(p => p.title || p.text).length === 0 && (
                    <div className="product-details-spec-item">
                      <div className="product-details-spec-value" style={{ color: '#8E8E93' }}>No specifications provided</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h3 className="product-details-section-title">Search Tags</h3>
                <div className="product-details-spec-list">
                  <div className="product-details-spec-item">
                    <span className="product-details-spec-title">Synonyms</span>
                    <div className="product-details-spec-value">
                      <div className="product-details-option-values">
                        {Array.isArray(tags) && tags.length > 0 ? tags.map((tag, idx) => (
                          tag ? <span key={idx} className="option-value-chip">{tag}</span> : null
                        )) : <span style={{ color: '#8E8E93' }}>No tags defined</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h3 className="product-details-section-title">Product Options (Variants)</h3>
                <div className="product-details-spec-list">
                  {(() => {
                    const validOptions = Array.isArray(productOptions) ? productOptions.filter(opt => opt && opt.title) : [];
                    if (!productOptions || productOptions.filter(o => o.title?.trim() || (o.values && o.values.length > 0)).length === 0) {
                      return (
                        <div className="product-details-spec-item">
                          <div className="product-details-spec-value" style={{ color: '#8E8E93' }}>No variants available</div>
                        </div>
                      );
                    }
                    return validOptions.map((opt, idx) => (
                      <div key={idx} className="product-details-spec-item">
                        <span className="product-details-spec-title">{opt.title}</span>
                        <div className="product-details-spec-value">
                          <div className="product-details-option-values">
                            {Array.isArray(opt.values) && opt.values.map((v, vIdx) => {
                              const val = v as any;
                              const displayValue = typeof val === 'object' && val !== null 
                                ? `${val.value || 'N/A'}${val.price_adjustment ? ` (+₹${val.price_adjustment})` : ''}${val.weight_adjustment ? ` (+${val.weight_adjustment}kg)` : ''}`
                                : String(val);
                              return <span key={vIdx} className="option-value-chip">{displayValue}</span>;
                            })}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div className="product-details-divider" />

              <div style={{ marginBottom: '2rem' }}>
                <h3 className="product-details-section-title">Store</h3>
                {product.stores && (
                  <button 
                    onClick={() => navigate(`/stores/${product.stores!.id}`)}
                    className="product-details-store-link-inline"
                  >
                    {String(product.stores!.name || 'Unknown Store')}
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>

              {product.raw_image_url && (
                <div className="raw-image-section">
                  <h3 className="product-details-section-title">Raw Image (Submitted by Store)</h3>
                  <div className="raw-image-preview-container">
                    <img src={product.raw_image_url} alt="Raw product" className="raw-image-preview" />
                    <button 
                      className="raw-image-full-btn"
                      onClick={() => window.open(product.raw_image_url!, '_blank')}
                    >
                      View Full Size
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Edit Mode - Premium Business Style */}
              <div className="product-edit-form">
                <div className="card store-info-section-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                  <h2 className="product-edit-title" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Package size={24} />
                    {id === 'new' ? 'Create New Product' : 'Edit Product Information'}
                  </h2>
                  
                  <div className="product-edit-group">
                    <h3 className="product-edit-section-title-black">Basic Details</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="product-edit-group">
                        <label className="product-edit-label">Product Name</label>
                        <input 
                          value={name} 
                          onChange={e => setName(e.target.value)} 
                          className="product-edit-input" 
                          placeholder="Enter product name"
                        />
                      </div>

                      <div className="product-edit-grid" style={{ marginBottom: 0 }}>
                        <div>
                          <label className="product-edit-label">Product Type</label>
                          <select 
                            value={productType} 
                            onChange={e => setProductType(e.target.value as any)}
                            className="product-edit-input"
                            style={{ height: '48px' }}
                          >
                            <option value="barcode">Barcode (Global)</option>
                            <option value="common">Common (Shared)</option>
                            <option value="personal">Personal (Store Specific)</option>
                          </select>
                        </div>
                        {productType === 'barcode' && (
                          <div>
                            <label className="product-edit-label">Barcode</label>
                            <input 
                              value={barcode} 
                              onChange={e => setBarcode(e.target.value)} 
                              className="product-edit-input" 
                              placeholder="Scan or enter barcode"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="product-details-divider" />

                  <div className="product-edit-group">
                    <h3 className="product-edit-section-title-black">Classification & Pricing</h3>
                    <div className="product-edit-grid" style={{ marginBottom: '1rem' }}>
                      <div>
                        <label className="product-edit-label">Category</label>
                        <button 
                          onClick={() => setIsPickerVisible(true)}
                          className="product-edit-select-btn"
                        >
                          <span style={{ color: category ? '#1C1C1E' : '#999', fontWeight: 600 }}>{category || 'Select Category'}</span>
                          <ChevronRight size={18} color="var(--primary)" />
                        </button>
                      </div>
                      {id === 'new' && (
                        <div>
                          <label className="product-edit-label">Assign to Store</label>
                          <button 
                            onClick={() => setIsStorePickerVisible(true)}
                            className="product-edit-select-btn"
                          >
                            <span style={{ color: selectedStoreId ? '#1C1C1E' : '#999', fontWeight: 600 }}>
                              {selectedStoreId ? stores.find(s => s.id === selectedStoreId)?.name : 'Select Store'}
                            </span>
                            <ChevronRight size={18} color="var(--primary)" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="product-edit-grid">
                      <div>
                        <label className="product-edit-label">Price (₹)</label>
                        <input 
                          type="text"
                          inputMode="decimal"
                          value={price} 
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            if (val.split('.').length <= 2) setPrice(val);
                          }} 
                          className="product-edit-input" 
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="product-edit-label">Weight (kg)</label>
                        <input 
                          type="text"
                          inputMode="decimal"
                          value={weight} 
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            if (val.split('.').length <= 2) setWeight(val);
                          }} 
                          className="product-edit-input" 
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="product-details-divider" />

                  <div className="product-edit-group">
                    <h3 className="product-edit-section-title-black">Logistics</h3>
                    <div className="product-edit-group">
                      <label className="product-edit-label">Delivery Vehicle</label>
                      <div className="vehicle-selector">
                        <button 
                          className={`vehicle-btn ${deliveryVehicle === 'bike' ? 'active' : ''}`}
                          onClick={() => setDeliveryVehicle('bike')}
                        >
                          Bike
                        </button>
                        <button 
                          className={`vehicle-btn ${deliveryVehicle === 'truck' ? 'active' : ''}`}
                          onClick={() => setDeliveryVehicle('truck')}
                        >
                          Truck
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card store-info-section-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                  <div className="product-edit-specs-header">
                    <h3 className="product-details-section-title" style={{ marginBottom: 0 }}>Specifications</h3>
                    <button onClick={addSpecPair} className="product-edit-add-spec-btn">
                      <Plus size={24} />
                    </button>
                  </div>
                  <div className="product-details-spec-list" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
                    {Array.isArray(descriptionPairs) && descriptionPairs.map((pair, idx) => (
                      pair ? (
                        <div key={idx} className="product-edit-spec-item" style={{ border: '1px solid #E5E5EA', marginBottom: '12px', borderRadius: '12px' }}>
                          <div className="product-edit-spec-title-row">
                            <input 
                              placeholder="e.g. Material" value={String(pair.title || '')} 
                              onChange={e => updateSpecPair(idx, 'title', e.target.value)} 
                              className="product-edit-spec-title-input" 
                            />
                            <button onClick={() => removeSpecPair(idx)} className="product-edit-spec-delete-btn">
                              <Trash2 size={18} />
                            </button>
                          </div>
                          <div style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center' }}>
                            <textarea 
                              placeholder="Value..." value={String(pair.text || '')} 
                              onChange={e => updateSpecPair(idx, 'text', e.target.value)} 
                              className="product-edit-spec-value-textarea" 
                            />
                          </div>
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>

                <div className="card store-info-section-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                  <h3 className="product-details-section-title">Tags (Synonyms)</h3>
                  <div className="tag-input-wrapper" style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      placeholder="Add a search tag..." 
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (tagInput.trim()) {
                            setTags(prev => [...new Set([...(prev || []), tagInput.trim().toLowerCase()])]);
                            setTagInput('');
                          }
                        }
                      }}
                      className="product-edit-input" 
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        if (tagInput.trim()) {
                          setTags(prev => [...new Set([...(prev || []), tagInput.trim().toLowerCase()])]);
                          setTagInput('');
                        }
                      }}
                      className="detail-action-btn primary"
                      style={{ whiteSpace: 'nowrap', borderRadius: '12px' }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="product-details-option-values" style={{ marginTop: '1rem' }}>
                    {Array.isArray(tags) && tags.map((tag, idx) => (
                      tag ? (
                        <span key={idx} className="option-value-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e7f1ff', color: 'var(--primary)', borderColor: 'var(--primary)' }}>
                          {String(tag)}
                          <X 
                            size={14} 
                            style={{ cursor: 'pointer' }} 
                            onClick={() => setTags(prev => (prev || []).filter((_, i) => i !== idx))} 
                          />
                        </span>
                      ) : null
                    ))}
                  </div>
                </div>

                <div className="card store-info-section-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                  <div className="product-edit-specs-header">
                    <h3 className="product-details-section-title" style={{ marginBottom: 0 }}>Options & Variants</h3>
                    <button 
                      onClick={() => setProductOptions([...(productOptions || []), { title: '', values: [] }])} 
                      className="product-edit-add-spec-btn"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                  <div className="product-details-spec-list" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
                    {Array.isArray(productOptions) && productOptions.map((opt, idx) => (
                      opt ? (
                        <div key={idx} className="product-edit-spec-item" style={{ display: 'block', border: '1px solid #E5E5EA', marginBottom: '20px', borderRadius: '16px', overflow: 'hidden' }}>
                          <div className="product-edit-spec-title-row" style={{ width: '100%', padding: '12px 20px', borderBottom: '1px solid #E5E5EA' }}>
                            <input 
                              placeholder="Option Group Title (e.g. Size, Color)" 
                              value={String(opt.title || '')} 
                              onChange={e => {
                                 const newOptions = [...productOptions];
                                 newOptions[idx].title = e.target.value;
                                 setProductOptions(newOptions);
                              }} 
                              className="product-edit-spec-title-input" 
                              style={{ width: '100%', fontSize: '14px', color: '#000' }}
                            />
                            <button 
                              onClick={() => setProductOptions(productOptions.filter((_, i) => i !== idx))} 
                              className="product-edit-spec-delete-btn"
                              style={{ marginLeft: '12px' }}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                          <div style={{ padding: '16px' }}>
                            {Array.isArray(opt.values) && opt.values.map((v: any, vIdx: number) => (
                              <div key={vIdx} style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
                                {/* Option Value Box Container */}
                                <div style={{
                                  flex: 1,
                                  background: '#f8f9fa',
                                  border: '1px solid #e5e5ea',
                                  borderRadius: '12px',
                                  padding: '16px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '12px'
                                }}>
                                  {/* Value */}
                                  <div>
                                    <label style={{ fontSize: '10px', color: '#8E8E93', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Value</label>
                                    <input 
                                      placeholder="e.g. Medium" 
                                      value={typeof v === 'string' ? v : (v.value || '')} 
                                      onChange={e => {
                                        const newOptions = [...productOptions];
                                        const currentVal = typeof newOptions[idx].values[vIdx] === 'string' 
                                          ? { value: newOptions[idx].values[vIdx], price_adjustment: 0, weight_adjustment: 0 }
                                          : newOptions[idx].values[vIdx];
                                        newOptions[idx].values[vIdx] = { ...currentVal, value: e.target.value };
                                        setProductOptions(newOptions);
                                      }}
                                      className="product-edit-input"
                                      style={{ background: 'white', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                                    />
                                  </div>

                                  {/* Adjustments row: Price & Weight */}
                                  <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                      <label style={{ fontSize: '10px', color: '#8E8E93', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Extra Price (+₹)</label>
                                      <input 
                                        placeholder="0" 
                                        value={typeof v === 'string' ? '0' : (v.price_adjustment || '0')} 
                                        onChange={e => {
                                          const newOptions = [...productOptions];
                                          const currentVal = typeof newOptions[idx].values[vIdx] === 'string' 
                                            ? { value: newOptions[idx].values[vIdx], price_adjustment: 0, weight_adjustment: 0 }
                                            : newOptions[idx].values[vIdx];
                                          newOptions[idx].values[vIdx] = { ...currentVal, price_adjustment: parseFloat(e.target.value) || 0 };
                                          setProductOptions(newOptions);
                                        }}
                                        className="product-edit-input"
                                        type="number"
                                        style={{ background: 'white', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                                      />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <label style={{ fontSize: '10px', color: '#8E8E93', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Extra Weight (+kg)</label>
                                      <input 
                                        placeholder="0" 
                                        value={typeof v === 'string' ? '0' : (v.weight_adjustment || '0')} 
                                        onChange={e => {
                                          const newOptions = [...productOptions];
                                          const currentVal = typeof newOptions[idx].values[vIdx] === 'string' 
                                            ? { value: newOptions[idx].values[vIdx], price_adjustment: 0, weight_adjustment: 0 }
                                            : newOptions[idx].values[vIdx];
                                          newOptions[idx].values[vIdx] = { ...currentVal, weight_adjustment: parseFloat(e.target.value) || 0 };
                                          setProductOptions(newOptions);
                                        }}
                                        className="product-edit-input"
                                        type="number"
                                        step="any"
                                        style={{ background: 'white', padding: '10px', width: '100%', boxSizing: 'border-box' }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Delete Button on the Right */}
                                <button 
                                  onClick={() => {
                                    const newOptions = [...productOptions];
                                    newOptions[idx].values = newOptions[idx].values.filter((_: any, i: number) => i !== vIdx);
                                    setProductOptions(newOptions);
                                  }}
                                  style={{
                                    background: '#fff5f5',
                                    border: '1px solid #ffccd5',
                                    borderRadius: '12px',
                                    color: '#FF3B30',
                                    cursor: 'pointer',
                                    width: '44px',
                                    height: '44px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                  }}
                                  type="button"
                                >
                                  <X size={20} />
                                </button>
                              </div>
                            ))}
                            <button 
                              onClick={() => {
                                const newOptions = [...productOptions];
                                if (!Array.isArray(newOptions[idx].values)) newOptions[idx].values = [];
                                newOptions[idx].values.push({ value: '', price_adjustment: 0, weight_adjustment: 0 });
                                setProductOptions(newOptions);
                              }}
                              style={{ background: 'none', border: '1px dashed #D1D1D6', borderRadius: '12px', width: '100%', padding: '10px', color: 'var(--primary)', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                              type="button"
                            >
                              + Add Value
                            </button>
                          </div>
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="product-edit-actions" style={{ position: 'sticky', bottom: '1rem', background: 'rgba(255,255,255,0.95)', padding: '1rem', borderRadius: '20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
                  {productType === 'barcode' && id !== 'new' && (
                    <button 
                      onClick={handleWrongBarcode}
                      disabled={saving}
                      className="product-edit-action-btn danger"
                    >
                      <BarcodeIcon size={20} />
                      Wrong Barcode
                    </button>
                  )}
                  {product.product_type === 'common' && !product.master_product_id && (
                    <button 
                      onClick={handleProductAlreadyAvailable}
                      disabled={saving}
                      className="product-edit-action-btn danger"
                      style={{ flex: 1 }}
                    >
                      <XCircle size={20} />
                      Already Available
                    </button>
                  )}
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="product-edit-action-btn primary"
                    style={{ flex: 2 }}
                  >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                    {id === 'new' ? 'Create Product' : 'Save Changes'}
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
              className="modal-overlay"
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="modal-content"
              style={{ position: 'fixed', bottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
            >
              <div className="modal-header">
                <h3 className="modal-title">Select Category</h3>
                <button onClick={() => setIsPickerVisible(false)} className="modal-close-btn"><X size={24} /></button>
              </div>
              <div className="modal-body">
                {PRODUCT_CATEGORIES.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => { setCategory(cat); setIsPickerVisible(false); }}
                    className={`product-details-modal-list-item ${category === cat ? 'selected' : ''}`}
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

export default memo(ProductDetails);
