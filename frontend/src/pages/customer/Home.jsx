import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductGrid from '../../components/product/ProductGrid';
import Loading from '../../components/common/Loading';
import Icon from '../../components/common/Icons';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import { INITIAL_CATEGORIES } from '../../services/mockData';

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

const BENTO_THEMES = {
  phones: {
    accent: '#2563eb',
    glow: 'radial-gradient(circle, rgba(37, 99, 235, 0.18) 0%, rgba(37, 99, 235, 0) 70%)',
    iconBg: '#eff6ff',
    badgeBg: '#eff6ff'
  },
  laptops: {
    accent: '#4f46e5',
    glow: 'radial-gradient(circle, rgba(79, 70, 229, 0.18) 0%, rgba(79, 70, 229, 0) 70%)',
    iconBg: '#eef2ff',
    badgeBg: '#eef2ff'
  },
  accessories: {
    accent: '#d97706',
    glow: 'radial-gradient(circle, rgba(217, 119, 6, 0.18) 0%, rgba(217, 119, 6, 0) 70%)',
    iconBg: '#fef3c7',
    badgeBg: '#fef3c7'
  },
  smarthome: {
    accent: '#e11d48',
    glow: 'radial-gradient(circle, rgba(225, 29, 72, 0.18) 0%, rgba(225, 29, 72, 0) 70%)',
    iconBg: '#ffe4e6',
    badgeBg: '#ffe4e6'
  }
};

const HERO_STATS = [
  {
    id: 'authentic',
    value: '100%',
    label: 'Sản phẩm chính hãng',
    valueColor: '#0f172a',
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    icon: 'shield'
  },
  {
    id: 'support',
    value: '24/7',
    label: 'Hỗ trợ kỹ thuật chuyên sâu',
    valueColor: '#2563eb',
    iconBg: '#eef2ff',
    iconColor: '#4f46e5',
    icon: 'sparkles'
  },
  {
    id: 'shipping',
    value: 'Toàn Quốc',
    label: 'Giao hàng & bảo hành tận nơi',
    valueColor: '#ea580c',
    iconBg: '#fff7ed',
    iconColor: '#ea580c',
    icon: 'truck'
  }
];

const SPOTLIGHT_VOUCHERS = [
  {
    code: 'GIAM50K',
    tag: 'HOT',
    tagColor: '#16a34a',
    accent: '#dc2626',
    codeBg: '#fee2e2',
    headline: 'GIẢM 50K',
    condition: 'Đơn từ 500.000đ'
  },
  {
    code: 'TECHVIP',
    tag: 'VIP',
    tagColor: '#d97706',
    accent: '#2563eb',
    codeBg: '#eff6ff',
    headline: 'GIẢM 15%',
    condition: 'Tối đa 300.000đ'
  },
  {
    code: 'FREESHIP',
    tag: 'SHIP',
    tagColor: '#16a34a',
    accent: '#16a34a',
    codeBg: '#dcfce7',
    headline: 'GIẢM 30K',
    condition: 'Đơn từ 150.000đ'
  }
];

const TRUST_COMMITMENTS = [
  {
    id: 'warranty',
    title: 'Bảo Hành Chính Hãng 24 Tháng',
    desc: 'Ủy quyền trực tiếp từ Apple, Samsung, Sony, ASUS & Dell Việt Nam',
    accent: '#2563eb',
    bg: '#eff6ff',
    icon: 'shield'
  },
  {
    id: 'express',
    title: 'Giao Nhanh Siêu Tốc 2 Giờ',
    desc: 'Miễn phí vận chuyển toàn quốc & đồng kiểm trước khi thanh toán',
    accent: '#4f46e5',
    bg: '#eef2ff',
    icon: 'truck'
  },
  {
    id: 'return',
    title: '1 Đổi 1 Trong 30 Ngày Đầu',
    desc: 'Đổi mới ngay lập tức nếu phát sinh lỗi phần cứng từ nhà sản xuất',
    accent: '#059669',
    bg: '#ecfdf5',
    icon: 'refresh'
  },
  {
    id: 'installment',
    title: 'Trả Góp 0% Lãi Suất',
    desc: 'Hỗ trợ VietQR, thẻ tín dụng và ví điện tử bảo mật đa tầng',
    accent: '#ea580c',
    bg: '#fff7ed',
    icon: 'voucher'
  }
];

const FEATURED_HIGHLIGHT_PILLS = [
  { id: 'all', label: 'Tất cả Flagship', active: true },
  { id: 'new', label: 'Mới ra mắt 2026', active: false },
  { id: 'top', label: 'Đánh giá 5★', active: false },
  { id: 'deal', label: 'Ưu đãi độc quyền', active: false }
];

const enrichCategoryWithIcon = (cat, idx = 0) => {
  const keys = Object.keys(BENTO_THEMES);
  const themeKey = BENTO_THEMES[cat.id] ? cat.id : keys[idx % keys.length];
  const theme = BENTO_THEMES[themeKey];
  return {
    ...cat,
    desc: cat.desc || cat.description || '',
    icon: cat.icon || CATEGORY_ICONS[cat.id] || CATEGORY_ICONS.phones,
    themeAccent: cat.iconColor || theme.accent,
    themeGlow: theme.glow,
    themeIconBg: cat.iconBg || theme.iconBg,
    themeBadgeBg: cat.badgeBg || theme.badgeBg
  };
};

const computeRemainingTime = () => {
  const now = new Date();
  const endOfSlot = new Date(now);
  const nextSlotHour = Math.min(23, Math.floor(now.getHours() / 4) * 4 + 4);
  endOfSlot.setHours(nextSlotHour, 59, 59, 0);
  const diffSec = Math.max(0, Math.floor((endOfSlot.getTime() - now.getTime()) / 1000));
  const hours = String(Math.floor(diffSec / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
  const seconds = String(diffSec % 60).padStart(2, '0');
  return { hours, minutes, seconds };
};

const Home = () => {
  const [categories, setCategories] = useState(() =>
    INITIAL_CATEGORIES.map((cat, idx) => enrichCategoryWithIcon(cat, idx))
  );
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [countdown, setCountdown] = useState(computeRemainingTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(computeRemainingTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoadingFeatured(true);

    void Promise.allSettled([
      categoryService.getPublicCategories(),
      productService.getAll({ page: 0, size: 8 })
    ])
      .then(([catResult, prodResult]) => {
        if (!isMounted) return;
        if (catResult.status === 'fulfilled' && Array.isArray(catResult.value)) {
          setCategories(
            catResult.value.slice(0, 4).map((cat, idx) => enrichCategoryWithIcon(cat, idx))
          );
        }
        if (prodResult.status === 'fulfilled' && Array.isArray(prodResult.value)) {
          setFeaturedProducts(prodResult.value.slice(0, 8));
        } else {
          setFeaturedProducts([]);
        }
      })
      .catch(() => {
        if (isMounted) setFeaturedProducts([]);
      })
      .finally(() => {
        if (isMounted) setLoadingFeatured(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const countdownUnits = [
    { label: 'GIỜ', value: countdown.hours },
    { label: 'PHÚT', value: countdown.minutes },
    { label: 'GIÂY', value: countdown.seconds }
  ];

  return (
    <div className="ui-page-enter">
      {/* 1. HERO SECTION — AURORA MESH & FLAGSHIP 3D SHOWCASE */}
      <section
        className="hero-section home-hero-aurora"
        style={{
          padding: 'clamp(2rem, 4.5vw, 3.75rem) 0 clamp(2.75rem, 5.5vw, 4.5rem)'
        }}
      >
        {/* Subtle digital dot grid & floating aurora orbs */}
        <div className="home-hero-grid-pattern" />
        <div
          className="home-aurora-orb"
          style={{
            top: '-90px',
            left: '6%',
            width: '340px',
            height: '340px',
            background: 'rgba(59, 130, 246, 0.22)'
          }}
        />
        <div
          className="home-aurora-orb"
          style={{
            bottom: '-110px',
            right: '8%',
            width: '380px',
            height: '380px',
            background: 'rgba(99, 102, 241, 0.2)',
            animationDelay: '-4s'
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-grid" style={{ alignItems: 'center' }}>
            {/* Left Content: Flagship Typography, CTA & Glassmorphism Dock */}
            <div className="hero-content" style={{ minWidth: 0 }}>
              {/* Glassmorphism Pill Badge with Live Ping Dot */}
              <div
                className="hero-pill"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  maxWidth: '100%',
                  gap: '0.5rem',
                  padding: '0.48rem 1.05rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(147, 197, 253, 0.65)',
                  borderRadius: '9999px',
                  color: '#1d4ed8',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '1.35rem',
                  boxShadow: '0 4px 16px -2px rgba(37, 99, 235, 0.12)'
                }}
              >
                <span className="home-ping-wrap" aria-hidden="true">
                  <span className="home-ping-ring" />
                  <span className="home-ping-dot" />
                </span>
                <Icon name="sparkles" size={14} color="#2563eb" />
                <span>HỆ SINH THÁI CÔNG NGHỆ CHUẨN MỰC</span>
                <span style={{ color: '#93c5fd' }}>•</span>
                <span style={{ color: '#2563eb', fontWeight: 800 }}>Chính Hãng 100%</span>
              </div>

              {/* Main Flagship Heading */}
              <h1
                className="hero-title"
                style={{
                  fontSize: 'clamp(2rem, 1.25rem + 2.6vw, 3.55rem)',
                  fontWeight: 800,
                  color: '#0f172a',
                  lineHeight: 1.12,
                  letterSpacing: '-0.03em',
                  marginBottom: '1.2rem'
                }}
              >
                Khám Phá Thế Giới{' '}
                <span className="home-gradient-text">Công Nghệ Đỉnh Cao</span>
              </h1>

              {/* Subtitle Description */}
              <p
                style={{
                  fontSize: 'clamp(0.96rem, 1.15vw, 1.08rem)',
                  color: '#475569',
                  lineHeight: 1.7,
                  marginBottom: '1.9rem',
                  maxWidth: '550px'
                }}
              >
                Trải nghiệm mua sắm hiện đại cùng các thiết bị điện tử, laptop và tiện ích gia dụng thông minh thế hệ mới từ các thương hiệu dẫn đầu toàn cầu.
              </p>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.9rem',
                  marginBottom: '2.35rem',
                  flexWrap: 'wrap'
                }}
              >
                <Link to="/products" className="home-cta-primary">
                  <span>Khám phá bộ sưu tập</span>
                  <span className="home-cta-arrow">
                    <Icon name="arrow-right" size={16} />
                  </span>
                </Link>

                <Link to="/products" className="home-cta-secondary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                  <span>Xem tất cả danh mục</span>
                </Link>
              </div>

              {/* Three Stat Counters inside Glassmorphism Dock */}
              <div className="home-stats-dock">
                {HERO_STATS.map((stat, idx) => (
                  <div
                    key={stat.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      paddingRight: idx < HERO_STATS.length - 1 ? 'clamp(0.65rem, 1.5vw, 1.25rem)' : 0,
                      borderRight:
                        idx < HERO_STATS.length - 1 ? '1px solid rgba(226, 232, 240, 0.9)' : 'none'
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '11px',
                        backgroundColor: stat.iconBg,
                        color: stat.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Icon name={stat.icon} size={18} color={stat.iconColor} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 'clamp(1.2rem, 1.7vw, 1.45rem)',
                          fontWeight: 800,
                          color: stat.valueColor,
                          lineHeight: 1.15
                        }}
                      >
                        {stat.value}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500, marginTop: '0.15rem' }}>
                        {stat.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Showcase Card with Multi-layer Glow Frame & 3 Floating Glassmorphic Badges */}
            <div className="hero-showcase" style={{ position: 'relative', minWidth: 0, padding: '18px 0' }}>
              {/* 1. Top-Left Floating Badge */}
              <div
                className="hero-badge hero-badge-top home-floating-badge"
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: '12px',
                  maxWidth: 'calc(100% - 24px)',
                  zIndex: 3
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '11px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0,
                    boxShadow: '0 6px 14px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                    Cam Kết Chất Lượng
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                    Tiêu chuẩn phân phối toàn cầu
                  </div>
                </div>
              </div>

              {/* Outer Glassmorphism Glow Frame */}
              <div className="home-showcase-outer">
                <div
                  style={{
                    backgroundColor: '#0f172a',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80"
                    alt="Tech Master Ecosystem"
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      height: 'auto',
                      aspectRatio: '16 / 10',
                      objectFit: 'cover',
                      display: 'block',
                      opacity: 0.96
                    }}
                  />

                  {/* Dark gradient overlay at bottom */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(to top, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.35) 45%, rgba(15, 23, 42, 0) 75%)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      padding: 'clamp(1.1rem, 2.5vw, 1.6rem) clamp(1.1rem, 2.5vw, 1.6rem) 2.35rem'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.65rem'
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            color: '#fdba74',
                            textTransform: 'uppercase',
                            marginBottom: '0.25rem'
                          }}
                        >
                          <Icon name="sparkles" size={12} color="#fdba74" />
                          <span>FLAGSHIP SERIES • AI GENERATION</span>
                        </div>
                        <div
                          style={{
                            fontSize: 'clamp(1.1rem, 1.9vw, 1.35rem)',
                            fontWeight: 800,
                            color: '#ffffff',
                            letterSpacing: '-0.015em'
                          }}
                        >
                          Tech Master Ecosystem
                        </div>
                      </div>

                      <span
                        style={{
                          background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                          color: '#ffffff',
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          padding: '0.35rem 0.85rem',
                          borderRadius: '9999px',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.5)'
                        }}
                      >
                        Chính Hãng
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Bottom-Left Floating Rating Badge (3rd floating card) */}
              <div
                className="hero-badge home-floating-badge"
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '14px',
                  zIndex: 3,
                  animationDelay: '-1.6s'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: '#fef3c7',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.95rem',
                    flexShrink: 0
                  }}
                >
                  ★
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                    4.9/5 ★ Đánh Giá
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>
                    Từ 12.5k+ khách hàng
                  </div>
                </div>
              </div>

              {/* 3. Bottom-Right Floating Warranty Badge */}
              <div
                className="hero-badge hero-badge-bottom home-floating-badge"
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '12px',
                  maxWidth: 'calc(100% - 24px)',
                  zIndex: 3,
                  animationDelay: '-2.8s'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#16a34a',
                    flexShrink: 0
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                    Bảo Hành Toàn Diện
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                    Hỗ trợ kỹ thuật chính hãng
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FLASH SALE SPOTLIGHT BANNER WITH LIVE COUNTDOWN */}
      <section
        style={{
          background: 'linear-gradient(92deg, #9f1239 0%, #dc2626 48%, #ea580c 100%)',
          color: '#ffffff',
          padding: '1.15rem 0',
          boxShadow: '0 10px 28px -8px rgba(220, 38, 38, 0.38)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle cyber diagonal shine */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 20% 50%, rgba(254, 240, 138, 0.16) 0%, transparent 45%), radial-gradient(circle at 80% 50%, rgba(255, 255, 255, 0.12) 0%, transparent 40%)',
            pointerEvents: 'none'
          }}
        />

        <div
          className="container"
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap', minWidth: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(15, 23, 42, 0.28)',
                border: '1px solid rgba(253, 224, 71, 0.45)',
                padding: '0.38rem 0.9rem',
                borderRadius: '9999px',
                fontWeight: 800,
                fontSize: '0.76rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)'
              }}
            >
              <Icon name="flash" size={14} color="#fde047" />
              <span>FLASH SALE ĐỘC QUYỀN</span>
            </div>

            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.08rem)', fontWeight: 800 }}>
                Giảm Sốc Đến 50% Toàn Bộ Thiết Bị Hot
              </span>
              <span style={{ fontSize: '0.825rem', opacity: 0.92, marginLeft: '0.5rem', display: 'inline-block' }}>
                • Số lượng có hạn theo từng khung giờ
              </span>
            </div>

            {/* Live Digital Countdown Timer */}
            <div
              aria-label="Đồng hồ đếm ngược Flash Sale"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginLeft: '0.25rem'
              }}
            >
              {countdownUnits.map((unit, idx) => (
                <div key={unit.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div
                    style={{
                      backgroundColor: 'rgba(15, 23, 42, 0.38)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      borderRadius: '8px',
                      padding: '0.24rem 0.52rem',
                      minWidth: '42px',
                      textAlign: 'center',
                      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        color: '#fde047',
                        lineHeight: 1.1
                      }}
                    >
                      {unit.value}
                    </div>
                    <div style={{ fontSize: '0.55rem', fontWeight: 700, opacity: 0.85, letterSpacing: '0.04em' }}>
                      {unit.label}
                    </div>
                  </div>
                  {idx < countdownUnits.length - 1 && (
                    <span style={{ fontWeight: 900, color: '#fde047', fontSize: '0.95rem' }}>:</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/flash-sale"
            className="ui-hover-lift"
            style={{
              backgroundColor: '#ffffff',
              color: '#dc2626',
              padding: '0.65rem 1.35rem',
              borderRadius: '9999px',
              fontWeight: 800,
              fontSize: '0.86rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              textDecoration: 'none',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2), 0 0 0 3px rgba(253, 224, 71, 0.32)',
              whiteSpace: 'nowrap'
            }}
          >
            <Icon name="flash" size={15} color="#dc2626" />
            <span>Săn Flash Sale ngay</span>
            <Icon name="arrow-right" size={15} color="#dc2626" />
          </Link>
        </div>
      </section>

      {/* 3. CATEGORIES SECTION — INTERACTIVE BENTO GRID */}
      <section
        style={{
          padding: 'clamp(2.5rem, 4.5vw, 4rem) 0 clamp(2.5rem, 5vw, 4rem)',
          backgroundColor: '#ffffff'
        }}
      >
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#2563eb',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  marginBottom: '0.4rem'
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '3px',
                    borderRadius: '9999px',
                    background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                    display: 'inline-block'
                  }}
                />
                <span>KHÁM PHÁ THEO DANH MỤC</span>
              </div>
              <h2
                style={{
                  fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.025em',
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
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.45rem 0.95rem',
                borderRadius: '9999px',
                backgroundColor: '#eff6ff',
                textDecoration: 'none'
              }}
            >
              <span>Xem tất cả danh mục</span>
              <Icon name="chevron-right" size={16} />
            </Link>
          </div>

          {/* 4 Interactive Bento Cards Grid */}
          <div className="grid-cols-4 ui-stagger">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${encodeURIComponent(cat.id)}`}
                className="home-bento-card"
                style={{
                  '--bento-accent': cat.themeAccent,
                  '--bento-icon-bg': cat.themeIconBg
                }}
              >
                {/* Decorative top-right radial glow */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-45px',
                    right: '-45px',
                    width: '150px',
                    height: '150px',
                    borderRadius: '50%',
                    background: cat.themeGlow,
                    pointerEvents: 'none'
                  }}
                />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1.1rem'
                    }}
                  >
                    <div className="home-bento-icon">{cat.icon}</div>

                    <span
                      style={{
                        backgroundColor: cat.themeBadgeBg,
                        color: cat.themeAccent,
                        fontSize: '0.73rem',
                        fontWeight: 700,
                        padding: '0.28rem 0.7rem',
                        borderRadius: '9999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: cat.themeAccent
                        }}
                      />
                      <span>{cat.count}</span>
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      marginBottom: '0.35rem',
                      letterSpacing: '-0.015em'
                    }}
                  >
                    {cat.name}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: '#64748b',
                      lineHeight: 1.5,
                      marginBottom: '1.15rem'
                    }}
                  >
                    {cat.desc}
                  </p>
                </div>

                {/* Bottom: Thumbnail Image + Interactive "Khám phá ngay →" */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div
                    className="home-bento-thumb"
                    style={{
                      height: '118px',
                      borderRadius: '13px',
                      overflow: 'hidden',
                      backgroundColor: '#f8fafc',
                      border: '1px solid rgba(226, 232, 240, 0.7)'
                    }}
                  >
                    <img
                      src={cat.image || cat.imageUrl}
                      alt={cat.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                  </div>

                  <div className="home-bento-cta">
                    <span>Khám phá ngay</span>
                    <Icon name="arrow-right" size={14} color={cat.themeAccent} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. VOUCHER SPOTLIGHT BANNER WIDGET */}
      <section style={{ padding: '0 0 clamp(2.5rem, 4.5vw, 3.75rem)', backgroundColor: '#ffffff' }}>
        <div className="container">
          <div
            className="voucher-spotlight-card"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #1d4ed8 100%)',
              borderRadius: '24px',
              padding: 'clamp(1.5rem, 3.2vw, 2.75rem) clamp(1.25rem, 3.2vw, 2.5rem)',
              color: '#ffffff',
              boxShadow: '0 24px 48px -12px rgba(30, 27, 75, 0.35)',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.12)'
            }}
          >
            {/* Background decorative glows */}
            <div
              style={{
                position: 'absolute',
                top: '-60px',
                right: '-40px',
                width: '280px',
                height: '280px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(244, 63, 94, 0.32) 0%, rgba(244, 63, 94, 0) 70%)',
                pointerEvents: 'none'
              }}
            />

            <div className="voucher-spotlight-grid" style={{ position: 'relative', zIndex: 1 }}>
              {/* Left headline */}
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(253, 224, 71, 0.35)',
                    padding: '0.38rem 0.9rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: '#fde047',
                    marginBottom: '1rem'
                  }}
                >
                  <Icon name="voucher" size={14} color="#fde047" />
                  <span>KHO MÃ GIẢM GIÁ ĐỘC QUYỀN</span>
                </div>

                <h2
                  style={{
                    fontSize: 'clamp(1.5rem, 1.05rem + 1.5vw, 2.15rem)',
                    fontWeight: 900,
                    lineHeight: 1.18,
                    letterSpacing: '-0.025em',
                    marginBottom: '0.8rem',
                    color: '#ffffff'
                  }}
                >
                  Săn Voucher Ngay, <br />
                  <span style={{ color: '#fda4af' }}>Tiết Kiệm Lên Đến 500K</span>
                </h2>

                <p style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.65, marginBottom: '1.6rem' }}>
                  Lưu ngay các mã giảm giá % và freeship có giá trị tốt nhất trong tháng. Sử dụng tiện lợi khi đặt hàng!
                </p>

                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <Link
                    to="/vouchers"
                    className="ui-hover-lift"
                    style={{
                      background: 'linear-gradient(135deg, #e11d48 0%, #dc2626 100%)',
                      color: '#ffffff',
                      padding: '0.78rem 1.55rem',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      boxShadow: '0 8px 20px -4px rgba(225, 29, 72, 0.5)'
                    }}
                  >
                    <span>Vào kho voucher</span>
                    <Icon name="arrow-right" size={15} />
                  </Link>

                  <Link
                    to="/my-vouchers"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.12)',
                      border: '1.5px solid rgba(255, 255, 255, 0.28)',
                      color: '#ffffff',
                      padding: '0.78rem 1.4rem',
                      borderRadius: '9999px',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem'
                    }}
                  >
                    <Icon name="voucher" size={15} />
                    <span>Mã đã lưu</span>
                  </Link>
                </div>
              </div>

              {/* Right: 3 Mini Voucher Showcase Cards */}
              <div
                className="ui-stagger"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(170px, 100%), 1fr))',
                  gap: '1rem',
                  minWidth: 0
                }}
              >
                {SPOTLIGHT_VOUCHERS.map((voucher) => (
                  <div
                    key={voucher.code}
                    className="ui-hover-lift"
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      borderRadius: '16px',
                      padding: '1.15rem',
                      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.18)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderLeft: `5px solid ${voucher.accent}`,
                      minWidth: 0
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.45rem'
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '0.84rem',
                            color: voucher.accent,
                            backgroundColor: voucher.codeBg,
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}
                        >
                          {voucher.code}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            color: voucher.tagColor,
                            fontWeight: 800,
                            letterSpacing: '0.04em'
                          }}
                        >
                          {voucher.tag}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 900,
                          color: voucher.accent,
                          lineHeight: 1.15,
                          marginBottom: '0.35rem'
                        }}
                      >
                        {voucher.headline}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 500 }}>
                        {voucher.condition}
                      </div>
                    </div>
                    <Link
                      to="/vouchers"
                      style={{
                        marginTop: '0.85rem',
                        paddingTop: '0.6rem',
                        borderTop: '1px dashed #e2e8f0',
                        fontSize: '0.78rem',
                        color: '#2563eb',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>Lưu mã ngay</span>
                      <Icon name="arrow-right" size={13} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FEATURED PRODUCTS SECTION & SERVICE COMMITMENTS */}
      <section
        style={{
          padding: 'clamp(2.5rem, 4.5vw, 4rem) 0 clamp(3rem, 5vw, 5rem)',
          background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
          borderTop: '1px solid #e2e8f0'
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#2563eb',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  marginBottom: '0.4rem'
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '3px',
                    borderRadius: '9999px',
                    background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                    display: 'inline-block'
                  }}
                />
                <span>SẢN PHẨM BÁN CHẠY</span>
              </div>
              <h2
                style={{
                  fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.025em',
                  margin: 0
                }}
              >
                Sản Phẩm Công Nghệ Tiêu Biểu
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {FEATURED_HIGHLIGHT_PILLS.map((pill) => (
                <Link
                  key={pill.id}
                  to="/products"
                  style={{
                    padding: '0.42rem 0.9rem',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    backgroundColor: pill.active ? '#0f172a' : '#ffffff',
                    color: pill.active ? '#ffffff' : '#475569',
                    border: pill.active ? '1px solid #0f172a' : '1px solid #e2e8f0',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)'
                  }}
                >
                  {pill.label}
                </Link>
              ))}

              <Link
                to="/products"
                style={{
                  color: '#2563eb',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  marginLeft: '0.35rem',
                  textDecoration: 'none'
                }}
              >
                <span>Xem tất cả sản phẩm</span>
                <Icon name="chevron-right" size={16} />
              </Link>
            </div>
          </div>

          {loadingFeatured && featuredProducts.length === 0 ? (
            <Loading message="Đang tải sản phẩm tiêu biểu..." />
          ) : (
            <ProductGrid products={featuredProducts} />
          )}

          {/* Flagship Service Trust Bar */}
          <div
            className="grid-cols-4"
            style={{
              marginTop: 'clamp(2.5rem, 4vw, 3.75rem)',
              paddingTop: 'clamp(2rem, 3.5vw, 2.75rem)',
              borderTop: '1px solid #e2e8f0'
            }}
          >
            {TRUST_COMMITMENTS.map((item) => (
              <div
                key={item.id}
                className="ui-hover-lift"
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '18px',
                  padding: '1.25rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px -4px rgba(15, 23, 42, 0.05)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.9rem'
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: item.bg,
                    color: item.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Icon name={item.icon} size={20} color={item.accent} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      marginBottom: '0.25rem'
                    }}
                  >
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.45 }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
