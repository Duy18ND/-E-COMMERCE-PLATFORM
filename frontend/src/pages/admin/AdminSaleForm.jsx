import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import saleService from '../../services/saleService';
import { formatCurrency } from '../../utils/formatCurrency';

const SAMPLE_BANNERS = [
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80'
];

const AdminSaleForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const allAvailableProducts = useMemo(() => saleService.getAllProducts(), []);

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
    if (isEditing) {
      const existing = saleService.getCampaignById(id);
      if (existing) {
        setFormData({
          name: existing.name || '',
          description: existing.description || '',
          bannerUrl: existing.bannerUrl || SAMPLE_BANNERS[0],
          startTime: existing.startTime ? new Date(existing.startTime).toISOString().slice(0, 16) : '',
          endTime: existing.endTime ? new Date(existing.endTime).toISOString().slice(0, 16) : '',
          userLimit: existing.userLimit || 2,
          status: existing.status || 'ACTIVE',
          badgeText: existing.badgeText || '-35%',
          categoryTag: existing.categoryTag || 'Công nghệ'
        });
      }
    }
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
          salePrice: prod.salePrice || Math.round(prod.price * 0.7),
          quota: prod.stock || 50,
          imageUrl: prod.imageUrl
        }
      ]);
    }
  };

  // Change sale price of a selected product
  const handlePriceChange = (prodId, newSalePrice) => {
    const val = Number(newSalePrice) || 0;
    setSelectedProducts((prev) =>
      prev.map((item) => (item.productId === prodId ? { ...item, salePrice: val } : item))
    );
  };

  // Save campaign
  const handleSave = (publishStatus) => {
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên chiến dịch Flash Sale!');
      return;
    }

    if (selectedProducts.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm tham gia chương trình Flash Sale!');
      return;
    }

    const payload = {
      ...formData,
      status: publishStatus || formData.status,
      productIds: selectedProducts.map((p) => p.productId),
      productCount: selectedProducts.length,
      customProducts: selectedProducts
    };

    if (isEditing) {
      saleService.updateCampaign(id, payload);
      alert(`Đã cập nhật chiến dịch Flash Sale "${formData.name}" thành công!`);
    } else {
      saleService.createCampaign(payload);
      alert(`Đã tạo mới và kích hoạt chiến dịch "${formData.name}" thành công!`);
    }

    navigate('/admin/sales');
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
              onClick={() => alert('Nhật ký cấu hình: Phiên tạo bởi Quản trị viên lúc 09:00.')}
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
              onClick={() => alert('Hướng dẫn định giá: Mức giảm từ 20% - 50% mang lại hiệu quả chuyển đổi cao nhất.')}
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
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.925rem',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            {/* Banner Selection / Upload */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: '#0f172a' }}>
                Banner quảng bá chiến dịch (Tỷ lệ 16:9 hoặc 21:9)
              </label>

              <div className="form-grid-2" style={{ alignItems: 'center' }}>
                {/* Drag / preset box */}
                <div
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '1.25rem 1rem',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    const next = SAMPLE_BANNERS[(SAMPLE_BANNERS.indexOf(formData.bannerUrl) + 1) % SAMPLE_BANNERS.length];
                    setFormData((prev) => ({ ...prev, bannerUrl: next }));
                  }}
                >
                  <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '4px' }}>☁️</span>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#2563eb' }}>
                    Kéo thả hoặc Bấm đổi banner mẫu
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                    Khuyến nghị: 1920x600px PNG, JPG, WebP
                  </div>
                </div>

                {/* Banner Thumbnail Preview */}
                <div
                  style={{
                    height: '92px',
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
                    Tỉ lệ chuẩn
                  </span>
                </div>
              </div>
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
            <div className="form-grid-2" style={{ marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>
                  🕒 Thời điểm bắt đầu
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
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>
                  🚩 Thời điểm kết thúc
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
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            {/* Giới hạn mua & Trạng thái công bố */}
            <div className="form-grid-2" style={{ alignItems: 'center' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>
                  👥 Giới hạn mua / khách hàng
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    name="userLimit"
                    min={1}
                    max={10}
                    value={formData.userLimit}
                    onChange={handleChange}
                    style={{
                      width: '64px',
                      padding: '0.55rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      textAlign: 'center',
                      fontWeight: 700
                    }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>sản phẩm / tài khoản</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>
                  Trạng thái công bố
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {['ACTIVE', 'UPCOMING', 'DRAFT'].map((st) => (
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
                    Chỉnh sửa trực tiếp đơn giá đặc biệt và tồn kho dành riêng cho deal
                  </div>
                </div>
              </div>

              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>
                Đã chọn: {selectedProducts.length} sản phẩm
              </span>
            </div>

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
            <div className="table-responsive" style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>Chọn</th>
                    <th>SẢN PHẨM & SKU</th>
                    <th>GIÁ GỐC (VNĐ)</th>
                    <th>GIÁ FLASH SALE (VNĐ)</th>
                    <th style={{ textAlign: 'center' }}>% GIẢM</th>
                  </tr>
                </thead>
                <tbody>
                  {displayableCatalog.map((prod) => {
                    const selectedItem = selectedProducts.find((p) => p.productId === prod.id);
                    const isSelected = Boolean(selectedItem);
                    const salePrice = selectedItem ? selectedItem.salePrice : (prod.salePrice || Math.round(prod.price * 0.7));
                    const discount = Math.round(((prod.price - salePrice) / prod.price) * 100);

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
                            <input
                              type="number"
                              value={salePrice}
                              onChange={(e) => handlePriceChange(prod.id, e.target.value)}
                              style={{
                                width: '120px',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1.5px solid #ef4444',
                                color: '#dc2626',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                outline: 'none'
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                              {formatCurrency(salePrice)}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: 800,
                              color: '#ffffff',
                              backgroundColor: '#dc2626',
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
                onClick={() => alert('Đã đồng bộ toàn bộ kho sản phẩm ShopMart vào danh sách chọn!')}
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
              onClick={() => navigate('/admin/sales')}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Hủy bỏ
            </button>

            <button
              type="button"
              onClick={() => handleSave('DRAFT')}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid #bfdbfe',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Lưu bản nháp
            </button>

            <button
              type="button"
              onClick={() => handleSave('ACTIVE')}
              style={{
                padding: '0.75rem 1.85rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
              }}
            >
              <span>🚀</span>
              <span>Kích hoạt & Lưu chương trình</span>
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
