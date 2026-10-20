import { Link } from 'react-router-dom';
import ProductGrid from '../../components/product/ProductGrid';

const Home = () => {
  const categories = [
    {
      id: 'phones',
      name: 'Điện thoại & Tablet',
      desc: 'iPhone, Galaxy, iPad thế hệ mới',
      count: '1.2k+ SP',
      iconBg: '#eff6ff',
      iconColor: '#2563eb',
      badgeBg: '#eff6ff',
      badgeColor: '#2563eb',
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=400&q=80',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      )
    },
    {
      id: 'laptops',
      name: 'Laptop & Workstation',
      desc: 'MacBook, Dell XPS, ThinkPad',
      count: '850+ SP',
      iconBg: '#eef2ff',
      iconColor: '#4f46e5',
      badgeBg: '#eef2ff',
      badgeColor: '#4f46e5',
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="2" y1="20" x2="22" y2="20" />
        </svg>
      )
    },
    {
      id: 'accessories',
      name: 'Phụ Kiện & Âm Thanh',
      desc: 'Tai nghe hi-res, bàn phím cơ, sạc',
      count: '3.4k+ SP',
      iconBg: '#fff7ed',
      iconColor: '#ea580c',
      badgeBg: '#fff7ed',
      badgeColor: '#ea580c',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
      )
    },
    {
      id: 'smarthome',
      name: 'Nhà Thông Minh & Gia Dụng',
      desc: 'Robot hút bụi, máy lọc không khí',
      count: '920+ SP',
      iconBg: '#fff1f2',
      iconColor: '#e11d48',
      badgeBg: '#fff1f2',
      badgeColor: '#e11d48',
      image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=400&q=80',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
        </svg>
      )
    }
  ];

  const featuredProducts = [
    {
      id: '1',
      name: 'MacBook Pro 14 M3 Pro (18GB / 512GB SSD)',
      price: 49990000,
      category: 'Laptop & Workstation',
      stock: 12,
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: '2',
      name: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
      price: 29990000,
      category: 'Điện thoại & Tablet',
      stock: 18,
      imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: '3',
      name: 'Tai nghe Sony WH-1000XM5 Chống Ồn Cao Cấp',
      price: 7990000,
      category: 'Phụ Kiện & Âm Thanh',
      stock: 25,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: '4',
      name: 'Robot Hút Bụi Lau Nhà Ecovacs Deebot X2 OMNI',
      price: 18990000,
      category: 'Nhà Thông Minh & Gia Dụng',
      stock: 6,
      imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80'
    }
  ];

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.75rem' }}>
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
                    transition: 'all 0.2s'
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
                    transition: 'all 0.2s'
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
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

      {/* 2. CATEGORIES SECTION (EXACT DESIGN AS SCREENSHOT) */}
      <section style={{ padding: '3.5rem 0 4rem', backgroundColor: '#ffffff' }}>
        <div className="container">
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: '2rem'
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
                gap: '0.25rem'
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
                to={`/products?category=${cat.id}`}
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
                {/* Top: Icon + Badge */}
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
                    src={cat.image}
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

      {/* 3. FEATURED PRODUCTS SECTION */}
      <section style={{ padding: '3.5rem 0 5rem', backgroundColor: '#f8fafc' }}>
        <div className="container">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: '2rem'
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
                gap: '0.25rem'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Xem tất cả sản phẩm <span>›</span>
            </Link>
          </div>

          <ProductGrid products={featuredProducts} />
        </div>
      </section>
    </div>
  );
};

export default Home;
