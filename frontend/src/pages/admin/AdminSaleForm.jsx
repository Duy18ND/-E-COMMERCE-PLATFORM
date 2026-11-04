import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import saleService from '../../services/saleService';
import { formatCurrency } from '../../utils/formatCurrency';
import useNotification from '../../hooks/useNotification';

const SAMPLE_BANNERS = [
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80'
];

const ALLOWED_BANNER_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_BANNER_EXT_REGEX = /\.(jpg|jpeg|png|webp)$/i;
const MAX_BANNER_SIZE = 5 * 1024 * 1024; // 5MB

const AdminSaleForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotification();
  const isEditing = Boolean(id);
  const bannerInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [bannerError, setBannerError] = useState('');
  const [hasCustomBanner, setHasCustomBanner] = useState(false);

  const [allAvailableProducts, setAllAvailableProducts] = useState(() =>
    saleService.getAllProductsSync()
  );

  useEffect(() => {
    let active = true;
    saleService.getCatalogProductsForAdmin().then((list) => {
      if (active && Array.isArray(list) && list.length > 0) {
        setAllAvailableProducts(list);
        if (!isEditing) {
          setSelectedProducts(
            list.slice(0, 3).map((prod) => ({
              productId: prod.id,
              name: prod.shortName || prod.name,
              sku: prod.sku || `SKU-${prod.id}`,
              originalPrice: prod.price,
              salePrice: prod.salePrice || Math.max(1, Math.round(prod.price * 0.75)),
              quota: Math.max(1, Math.min(20, prod.stock || 10)),
              imageUrl: prod.imageUrl
            }))
          );
        }
      }
    });
    return () => {
      active = false;
    };
  }, [isEditing]);

  // Form State
  const [formData, setFormData] = useState({
    name: 'Flash Sale Giữa Tháng - Siêu Phẩm Công Nghệ',
    description: 'Săn deal công nghệ độc quyền giữa tháng. Giảm đến 40% cho số lượng có hạn, áp dụng đến khi hết suất!',
    bannerUrl: SAMPLE_BANNERS[0],
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 3600000 * 24).toISOString().slice(0, 16),
    userLimit: 2,
    status: 'ACTIVE',
    badgeText: '-40%',
    categoryTag: 'Công nghệ & Phụ kiện'
  });

  // Selected products state with their sale prices
  const [selectedProducts, setSelectedProducts] = useState([
    {
      productId: 'fs-1',
      name: 'MacBook Pro 14 M3 Pro',
      sku: 'MB-14-M3PRO-BLK',
      originalPrice: 49990000,
      salePrice: 32490000,
      quota: 100,
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80'
    },
    {
      productId: 'fs-3',
      name: 'Tai nghe Sony WH-1000XM5',
      sku: 'SNY-WH-XM5-SLV',
      originalPrice: 7990000,
      salePrice: 5990000,
      quota: 80,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80'
    },
    {
      productId: 'fs-2',
      name: 'iPhone 15 Pro Max 256GB',
      sku: 'AP-IP15PM-256NT',
      originalPrice: 34990000,
      salePrice: 27990000,
      quota: 100,
      imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=300&q=80'
    }
  ]);

  // Preview Mode: 'mobile' or 'desktop'
  const [previewDevice, setPreviewDevice] = useState('mobile');

  // Product table search & filter
  const [prodSearch, setProdSearch] = useState('');
  const [prodCategory, setProdCategory] = useState('ALL');

  // Load existing campaign if editing
  useEffect(() => {
    let active = true;
    if (isEditing) {
      saleService.getCampaignById(id).then((existing) => {
        if (active && existing) {
          setFormData({
            name: existing.name || '',
            description: existing.description || '',
            bannerUrl: existing.bannerUrl || SAMPLE_BANNERS[0],
            startTime: existing.startTime ? String(existing.startTime).slice(0, 16) : '',
            endTime: existing.endTime ? String(existing.endTime).slice(0, 16) : '',
            userLimit: existing.userLimit || 2,
            status: existing.status || 'ACTIVE',
            badgeText: existing.badgeText || '-35%',
            categoryTag: existing.categoryTag || 'Công nghệ'
          });
          if (Array.isArray(existing.customProducts) && existing.customProducts.length > 0) {
            setSelectedProducts(existing.customProducts);
          }
        }
      });
    }
    return () => {
      active = false;
    };
  }, [id, isEditing]);

  // Calculate estimated discount budget
  const estimatedDiscountBudget = useMemo(() => {
    return selectedProducts.reduce((sum, item) => {
      const discountPerItem = Math.max(0, item.originalPrice - item.salePrice);
      return sum + discountPerItem * (item.quota || 1);
    }, 0);
  }, [selectedProducts]);

  // Handle form field change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  // Handle Banner file upload from computer
  const handleBannerFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isValidType =
      ALLOWED_BANNER_TYPES.includes(file.type) || ALLOWED_BANNER_EXT_REGEX.test(file.name || '');
    if (!isValidType) {
      setBannerError('Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPG, JPEG, PNG hoặc WEBP.');
      if (bannerInputRef.current) bannerInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_BANNER_SIZE) {
      setBannerError('Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn 5MB.');
      if (bannerInputRef.current) bannerInputRef.current.value = '';
      return;
    }

    setBannerError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev) => ({ ...prev, bannerUrl: reader.result }));
        setHasCustomBanner(true);
      }
    };
    reader.onerror = () => {
      setBannerError('Không thể đọc file ảnh. Vui lòng thử lại.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBanner = () => {
    setBannerError('');
    setHasCustomBanner(false);
    setFormData((prev) => ({ ...prev, bannerUrl: SAMPLE_BANNERS[0] }));
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  // Toggle product selection in table
  const handleToggleProduct = (prod) => {
    const exists = selectedProducts.some((p) => p.productId === prod.id);
    if (exists) {
      setSelectedProducts(selectedProducts.filter((p) => p.productId !== prod.id));
    } else {
      setSelectedProducts([
        ...selectedProducts,
        {
          productId: prod.id,
          name: prod.shortName || prod.name,
          sku: prod.sku || `SKU-${prod.id}`,
          originalPrice: prod.price,
          salePrice: prod.salePrice || Math.max(1, Math.round(prod.price * 0.7)),
          quota: Math.max(1, prod.stock || 50),
          imageUrl: prod.imageUrl
        }
      ]);
      setFieldErrors((prev) => {
        if (!prev.products) return prev;
        const next = { ...prev };
        delete next.products;
        return next;
      });
    }
  };

  // Change sale price of a selected product
  const handlePriceChange = (prodId, newSalePrice) => {
    const val = newSalePrice === '' ? '' : Number(newSalePrice);
    setSelectedProducts((prev) =>
      prev.map((item) => (item.productId === prodId ? { ...item, salePrice: val } : item))
    );
    setFieldErrors((prev) => {
      if (!prev.productItems?.[prodId]?.salePrice) return prev;
      const nextItems = { ...(prev.productItems || {}) };
      nextItems[prodId] = { ...nextItems[prodId], salePrice: undefined };
      return { ...prev, productItems: nextItems };
    });
  };

  // Change quota (quantity) of a selected product
  const handleQuotaChange = (prodId, newQuota) => {
    const val = newQuota === '' ? '' : Number(newQuota);
    setSelectedProducts((prev) =>
      prev.map((item) => (item.productId === prodId ? { ...item, quota: val } : item))
    );
    setFieldErrors((prev) => {
      if (!prev.productItems?.[prodId]?.quota) return prev;
      const nextItems = { ...(prev.productItems || {}) };
      nextItems[prodId] = { ...nextItems[prodId], quota: undefined };
      return { ...prev, productItems: nextItems };
    });
  };

  // Validate entire campaign form
  const validateCampaignForm = () => {
    const errors = {};
    const productItems = {};

    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Tên chiến dịch Flash Sale không được để trống.';
    }

    if (!formData.startTime) {
      errors.startTime = 'Vui lòng chọn thời điểm bắt đầu chiến dịch.';
    }

    if (!formData.endTime) {
      errors.endTime = 'Vui lòng chọn thời điểm kết thúc chiến dịch.';
    }

    if (formData.startTime && formData.endTime) {
      const startMs = new Date(formData.startTime).getTime();
      const endMs = new Date(formData.endTime).getTime();
      const nowMs = Date.now();

      if (Number.isNaN(startMs)) {
        errors.startTime = 'Thời điểm bắt đầu không hợp lệ.';
      }
      if (Number.isNaN(endMs)) {
        errors.endTime = 'Thời điểm kết thúc không hợp lệ.';
      }
      if (!Number.isNaN(startMs) && !Number.isNaN(endMs)) {
        if (startMs >= endMs) {
          errors.endTime = 'Thời điểm kết thúc phải lớn hơn thời điểm bắt đầu.';
        } else if (endMs <= nowMs) {
          errors.endTime = 'Thời điểm kết thúc không được nằm trong quá khứ.';
        }
      }
    }

    const parsedUserLimit = Number(formData.userLimit);
    if (
      formData.userLimit === '' ||
      !Number.isFinite(parsedUserLimit) ||
      !Number.isInteger(parsedUserLimit) ||
      parsedUserLimit < 1
    ) {
      errors.userLimit = 'Giới hạn mua phải là số nguyên dương (>= 1).';
    }

    if (!Array.isArray(selectedProducts) || selectedProducts.length === 0) {
      errors.products = 'Phải chọn ít nhất 1 sản phẩm tham gia chiến dịch Flash Sale.';
    } else {
      for (const item of selectedProducts) {
        const itemErr = {};
        const origPrice = Number(item.originalPrice ?? 0);
        const salePrice = Number(item.salePrice);
        const quota = Number(item.quota);

        if (item.salePrice === '' || !Number.isFinite(salePrice) || salePrice <= 0) {
          itemErr.salePrice = 'Giá Flash Sale phải lớn hơn 0.';
        } else if (origPrice > 0 && salePrice >= origPrice) {
          itemErr.salePrice = `Giá Flash Sale phải nhỏ hơn giá gốc (${formatCurrency(origPrice)}).`;
        }

        if (
          item.quota === '' ||
          !Number.isFinite(quota) ||
          !Number.isInteger(quota) ||
          quota < 1
        ) {
          itemErr.quota = 'Số lượng Flash Sale phải là số nguyên dương (>= 1).';
        }

        if (Object.keys(itemErr).length > 0) {
          productItems[item.productId] = itemErr;
        }
      }

      if (Object.keys(productItems).length > 0) {
        errors.productItems = productItems;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save campaign
  const handleSave = async (publishStatus) => {
    if (saving) return;

    if (!validateCampaignForm()) {
      notify.warning('Vui lòng kiểm tra và sửa các trường dữ liệu không hợp lệ trên biểu mẫu!');
      return;
    }

    const normalizedProducts = selectedProducts.map((p) => ({
      ...p,
      salePrice: Number(p.salePrice),
      quota: Math.max(1, Number(p.quota))
    }));

    const payload = {
      ...formData,
      userLimit: Math.max(1, Number(formData.userLimit)),
      status: publishStatus || formData.status,
      productIds: normalizedProducts.map((p) => p.productId),
      productCount: normalizedProducts.length,
      customProducts: normalizedProducts
    };

    setSaving(true);
    try {
      if (isEditing) {
        await saleService.updateCampaign(id, payload);
        notify.success(`Đã cập nhật chiến dịch Flash Sale "${formData.name}" thành công!`);
      } else {
        await saleService.createCampaign(payload);
        notify.success(`Đã tạo mới và kích hoạt chiến dịch "${formData.name}" thành công!`);
      }
      navigate('/admin/sales');
    } catch (err) {
      const errMsg =
        err?.response?.data?.message ||
        (err?.response?.data?.errors && Object.values(err.response.data.errors).join('; ')) ||
        err?.message ||
        'Không thể lưu chiến dịch Flash Sale';
      notify.error(`Lỗi: ${errMsg}`);
    } finally {
      setSaving(false);
    }
  };

  // Filter products in selection table
  const displayableCatalog = useMemo(() => {
    return allAvailableProducts.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(prodSearch.toLowerCase().trim()) ||
        (p.sku && p.sku.toLowerCase().includes(prodSearch.toLowerCase().trim()));
      const matchCat = prodCategory === 'ALL' ? true : p.category === prodCategory;
      return matchSearch && matchCat;
    });
  }, [allAvailableProducts, prodSearch, prodCategory]);

  return (
    <div>
      {/* Top Breadcrumb & Title */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Link to="/admin/sales" style={{ color: '#2563eb', fontWeight: 600 }}>Quản lý Sale</Link>
          <span>›</span>
          <span>{isEditing ? 'Chỉnh sửa chương trình' : 'Tạo chương trình mới'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              {isEditing ? 'Chỉnh sửa chương trình Flash Sale' : 'Thiết lập chương trình Flash Sale'}
            </h1>
            <span
              style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.725rem',
                fontWeight: 800,
                border: '1px solid #fecaca'
              }}
            >
              ● LIVE SESSION
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => notify.info('Nhật ký cấu hình: Phiên tạo bởi Quản trị viên lúc 09:00.')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.5rem 0.85rem',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ⏱️ Nhật ký cấu hình
            </button>
            <button
              type="button"
              onClick={() => notify.info('Hướng dẫn định giá: Mức giảm từ 20% - 50% mang lại hiệu quả chuyển đổi cao nhất.')}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.5rem 0.85rem',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ❓ Hướng dẫn định giá
            </button>
          </div>
        </div>
      </div>

      {/* 2-COLUMN SPLIT LAYOUT (FORM TRÊN TRÁI, LIVE PREVIEW BÊN PHẢI NHƯ ẢNH MẪU 5) */}
      <div
        className="layout-split"
        style={{
          alignItems: 'start'
        }}
      >
        {/* ========================================================
            LEFT COLUMN: THE CONFIGURATION FORM
           ======================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* SECTION 1: Thông tin chung & Thời gian áp dụng */}
          <div className="card" style={{ padding: 'clamp(1rem, 2.5vw, 1.75rem)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.9rem'
                  }}
                >
                  1.
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Thông tin chung & Thời gian áp dụng
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Thiết lập bộ nhận diện và mốc thời gian kích hoạt giờ vàng
                  </div>
                </div>
              </div>

              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>
                STEP 01/02
              </span>
            </div>

            {/* Campaign Name */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: '#0f172a' }}>
                <label>Tên chiến dịch Flash Sale <span style={{ color: '#dc2626' }}>*</span></label>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 400 }}>
                  {formData.name.length}/80 ký tự
                </span>
              </div>
              <input
                type="text"
                name="name"
                maxLength={80}
                value={formData.name}
                onChange={handleChange}
                placeholder="VD: Flash Sale Giữa Tháng - Siêu Phẩm Công Nghệ"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: fieldErrors.name ? '1.5px solid #dc2626' : '1.5px solid #cbd5e1',
                  fontSize: '0.925rem',
                  outline: 'none',
                  backgroundColor: fieldErrors.name ? '#fef2f2' : '#ffffff'
                }}
              />
              {fieldErrors.name && (
                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, marginTop: '0.35rem' }}>
                  ⚠️ {fieldErrors.name}
                </div>
              )}
            </div>

            {/* Banner Selection / Upload */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: '#0f172a' }}>
                Banner quảng bá chiến dịch (Tỷ lệ 16:9 hoặc 21:9)
              </label>

              <input
                ref={bannerInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleBannerFileChange}
                style={{ display: 'none' }}
              />

              <div className="form-grid-2" style={{ alignItems: 'center' }}>
                {/* Upload from computer / preset box */}
                <div
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '1rem',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}
                >
                  <span style={{ fontSize: '1.4rem', display: 'block' }}>☁️</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #bfdbfe',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      📁 {hasCustomBanner ? 'Thay ảnh' : 'Chọn ảnh từ máy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBannerError('');
                        setHasCustomBanner(false);
                        const next = SAMPLE_BANNERS[(SAMPLE_BANNERS.indexOf(formData.bannerUrl) + 1) % SAMPLE_BANNERS.length];
                        setFormData((prev) => ({ ...prev, bannerUrl: next }));
                      }}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#475569',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      🔄 Đổi banner mẫu
                    </button>
                    {hasCustomBanner && (
                      <button
                        type="button"
                        onClick={handleRemoveBanner}
                        style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid #fecaca',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        🗑️ Xóa ảnh
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    Hỗ trợ JPG, JPEG, PNG, WEBP (Tối đa 5MB) • Khuyến nghị 1920x600px
                  </div>
                </div>

                {/* Banner Thumbnail Preview */}
                <div
                  style={{
                    height: '104px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#0f172a'
                  }}
                >
                  <img
                    src={formData.bannerUrl}
                    alt="Banner Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '6px',
                      backgroundColor: 'rgba(0,0,0,0.65)',
                      color: '#fff',
                      fontSize: '0.65rem',
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    {hasCustomBanner ? 'Ảnh tải lên từ máy' : 'Tỉ lệ chuẩn'}
                  </span>
                </div>
              </div>
              {bannerError && (
                <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, marginTop: '0.35rem' }}>
                  ⚠️ {bannerError}
                </div>
              )}
            </div>

            {/* Mô tả chiến dịch */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: '#0f172a' }}>
                Mô tả chiến dịch
              </label>
              <textarea
                name="description"
                rows={2}
                value={formData.description}
                onChange={handleChange}
                placeholder="Nhập thông điệp truyền thông, điều kiện áp dụng..."
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.875rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Start and End Times */}
            <div className="form-grid-2" style={{ marginBottom: '1.25rem', alignItems: 'start' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>
                  🕒 Thời điểm bắt đầu <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: fieldErrors.startTime ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                    backgroundColor: fieldErrors.startTime ? '#fef2f2' : '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
                {fieldErrors.startTime && (
                  <div style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 600, marginTop: '0.3rem' }}>
                    ⚠️ {fieldErrors.startTime}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>
                  🚩 Thời điểm kết thúc <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    border: fieldErrors.endTime ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                    backgroundColor: fieldErrors.endTime ? '#fef2f2' : '#ffffff',
                    fontSize: '0.85rem'
                  }}
                />
                {fieldErrors.endTime && (
                  <div style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 600, marginTop: '0.3rem' }}>
                    ⚠️ {fieldErrors.endTime}
                  </div>
                )}
              </div>
            </div>

            {/* Giới hạn mua & Trạng thái công bố */}
            <div className="form-grid-2" style={{ alignItems: 'start' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>
                  👥 Giới hạn mua / khách hàng <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    name="userLimit"
                    min={1}
                    max={100}
                    value={formData.userLimit}
                    onChange={handleChange}
                    style={{
                      width: '72px',
                      padding: '0.55rem',
                      borderRadius: '8px',
                      border: fieldErrors.userLimit ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                      backgroundColor: fieldErrors.userLimit ? '#fef2f2' : '#ffffff',
                      textAlign: 'center',
                      fontWeight: 700
                    }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>sản phẩm / tài khoản</span>
                </div>
                {fieldErrors.userLimit && (
                  <div style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 600, marginTop: '0.3rem' }}>
                    ⚠️ {fieldErrors.userLimit}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>
                  Trạng thái công bố
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {['ACTIVE', 'UPCOMING', 'PAUSED', 'ENDED'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, status: st }))}
                      style={{
                        padding: '0.45rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.775rem',
                        fontWeight: 700,
                        border: formData.status === st ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: formData.status === st ? '#eff6ff' : '#ffffff',
                        color: formData.status === st ? '#1d4ed8' : '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      ● {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Danh sách sản phẩm & Phân bổ suất Flash Sale */}
          <div className="card" style={{ padding: 'clamp(1rem, 2.5vw, 1.75rem)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem'
                  }}
                >
                  %
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Danh sách sản phẩm & Phân bổ suất Flash Sale
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Chỉnh sửa trực tiếp đơn giá đặc biệt và số lượng suất dành riêng cho deal
                  </div>
                </div>
              </div>

              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>
                Đã chọn: {selectedProducts.length} sản phẩm
              </span>
            </div>

            {fieldErrors.products && (
              <div
                style={{
                  padding: '0.65rem 0.9rem',
                  marginBottom: '1rem',
                  borderRadius: '8px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}
              >
                ⚠️ {fieldErrors.products}
              </div>
            )}

            {/* Table Search & Filter Toolbar */}
            <div className="form-grid-2" style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Tìm tên thiết bị, mã SKU hoặc Barcode..."
                value={prodSearch}
                onChange={(e) => setProdSearch(e.target.value)}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem'
                }}
              />

              <select
                value={prodCategory}
                onChange={(e) => setProdCategory(e.target.value)}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="ALL">Tất cả Danh mục</option>
                <option value="Điện thoại & Tablet">Điện thoại & Tablet</option>
                <option value="Laptop & Mac">Laptop & Mac</option>
                <option value="Phụ kiện & Âm thanh">Phụ kiện & Âm thanh</option>
                <option value="Smart Living">Smart Living</option>
                <option value="Thời trang & Phụ kiện">Thời trang & Phụ kiện</option>
              </select>
            </div>

            {/* Products Selection Table */}
            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>Chọn</th>
                    <th>SẢN PHẨM & SKU</th>
                    <th>GIÁ GỐC (VNĐ)</th>
                    <th>GIÁ FLASH SALE (VNĐ)</th>
                    <th>SỐ LƯỢNG SALE (SUẤT)</th>
                    <th style={{ textAlign: 'center' }}>% GIẢM</th>
                  </tr>
                </thead>
                <tbody>
                  {displayableCatalog.map((prod) => {
                    const selectedItem = selectedProducts.find((p) => p.productId === prod.id);
                    const isSelected = Boolean(selectedItem);
                    const salePrice = selectedItem
                      ? selectedItem.salePrice
                      : (prod.salePrice || Math.round(prod.price * 0.7));
                    const quota = selectedItem ? selectedItem.quota : Math.max(1, prod.stock || 50);
                    const numericSalePrice = Number(salePrice) || 0;
                    const discount =
                      prod.price > 0 && prod.price > numericSalePrice && numericSalePrice > 0
                        ? Math.round(((prod.price - numericSalePrice) / prod.price) * 100)
                        : 0;
                    const rowErrors = fieldErrors.productItems?.[prod.id] || {};

                    return (
                      <tr key={prod.id} style={{ backgroundColor: isSelected ? '#fef2f2' : undefined }}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleProduct(prod)}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#f1f5f9', flexShrink: 0 }}>
                              <img src={prod.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                                {prod.shortName || prod.name}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                SKU: {prod.sku || `SKU-${prod.id}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {formatCurrency(prod.price)}
                        </td>
                        <td>
                          {isSelected ? (
                            <div>
                              <input
                                type="number"
                                min={1}
                                value={salePrice}
                                onChange={(e) => handlePriceChange(prod.id, e.target.value)}
                                style={{
                                  width: '125px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  border: rowErrors.salePrice ? '1.5px solid #dc2626' : '1.5px solid #ef4444',
                                  backgroundColor: rowErrors.salePrice ? '#fff1f2' : '#ffffff',
                                  color: '#dc2626',
                                  fontWeight: 800,
                                  fontSize: '0.85rem',
                                  outline: 'none'
                                }}
                              />
                              {rowErrors.salePrice && (
                                <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600, marginTop: '2px', maxWidth: '175px' }}>
                                  {rowErrors.salePrice}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                              {formatCurrency(salePrice)}
                            </span>
                          )}
                        </td>
                        <td>
                          {isSelected ? (
                            <div>
                              <input
                                type="number"
                                min={1}
                                step={1}
                                value={quota}
                                onChange={(e) => handleQuotaChange(prod.id, e.target.value)}
                                style={{
                                  width: '85px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  border: rowErrors.quota ? '1.5px solid #dc2626' : '1.5px solid #cbd5e1',
                                  backgroundColor: rowErrors.quota ? '#fff1f2' : '#ffffff',
                                  color: '#0f172a',
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                  textAlign: 'center',
                                  outline: 'none'
                                }}
                              />
                              {rowErrors.quota && (
                                <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600, marginTop: '2px', maxWidth: '150px' }}>
                                  {rowErrors.quota}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                              {quota} suất
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: 800,
                              color: '#ffffff',
                              backgroundColor: discount > 0 ? '#dc2626' : '#94a3b8',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}
                          >
                            -{discount}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Estimated Budget Summary Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '1rem',
                marginTop: '1rem',
                borderTop: '1px solid #f1f5f9',
                fontSize: '0.85rem',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}
            >
              <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626', display: 'inline-block' }} />
                <span>
                  Tổng ngân sách trợ giá giảm ước tính:{' '}
                  <strong style={{ color: '#dc2626', fontSize: '0.95rem' }}>
                    {formatCurrency(estimatedDiscountBudget)}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => notify.success('Đã đồng bộ toàn bộ kho sản phẩm ShopMart vào danh sách chọn!')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.825rem'
                }}
              >
                + Thêm sản phẩm từ kho
              </button>
            </div>
          </div>

          {/* FORM FOOTER ACTIONS */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={saving}
              onClick={() => navigate('/admin/sales')}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              Hủy bỏ
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('UPCOMING')}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid #bfdbfe',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Đang lưu...' : 'Lưu lịch chờ (Upcoming)'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(formData.status)}
              style={{
                padding: '0.75rem 1.85rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                opacity: saving ? 0.7 : 1
              }}
            >
              <span>🚀</span>
              <span>{saving ? 'Đang xử lý...' : 'Kích hoạt & Lưu chương trình'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN: REAL-TIME INTERACTIVE LIVE PREVIEW
            (SMARTPHONE MOCKUP THEO ĐÚNG ẢNH MẪU 5)
           ======================================================== */}
        <div style={{ position: 'sticky', top: '85px' }}>
          {/* Preview Header & Device Selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.925rem', fontWeight: 800, color: '#0f172a' }}>
              <span>👁️</span>
              <span>Xem trước hiển thị Khách Hàng</span>
            </div>

            <div style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: '8px', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: previewDevice === 'mobile' ? '#ffffff' : 'transparent',
                  color: previewDevice === 'mobile' ? '#2563eb' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                App / Mobile
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: previewDevice === 'desktop' ? '#ffffff' : 'transparent',
                  color: previewDevice === 'desktop' ? '#2563eb' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                Desktop Web
              </button>
            </div>
          </div>

          {/* SMARTPHONE FRAME CONTAINER */}
          <div
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '36px',
              padding: '12px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
              maxWidth: previewDevice === 'mobile' ? '360px' : '100%',
              margin: '0 auto',
              border: '4px solid #334155'
            }}
          >
            {/* Phone Screen */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '26px',
                overflow: 'hidden',
                minHeight: '560px',
                maxHeight: '620px',
                overflowY: 'auto'
              }}
            >
              {/* Phone Status Bar */}
              <div
                style={{
                  padding: '8px 16px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  backgroundColor: '#ffffff'
                }}
              >
                <span>09:41</span>
                {/* Dynamic Island / Notch */}
                <div style={{ width: '80px', height: '14px', backgroundColor: '#0f172a', borderRadius: '9999px' }} />
                <span>📶 🔋</span>
              </div>

              {/* App Bar */}
              <div
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#ffffff',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                  <span>←</span>
                  <span>ShopMart Deals</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#64748b', fontSize: '0.85rem' }}>
                  <span>🔗</span>
                  <span>🛍️</span>
                </div>
              </div>

              {/* Mobile Hero Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #dc2626 100%)',
                  padding: '1rem',
                  color: '#ffffff'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 700, opacity: 0.9, textTransform: 'uppercase', marginBottom: '4px' }}>
                  <span>⚡ GIỜ VÀNG GIÁ SỐC</span>
                  <span>Chỉ 12 giờ duy nhất</span>
                </div>

                <div style={{ fontSize: '1rem', fontWeight: 900, lineHeight: 1.25, marginBottom: '0.5rem' }}>
                  {formData.name || 'Flash Sale Giữa Tháng - Siêu Phẩm Công Nghệ'}
                </div>

                {/* Mobile Countdown Box */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem' }}>
                  <span style={{ opacity: 0.9 }}>Kết thúc trong:</span>
                  <span style={{ backgroundColor: '#450a0a', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>03</span>
                  <span>:</span>
                  <span style={{ backgroundColor: '#450a0a', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>42</span>
                  <span>:</span>
                  <span style={{ backgroundColor: '#450a0a', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>19</span>
                </div>
              </div>

              {/* Mobile Products List */}
              <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {selectedProducts.map((item) => {
                  const discount = Math.round(((item.originalPrice - item.salePrice) / item.originalPrice) * 100);

                  return (
                    <div
                      key={item.productId}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        padding: '0.65rem',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.65rem' }}>
                        {/* Img with badge */}
                        <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', position: 'relative', flexShrink: 0, backgroundColor: '#f1f5f9' }}>
                          <span
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: '2px',
                              backgroundColor: '#dc2626',
                              color: '#fff',
                              fontSize: '0.55rem',
                              fontWeight: 800,
                              padding: '1px 4px',
                              borderRadius: '3px'
                            }}
                          >
                            -{discount}%
                          </span>
                          <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>

                        {/* Text info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                            {formatCurrency(item.originalPrice)}
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#dc2626' }}>
                            {formatCurrency(item.salePrice)}
                          </div>
                        </div>
                      </div>

                      {/* Buy button */}
                      <button
                        type="button"
                        style={{
                          width: '100%',
                          backgroundColor: '#dc2626',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '5px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px'
                        }}
                      >
                        <span>⚡</span>
                        <span>Mua ngay giá Sale</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Conversion Tip Card (Theo đúng ảnh mẫu 5) */}
          <div
            style={{
              marginTop: '1.25rem',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              padding: '1rem 1.15rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}
          >
            <span style={{ fontSize: '1.25rem', color: '#2563eb' }}>💡</span>
            <div>
              <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#1e40af', marginBottom: '2px' }}>
                Mẹo tăng tỷ lệ chốt đơn (Conversion Rate)
              </div>
              <p style={{ fontSize: '0.75rem', color: '#1d4ed8', margin: 0, lineHeight: 1.45 }}>
                Khung giờ <strong>12:00 – 14:00</strong> và <strong>20:00 – 22:00</strong> đạt lượng tương tác cao hơn 3.2 lần. Nên áp dụng mức chiết khấu trên 20% cho các sản phẩm Hero như iPhone hoặc MacBook để tạo hiệu ứng đám đông.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSaleForm;
