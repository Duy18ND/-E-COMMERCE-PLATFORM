import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductGrid from '../../components/product/ProductGrid';
import Loading from '../../components/common/Loading';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '../../services/mockData';

const CATEGORY_ICONS = {
  phones: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  laptops: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  ),
  accessories: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  ),
  smarthome: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </svg>
  )
};

const enrichCategoryWithIcon = (cat) => ({
  ...cat,
  desc: cat.desc || cat.description || '',
  icon: cat.icon || CATEGORY_ICONS[cat.id] || CATEGORY_ICONS.phones
});

const Home = () => {
  const [categories, setCategories] = useState(() =>
    INITIAL_CATEGORIES.map(enrichCategoryWithIcon)
  );
  const [featuredProducts, setFeaturedProducts] = useState(() =>
    INITIAL_PRODUCTS.slice(0, 8)
  );
  const [loadingFeatured, setLoadingFeatured] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingFeatured(true);

    Promise.all([
      categoryService.getPublicCategories(),
      productService.getAll({ page: 0, size: 8 })
    ])
      .then(([catList, prodList]) => {
        if (!isMounted) return;
        if (Array.isArray(catList) && catList.length > 0) {
          setCategories(catList.slice(0, 4).map(enrichCategoryWithIcon));
        }
        if (Array.isArray(prodList) && prodList.length > 0) {
          setFeaturedProducts(prodList.slice(0, 8));
        }
      })
      .finally(() => {
        if (isMounted) setLoadingFeatured(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div>
      {/* 1. HERO SECTION WITH EXACT STYLE */}
      <section
        style={{
          background: 'linear-gradient(180deg, #f0f6ff 0%, #ffffff 100%)',
          padding: '3rem 0 4rem',
          borderBottom: '1px solid #f1f5f9'
        }}
      >
        <div className="container">
          <div
            className="hero-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.15fr 0.85fr',
              alignItems: 'center',
              gap: '3.5rem'
            }}
          >
            {/* Left Content */}
            <div>
              {/* Pill Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 1rem',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #dbeafe',
                  borderRadius: '9999px',
                  color: '#1d4ed8',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '1.5rem',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.08)'
                }}
              >
                <span>✨</span>
                <span>HỆ SINH THÁI CÔNG NGHỆ CHUẨN MỰC</span>
                <span style={{ color: '#93c5fd' }}>•</span>
                <span style={{ color: '#2563eb' }}>Chính Hãng 100%</span>
              </div>

              {/* Main Heading */}
              <h1
                style={{
                  fontSize: '3.25rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.15,
                  letterSpacing: '-0.025em',
                  marginBottom: '1.25rem'
                }}
              >
                Khám Phá Thế Giới{' '}
                <span style={{ color: '#2563eb' }}>Công Nghệ Đỉnh Cao</span>
              </h1>

              {/* Description */}
              <p
                style={{
                  fontSize: '1.05rem',
                  color: '#475569',
                  lineHeight: 1.65,
                  marginBottom: '2rem',
                  maxWidth: '520px'
                }}
              >
                Trải nghiệm mua sắm hiện đại cùng các thiết bị điện tử, laptop và tiện ích gia dụng thông minh thế hệ mới từ các thương hiệu dẫn đầu toàn cầu.
              </p>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.75rem', flexWrap: 'wrap' }}>
                <Link
                  to="/products"
                  style={{
                    backgroundColor: '#1d4ed8',
                    color: '#ffffff',
                    padding: '0.85rem 1.75rem',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 8px 20px -4px rgba(29, 78, 216, 0.45)',
                    transition: 'all 0.2s',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  Khám phá bộ sưu tập ➔
                </Link>

                <Link
                  to="/products"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    border: '1.5px solid #cbd5e1',
                    padding: '0.85rem 1.5rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.color = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.color = '#0f172a';
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  Xem tất cả danh mục
                </Link>
              </div>

              {/* Three Stat Counters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                    100%
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Sản phẩm chính hãng
                  </div>
                </div>

                <div style={{ width: '1px', height: '36px', backgroundColor: '#e2e8f0' }} />

                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563eb', lineHeight: 1.2 }}>
                    24/7
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Hỗ trợ kỹ thuật chuyên sâu
                  </div>
                </div>

                <div style={{ width: '1px', height: '36px', backgroundColor: '#e2e8f0' }} />

                <div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ea580c', lineHeight: 1.2 }}>
                    Toàn Quốc
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Giao hàng & bảo hành tận nơi
                  </div>
                </div>
              </div>
            </div>

            {/* Right Showcase Card with Floating Glassmorphic Badges */}
            <div style={{ position: 'relative' }}>
              {/* Top-Left Floating Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '-18px',
                  left: '-20px',
                  zIndex: 2,
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '10px 16px',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563eb'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    Cam Kết Chất Lượng
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                    Tiêu chuẩn phân phối toàn cầu
                  </div>
                </div>
              </div>

              {/* Main Showcase Image Frame */}
              <div
                style={{
                  backgroundColor: '#0f172a',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.25)',
                  position: 'relative',
                  border: '4px solid #ffffff'
                }}
              >
                <img
                  src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80"
                  alt="Tech Master Ecosystem"
                  style={{
                    width: '100%',
                    height: '380px',
                    objectFit: 'cover',
                    display: 'block',
                    opacity: 0.95
                  }}
                />

                {/* Dark gradient overlay at bottom */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0) 50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: '1.5rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div>
                      <div
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          color: '#fdba74',
                          textTransform: 'uppercase',
                          marginBottom: '0.2rem'
                        }}
                      >
                        FLAGSHIP SERIES
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                        Tech Master Ecosystem
                      </div>
                    </div>

                    <span
                      style={{
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.35rem 0.85rem',
                        borderRadius: '9999px',
                        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.5)'
                      }}
                    >
                      Chính Hãng
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom-Right Floating Badge */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-18px',
                  right: '-15px',
                  zIndex: 2,
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '10px 16px',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08)',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    Bảo Hành Toàn Diện
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                    Hỗ trợ kỹ thuật chính hãng
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FLASH SALE SPOTLIGHT BANNER */}
      <section
        style={{
          background: 'linear-gradient(90deg, #991b1b 0%, #dc2626 50%, #ea580c 100%)',
          color: '#ffffff',
          padding: '1.1rem 0',
          boxShadow: '0 4px 20px rgba(220, 38, 38, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontWeight: 800,
                fontSize: '0.8rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              <span>⚡</span>
              <span>FLASH SALE ĐỘC QUYỀN</span>
            </div>
            <div>
              <span style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                Giảm Sốc Đến 50% Toàn Bộ Thiết Bị Hot
              </span>
              <span style={{ fontSize: '0.825rem', opacity: 0.9, marginLeft: '0.5rem', display: 'inline-block' }}>
                • Số lượng có hạn theo từng khung giờ
              </span>
            </div>
          </div>

          <Link
            to="/flash-sale"
            style={{
              backgroundColor: '#ffffff',
              color: '#dc2626',
              padding: '0.6rem 1.35rem',
              borderRadius: '9999px',
              fontWeight: 800,
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <span>Săn Flash Sale ngay</span>
            <span>⚡ ➔</span>
          </Link>
        </div>
      </section>

      {/* 2. CATEGORIES SECTION */}
      <section style={{ padding: '3.5rem 0 4rem', backgroundColor: '#ffffff' }}>
        <div className="container">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#2563eb',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '0.35rem'
                }}
              >
                KHÁM PHÁ THEO DANH MỤC
              </div>
              <h2
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  margin: 0
                }}
              >
                Danh Mục Sản Phẩm
              </h2>
            </div>

            <Link
              to="/products"
              style={{
                color: '#2563eb',
                fontSize: '0.925rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Xem tất cả danh mục <span>›</span>
            </Link>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid-cols-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${encodeURIComponent(cat.id)}`}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  transition: 'all 0.25s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(37, 99, 235, 0.12)';
                  e.currentTarget.style.borderColor = '#dbeafe';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.04)';
                  e.currentTarget.style.borderColor = '#f1f5f9';
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1rem'
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: cat.iconBg,
                        color: cat.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {cat.icon}
                    </div>

                    <span
                      style={{
                        backgroundColor: cat.badgeBg,
                        color: cat.badgeColor,
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px'
                      }}
                    >
                      {cat.count}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: '0.25rem'
                    }}
                  >
                    {cat.name}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: '#64748b',
                      lineHeight: 1.4,
                      marginBottom: '1.25rem'
                    }}
                  >
                    {cat.desc}
                  </p>
                </div>

                {/* Bottom: Thumbnail Image */}
                <div
                  style={{
                    height: '110px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    backgroundColor: '#f8fafc'
                  }}
                >
                  <img
                    src={cat.image || cat.imageUrl}
                    alt={cat.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.3s'
                    }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* VOUCHER SPOTLIGHT BANNER WIDGET */}
      <section style={{ padding: '0 0 3.5rem', backgroundColor: '#ffffff' }}>
        <div className="container">
          <div
            style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1e3a8a 100%)',
              borderRadius: '20px',
              padding: '2.5rem 2.25rem',
              color: '#ffffff',
              boxShadow: '0 16px 36px -10px rgba(30, 27, 75, 0.35)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background decorative glow */}
            <div
              style={{
                position: 'absolute',
                top: '-50px',
                right: '-50px',
                width: '260px',
                height: '260px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(239, 68, 68, 0.35) 0%, rgba(239, 68, 68, 0) 70%)',
                pointerEvents: 'none'
              }}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1.8fr',
                gap: '2.5rem',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1
              }}
            >
              {/* Left headline */}
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#fde047',
                    marginBottom: '1rem'
                  }}
                >
                  <span>🎟️</span>
                  <span>KHO MÃ GIẢM GIÁ ĐỘC QUYỀN</span>
                </div>

                <h2
                  style={{
                    fontSize: '2rem',
                    fontWeight: 900,
                    lineHeight: 1.2,
                    letterSpacing: '-0.02em',
                    marginBottom: '0.75rem',
                    color: '#ffffff'
                  }}
                >
                  Săn Voucher Ngay, <br />
                  <span style={{ color: '#f87171' }}>Tiết Kiệm Lên Đến 500K</span>
                </h2>

                <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  Lưu ngay các mã giảm giá % và freeship có giá trị tốt nhất trong tháng. Sử dụng tiện lợi khi đặt hàng!
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <Link
                    to="/vouchers"
                    style={{
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 4px 14px rgba(220, 38, 38, 0.45)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                  >
                    <span>Vào kho voucher</span>
                    <span>➔</span>
                  </Link>

                  <Link
                    to="/my-vouchers"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1.5px solid rgba(255, 255, 255, 0.25)',
                      color: '#ffffff',
                      padding: '0.75rem 1.35rem',
                      borderRadius: '9999px',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
                  >
                    <span>🎒</span>
                    <span>Mã đã lưu</span>
                  </Link>
                </div>
              </div>

              {/* Right: 3 Mini Voucher Showcase Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem'
                }}
              >
                {/* Voucher 1 */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    borderRadius: '14px',
                    padding: '1.1rem',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: '5px solid #dc2626'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                        GIAM50K
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700 }}>HOT</span>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#dc2626', lineHeight: 1.1, marginBottom: '0.35rem' }}>
                      GIẢM 50K
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Đơn từ 500.000đ
                    </div>
                  </div>
                  <Link
                    to="/vouchers"
                    style={{
                      marginTop: '0.75rem',
                      fontSize: '0.78rem',
                      color: '#2563eb',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    Lưu mã ngay →
                  </Link>
                </div>

                {/* Voucher 2 */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    borderRadius: '14px',
                    padding: '1.1rem',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: '5px solid #2563eb'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                        TECHVIP
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 700 }}>VIP</span>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#2563eb', lineHeight: 1.1, marginBottom: '0.35rem' }}>
                      GIẢM 15%
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Tối đa 300.000đ
                    </div>
                  </div>
                  <Link
                    to="/vouchers"
                    style={{
                      marginTop: '0.75rem',
                      fontSize: '0.78rem',
                      color: '#2563eb',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    Lưu mã ngay →
                  </Link>
                </div>

                {/* Voucher 3 */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    borderRadius: '14px',
                    padding: '1.1rem',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: '5px solid #16a34a'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                        FREESHIP
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700 }}>SHIP</span>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16a34a', lineHeight: 1.1, marginBottom: '0.35rem' }}>
                      GIẢM 30K
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Đơn từ 150.000đ
                    </div>
                  </div>
                  <Link
                    to="/vouchers"
                    style={{
                      marginTop: '0.75rem',
                      fontSize: '0.78rem',
                      color: '#2563eb',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    Lưu mã ngay →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED PRODUCTS SECTION */}
      <section style={{ padding: '3.5rem 0 5rem', backgroundColor: '#f8fafc' }}>
        <div className="container">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#2563eb',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '0.35rem'
                }}
              >
                SẢN PHẨM BÁN CHẠY
              </div>
              <h2
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  margin: 0
                }}
              >
                Sản Phẩm Công Nghệ Tiêu Biểu
              </h2>
            </div>

            <Link
              to="/products"
              style={{
                color: '#2563eb',
                fontSize: '0.925rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Xem tất cả sản phẩm <span>›</span>
            </Link>
          </div>

          {loadingFeatured && featuredProducts.length === 0 ? (
            <Loading message="Đang tải sản phẩm tiêu biểu..." />
          ) : (
            <ProductGrid products={featuredProducts} />
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
