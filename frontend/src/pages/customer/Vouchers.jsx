import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import voucherService, { getVoucherStatus } from '../../services/voucherService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMoney = (n) => Number(n).toLocaleString('vi-VN') + 'đ';

const fmtDate = (str) => {
  if (!str) return '';
  const d = new Date(str);
  return isNaN(d)
    ? str
    : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const daysLeft = (endDate) => {
  const diff = new Date(endDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const STATUS_INFO = {
  EXPIRED:  { label: 'Đã hết hạn',      color: '#94a3b8', bg: '#f1f5f9' },
  SOLD_OUT: { label: 'Đã hết lượt',     color: '#7c3aed', bg: '#ede9fe' },
  UPCOMING: { label: 'Sắp diễn ra',     color: '#d97706', bg: '#fef3c7' },
  INACTIVE: { label: 'Không khả dụng',  color: '#94a3b8', bg: '#f1f5f9' },
  ACTIVE:   { label: 'Đang hoạt động',  color: '#16a34a', bg: '#dcfce7' },
};

// ─── VoucherCard ───────────────────────────────────────────────────────────────
const VoucherCard = ({ voucher, isSaved, onSave, onUnsave }) => {
  const status   = getVoucherStatus(voucher);
  const isActive = status === 'ACTIVE';
  const days     = daysLeft(voucher.endDate);
  const remaining = voucher.quantity - voucher.usedQuantity;

  const borderColor = isActive ? '#fecaca' : '#e2e8f0';
  const topBg       = isActive ? '#fef2f2' : '#f8fafc';
  const accentColor = isActive ? '#dc2626' : '#94a3b8';

  const renderActionButton = () => {
    if (!isActive) {
      const si = STATUS_INFO[status] || STATUS_INFO.INACTIVE;
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', padding: '0.45rem 1rem',
          borderRadius: '8px', backgroundColor: si.bg, color: si.color,
          fontSize: '0.825rem', fontWeight: 700
        }}>
          {si.label}
        </span>
      );
    }
    if (isSaved) {
      return (
        <button
          onClick={() => onUnsave(voucher.id)}
          style={{
            padding: '0.45rem 1.1rem', borderRadius: '8px', border: '1.5px solid #86efac',
            backgroundColor: '#f0fdf4', color: '#16a34a', fontSize: '0.825rem',
            fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
          }}
        >
          ✓ Đã lưu
        </button>
      );
    }
    return (
      <button
        onClick={() => onSave(voucher.id)}
        style={{
          padding: '0.45rem 1.1rem', borderRadius: '8px', border: 'none',
          backgroundColor: '#dc2626', color: '#ffffff', fontSize: '0.825rem',
          fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
        }}
      >
        🔖 Lưu mã
      </button>
    );
  };

  return (
    <div
      style={{
        borderRadius: '14px',
        border: `1px solid ${borderColor}`,
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        opacity: isActive ? 1 : 0.65,
        boxShadow: isActive ? '0 2px 12px rgba(220,38,38,0.08)' : 'none',
        transition: 'transform 0.15s'
      }}
      onMouseEnter={(e) => isActive && (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
    >
      {/* Top – discount highlight */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        backgroundColor: topBg,
        borderBottom: `2px dashed ${isActive ? '#fca5a5' : '#e2e8f0'}`,
        padding: '1rem 1.25rem'
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.15rem' }}>
            {voucher.discountType === 'PERCENT' ? '% Giảm phần trăm' : '💰 Giảm tiền mặt'}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: accentColor, lineHeight: 1.1 }}>
            {voucher.discountType === 'PERCENT'
              ? `GIẢM ${voucher.discountValue}%`
              : `GIẢM ${fmtMoney(voucher.discountValue)}`}
          </div>
          {voucher.maxDiscount && (
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.15rem' }}>
              Tối đa {fmtMoney(voucher.maxDiscount)}
            </div>
          )}
        </div>

        <div style={{
          fontFamily: 'monospace', fontWeight: 800, fontSize: '0.875rem',
          backgroundColor: isActive ? '#fee2e2' : '#e2e8f0',
          color: isActive ? '#dc2626' : '#94a3b8',
          padding: '0.25rem 0.6rem', borderRadius: '6px', letterSpacing: '0.5px',
          marginTop: '0.2rem'
        }}>
          {voucher.code}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '0.85rem 1.25rem', flex: 1 }}>
        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
          {voucher.name}
        </div>
        {voucher.description && (
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.45rem', lineHeight: 1.4 }}>
            {voucher.description}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.8rem', color: '#64748b' }}>
          {voucher.minOrderValue > 0 && (
            <span>📦 Đơn tối thiểu <strong style={{ color: '#334155' }}>{fmtMoney(voucher.minOrderValue)}</strong></span>
          )}
          <span>
            🗓️ HSD: <strong style={{ color: '#334155' }}>{fmtDate(voucher.endDate)}</strong>
            {isActive && days <= 7 && days > 0 && (
              <span style={{ marginLeft: '0.4rem', color: '#dc2626', fontWeight: 700 }}>• Còn {days} ngày!</span>
            )}
          </span>
          {isActive && (
            <span>🎟️ Còn lại: <strong style={{ color: '#334155' }}>{remaining}</strong> / {voucher.quantity} lượt</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '0.75rem 1.25rem', borderTop: '1px solid #f1f5f9',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem'
      }}>
        <Link
          to="/my-vouchers"
          style={{ fontSize: '0.75rem', color: '#64748b', textDecoration: 'none' }}
        >
          Xem mã đã lưu →
        </Link>
        {renderActionButton()}
      </div>
    </div>
  );
};

// ─── Filter tabs ───────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'ALL',      label: 'Tất cả' },
  { key: 'ACTIVE',   label: '✅ Đang hoạt động' },
  { key: 'PERCENT',  label: '% Giảm %' },
  { key: 'FIXED',    label: '💰 Giảm tiền' },
  { key: 'EXPIRING', label: '⏰ Sắp hết hạn' },
  { key: 'SAVED',    label: '🔖 Đã lưu' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
const Vouchers = () => {
  const [vouchers,    setVouchers]   = useState([]);
  const [savedIds,    setSavedIds]   = useState([]);
  const [filter,      setFilter]     = useState('ALL');
  const [searchTerm,  setSearchTerm] = useState('');
  const [loading,     setLoading]    = useState(true);
  const [justSaved,   setJustSaved]  = useState(null); // id just saved (for toast-like feedback)

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await voucherService.getPublicVouchers();
        setVouchers(data);
        setSavedIds(voucherService.getSavedIds());
      } finally {
        setLoading(false);
      }
    };
    load();

    const handleDataChange = () => {
      load();
    };
    const handleSavedChange = () => {
      setSavedIds(voucherService.getSavedIds());
    };

    window.addEventListener('app_vouchers_changed', handleDataChange);
    window.addEventListener('app_saved_vouchers_changed', handleSavedChange);
    window.addEventListener('storage', handleDataChange);

    return () => {
      window.removeEventListener('app_vouchers_changed', handleDataChange);
      window.removeEventListener('app_saved_vouchers_changed', handleSavedChange);
      window.removeEventListener('storage', handleDataChange);
    };
  }, []);

  const handleSave = (id) => {
    voucherService.saveVoucher(id);
    setSavedIds(voucherService.getSavedIds());
    setJustSaved(id);
    setTimeout(() => setJustSaved(null), 2000);
  };

  const handleUnsave = (id) => {
    voucherService.unsaveVoucher(id);
    setSavedIds(voucherService.getSavedIds());
  };

  const filtered = useMemo(() => {
    return vouchers.filter((v) => {
      const status = getVoucherStatus(v);
      const days   = daysLeft(v.endDate);

      let ok = true;
      if (filter === 'ACTIVE')   ok = status === 'ACTIVE';
      else if (filter === 'PERCENT')  ok = v.discountType === 'PERCENT';
      else if (filter === 'FIXED')    ok = v.discountType === 'FIXED';
      else if (filter === 'EXPIRING') ok = status === 'ACTIVE' && days <= 7 && days > 0;
      else if (filter === 'SAVED')    ok = savedIds.includes(v.id);

      const matchSearch =
        !searchTerm ||
        v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.name.toLowerCase().includes(searchTerm.toLowerCase());

      return ok && matchSearch;
    });
  }, [vouchers, filter, searchTerm, savedIds]);

  const savedCount = savedIds.length;

  return (
    <div className="container page-container" style={{ paddingBottom: '4rem' }}>

      {/* ── Toast notification ── */}
      {justSaved && (
        <div style={{
          position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 9999,
          backgroundColor: '#16a34a', color: '#fff', padding: '0.75rem 1.25rem',
          borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          ✓ Đã lưu mã thành công!
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.3rem' }}>🎫 Mã giảm giá</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Bấm <strong>Lưu mã</strong> để lưu voucher vào kho của bạn, sau đó sử dụng khi thanh toán.
          </p>
        </div>
        <Link
          to="/my-vouchers"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.25rem', borderRadius: '10px',
            backgroundColor: savedCount > 0 ? '#dc2626' : '#f1f5f9',
            color: savedCount > 0 ? '#ffffff' : '#475569',
            fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none',
            transition: 'all 0.15s'
          }}
        >
          🎒 Mã của tôi
          {savedCount > 0 && (
            <span style={{
              backgroundColor: '#ffffff', color: '#dc2626',
              borderRadius: '9999px', padding: '0.1rem 0.5rem',
              fontSize: '0.75rem', fontWeight: 800
            }}>
              {savedCount}
            </span>
          )}
        </Link>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '0.45rem 1rem', borderRadius: '9999px', border: 'none',
              fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer',
              backgroundColor: filter === f.key ? '#dc2626' : '#f1f5f9',
              color: filter === f.key ? '#ffffff' : '#475569',
              transition: 'all 0.15s'
            }}
          >
            {f.label}
            {f.key === 'SAVED' && savedCount > 0 && (
              <span style={{ marginLeft: '0.3rem', fontWeight: 800 }}>({savedCount})</span>
            )}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', position: 'relative', minWidth: '200px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm mã..."
            style={{
              width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem',
              borderRadius: '9999px', border: '1px solid #e2e8f0',
              fontSize: '0.825rem', outline: 'none'
            }}
          />
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#94a3b8' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          Đang tải danh sách mã giảm giá...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🎫</div>
          <h3 style={{ color: '#0f172a', fontWeight: 700, marginBottom: '0.5rem' }}>Không có mã giảm giá phù hợp</h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.25rem' }}>Thử thay đổi bộ lọc hoặc tìm kiếm.</p>
          <button
            onClick={() => { setFilter('ALL'); setSearchTerm(''); }}
            style={{
              padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none',
              backgroundColor: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer'
            }}
          >
            Xem tất cả
          </button>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
            Hiển thị <strong style={{ color: '#334155' }}>{filtered.length}</strong> mã giảm giá
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {filtered.map((v) => (
              <VoucherCard
                key={v.id}
                voucher={v}
                isSaved={savedIds.includes(v.id)}
                onSave={handleSave}
                onUnsave={handleUnsave}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Bottom CTA ── */}
      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          Đã lưu {savedCount} mã giảm giá
        </p>
        <Link
          to="/my-vouchers"
          style={{
            padding: '0.65rem 1.75rem', borderRadius: '10px', backgroundColor: '#0f172a',
            color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem',
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          🎒 Xem mã giảm giá của tôi
        </Link>
      </div>
    </div>
  );
};

export default Vouchers;
