import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import saleService from '../../services/saleService';
import FlashCountdown from '../../components/sale/FlashCountdown';
import FlashSaleProductCard from '../../components/sale/FlashSaleProductCard';

const FlashSale = () => {
  const productsRef = useRef(null);

  // Lấy dữ liệu chiến dịch và sản phẩm
  const [activeCampaign, setActiveCampaign] = useState(() => saleService.getActiveCampaign());
  const [allProducts, setAllProducts] = useState(() => {
    const prods = saleService.getAllProducts();
    return Array.isArray(prods) ? prods : [];
  });
  const timeSlots = useMemo(() => {
    const slots = saleService.getTimeSlots();
    return Array.isArray(slots) ? slots : [];
  }, []);

  useEffect(() => {
    setActiveCampaign(saleService.getActiveCampaign());
    const prods = saleService.getAllProducts();
    setAllProducts(Array.isArray(prods) ? prods : []);
  }, []);

  // Filter states
  const [selectedSlot, setSelectedSlot] = useState('slot-1');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const categories = useMemo(() => [
    { id: 'ALL', label: `Tất cả sản phẩm (${allProducts?.length || 0})` },
    { id: 'Điện thoại & Tablet', label: 'Điện thoại & Tablet' },
    { id: 'Laptop & Mac', label: 'Laptop & Mac' },
    { id: 'Phụ kiện & Âm thanh', label: 'Phụ kiện & Âm thanh' },
    { id: 'Smart Living', label: 'Smart Living' },
    { id: 'Thời trang & Phụ kiện', label: 'Thời trang & Phụ kiện' }
  ], [allProducts?.length]);

  const filteredProducts = useMemo(() => {
    let list = Array.isArray(allProducts) ? [...allProducts].filter(Boolean) : [];

    // Ưu tiên sản phẩm trong chiến dịch đang Active do Admin cấu hình
    if (activeCampaign?.productIds && Array.isArray(activeCampaign.productIds) && activeCampaign.productIds.length > 0) {
      list.sort((a, b) => {
        const aIn = activeCampaign.productIds.includes(a?.id) ? 1 : 0;
        const bIn = activeCampaign.productIds.includes(b?.id) ? 1 : 0;
        return bIn - aIn;
      });
    }

    // Lọc theo khung giờ demo
    if (selectedSlot === 'slot-2') {
      // Khung 12h: sắp diễn ra
      list = list.filter((p) => p?.category === 'Phụ kiện & Âm thanh' || p?.category === 'Thời trang & Phụ kiện');
    } else if (selectedSlot === 'slot-3') {
      // Khung 20h
      list = list.filter((p) => p?.category === 'Laptop & Mac' || p?.category === 'Điện thoại & Tablet');
    } else if (selectedSlot === 'slot-4') {
      // Hôm qua (đã hết)
      list = list.map((p) => ({ ...p, sold: p?.stock || 0, statusText: 'Đã cháy hàng' }));
    }

    // Lọc theo category
    if (selectedCategory !== 'ALL') {
      list = list.filter((p) => p?.category === selectedCategory);
    }

    return list;
  }, [allProducts, activeCampaign, selectedSlot, selectedCategory]);

  const scrollToProducts = () => {
    if (productsRef.current) {
      productsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '3rem' }}>
      {/* 1. HERO BANNER FLASH SALE (THEO ĐÚNG HÌNH ẢNH MẪU 1) */}
      <section
        style={{
          background: 'linear-gradient(135deg, #091224 0%, #0f1f3d 50%, #1e1b4b 100%)',
          color: '#ffffff',
          padding: 'clamp(1.75rem, 4vw, 3rem) 0 clamp(2.25rem, 4.5vw, 3.5rem)',
          position: 'relative',
          overflow: 'hidden',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* Subtle decorative glow */}
        <div
          style={{
            position: 'absolute',
            top: '-40%',
            left: '10%',
            width: 'min(500px, 85vw)',
            height: 'min(500px, 85vw)',
            background: 'radial-gradient(circle, rgba(220, 38, 38, 0.25) 0%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none'
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div className="hero-grid">
            {/* Left Column: Heading & Countdown */}
            <div style={{ minWidth: 0 }}>
              {/* Badge độc quyền */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.9rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '1.15rem'
                }}
              >
                <span>⚡</span>
                <span>{activeCampaign?.categoryTag || 'CHƯƠNG TRÌNH ĐỘC QUYỀN 24 GIỜ'}</span>
              </div>

              {/* Title */}
              <h1
                style={{
                  fontSize: 'clamp(1.75rem, 4.2vw, 3rem)',
                  fontWeight: 900,
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  marginBottom: '0.85rem',
                  color: '#ffffff'
                }}
              >
                {activeCampaign?.name ? (
                  <>⚡ {activeCampaign.name}</>
                ) : (
                  <>
                    ⚡ FLASH SALE{' '}
                    <span
                      style={{
                        background: 'linear-gradient(90deg, #f87171 0%, #fb923c 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      CÔNG NGHỆ
                    </span>
                  </>
                )}
              </h1>

              {/* Subtitle */}
              <p
                style={{
                  fontSize: 'clamp(0.95rem, 1.5vw, 1.1rem)',
                  color: '#cbd5e1',
                  marginBottom: '1.5rem',
                  lineHeight: 1.5
                }}
              >
                {activeCampaign?.description || 'Ưu đãi cực sốc • Giảm tới 50% • Số lượng có hạn theo từng khung giờ vàng'}
              </p>

              {/* Countdown Component */}
              <div style={{ marginBottom: '1.75rem' }}>
                <FlashCountdown targetEndTime={activeCampaign?.endTime} variant="hero" />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                <button
                  onClick={scrollToProducts}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    padding: '0.8rem 1.65rem',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    fontSize: '0.925rem',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 8px 24px -4px rgba(220, 38, 38, 0.6)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#b91c1c')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
                >
                  <span>🔥</span>
                  <span>Săn sale ngay</span>
                </button>

                <button
                  onClick={scrollToProducts}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#f8fafc',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '0.8rem 1.45rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    fontSize: '0.925rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                >
                  <span>Xem khung giờ tiếp theo</span>
                  <span>↓</span>
                </button>
              </div>
            </div>

            {/* Right Column: Visual Card Showcase as in Image 1 */}
            <div className="hero-showcase" style={{ position: 'relative', minWidth: 0, paddingTop: '14px' }}>
              {/* Highlight Deal Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: '14px',
                  maxWidth: 'calc(100% - 28px)',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  zIndex: 3,
                  boxShadow: '0 6px 16px rgba(220, 38, 38, 0.5)',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.9 }}>MỨC GIẢM SỐC</div>
                <div style={{ fontSize: '0.98rem', fontWeight: 900 }}>
                  {activeCampaign?.badgeText ? `GIẢM ${activeCampaign.badgeText}` : '-50% TOÀN BỘ HOT DEAL'}
                </div>
              </div>

              {/* Showcase Frame */}
              <div
                style={{
                  backgroundColor: '#111827',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.6)',
                  position: 'relative'
                }}
              >
                <img
                  src={activeCampaign?.bannerUrl || "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80"}
                  alt={activeCampaign?.name || "ShopMart Flash Sale Showcase"}
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    height: 'auto',
                    aspectRatio: '16 / 10',
                    objectFit: 'cover',
                    display: 'block',
                    opacity: 0.85
                  }}
                />

                <div
                  style={{
                    padding: '1.1rem 1.35rem',
                    background: 'linear-gradient(to top, #111827 0%, rgba(17, 24, 39, 0.95) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>Phát sinh giới hạn</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                      Cam kết bảo hành chính hãng 100%
                    </div>
                  </div>
                  <span style={{ color: '#22c55e', fontSize: '1.4rem', flexShrink: 0 }}>✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TIME SLOTS NAVIGATION (NHƯ TRONG ẢNH MẪU 1) */}
      <section style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: '65px', zIndex: 90 }}>
        <div className="container">
          <div
            className="flash-timeslots-grid"
            style={{
              gap: '0.75rem',
              padding: '0.75rem 0',
              borderBottom: 'none'
            }}
          >
            {timeSlots.map((slot) => {
              const isSelected = selectedSlot === slot.id;
              return (
                <div
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '12px',
                    backgroundColor: isSelected ? '#fef2f2' : '#f8fafc',
                    border: isSelected ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: 0
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? '#fee2e2' : '#e2e8f0',
                      color: isSelected ? '#dc2626' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.05rem',
                      flexShrink: 0
                    }}
                  >
                    {slot.status === 'ACTIVE' ? '⚡' : slot.status === 'UPCOMING' ? '⏱️' : '✓'}
                  </div>

                  <div style={{ overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: isSelected ? '#dc2626' : '#0f172a' }}>
                        {slot.time}
                      </span>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: slot.status === 'ACTIVE' ? '#dc2626' : '#94a3b8',
                          color: '#ffffff',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {slot.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {slot.subLabel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. CATEGORY FILTER TABS & LIVE TRAFFIC INDICATOR */}
      <div className="container" ref={productsRef} style={{ paddingTop: '2rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.75rem'
          }}
        >
          {/* Category Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '0.5rem 0.9rem',
                    borderRadius: '9999px',
                    fontSize: '0.825rem',
                    fontWeight: active ? 700 : 500,
                    backgroundColor: active ? '#2563eb' : '#ffffff',
                    color: active ? '#ffffff' : '#475569',
                    border: active ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: active ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none'
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Live audience badge as in Image 1 */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#475569',
              backgroundColor: '#ffffff',
              padding: '0.4rem 0.85rem',
              borderRadius: '9999px',
              border: '1px solid #e2e8f0'
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                boxShadow: '0 0 8px #ef4444',
                flexShrink: 0
              }}
            />
            <span>
              <strong>1,482</strong> khách đang săn sale • Cập nhật theo giây
            </span>
          </div>
        </div>

        {/* 4. PRODUCTS GRID (12 CARD FLASH SALE CHUẨN ĐẸP) */}
        {!allProducts || allProducts.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '4rem 1.5rem',
              borderRadius: '20px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                marginBottom: '1.25rem'
              }}
            >
              ⚡
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
              Hiện chưa có sản phẩm Flash Sale
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
              Chương trình ưu đãi sốc đang được cập nhật. Quý khách vui lòng quay lại sau hoặc khám phá các sản phẩm công nghệ nổi bật khác!
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                to="/products"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  padding: '0.75rem 1.65rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '0.925rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                }}
              >
                <span>Khám phá sản phẩm</span>
                <span>→</span>
              </Link>
              <button
                onClick={() => {
                  saleService.resetMockData();
                  setActiveCampaign(saleService.getActiveCampaign());
                  setAllProducts(saleService.getAllProducts());
                }}
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '0.925rem',
                  cursor: 'pointer'
                }}
              >
                Tải lại danh sách mặc định
              </button>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '3.5rem 1.5rem',
              borderRadius: '20px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0'
            }}
          >
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>🔍</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              Không có sản phẩm trong bộ lọc này
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
              Vui lòng chuyển qua danh mục khác hoặc xem khung giờ khác.
            </p>
            <button
              onClick={() => {
                setSelectedSlot('slot-1');
                setSelectedCategory('ALL');
              }}
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1.4rem',
                borderRadius: '9999px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Xem tất cả sản phẩm
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <FlashSaleProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* 5. VALUE PROPOSITION BOTTOM TRUST BANNERS (NHƯ TRONG ẢNH MẪU 1) */}
      <section className="container" style={{ marginTop: '3.5rem' }}>
        <div className="grid-cols-4" style={{ gap: '1rem' }}>
          <div
            className="card"
            style={{
              padding: '1.15rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              backgroundColor: '#eff6ff',
              border: '1px solid #dbeafe'
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.15)'
              }}
            >
              🛡️
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                100% Chính Hãng
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Bồi thường 200% nếu phát hiện giả mạo
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '1.15rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fee2e2'
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.15)'
              }}
            >
              ⚡
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                Giao Hỏa Tốc 2H
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Áp dụng nội thành TP.HCM & Hà Nội
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '1.15rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              backgroundColor: '#fff7ed',
              border: '1px solid #ffedd5'
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                color: '#ea580c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(234, 88, 12, 0.15)'
              }}
            >
              🔄
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                1 Đổi 1 Trong 30 Ngày
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Miễn phí nếu phát sinh lỗi kỹ thuật
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '1.15rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              backgroundColor: '#f5f3ff',
              border: '1px solid #ede9fe'
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(124, 58, 237, 0.15)'
              }}
            >
              💳
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                Trả Góp 0% Lãi Suất
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Thủ tục xét duyệt online chỉ 3 phút
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FlashSale;
