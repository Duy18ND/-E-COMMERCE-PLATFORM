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

const TABS = [
  { key: 'USABLE',   label: '✅ Có thể sử dụng' },
  { key: 'EXPIRING', label: '⏰ Sắp hết hạn' },
  { key: 'EXPIRED',  label: '🚫 Đã hết hạn / Hết lượt' },
];

// ─── Single saved voucher card ────────────────────────────────────────────────
const SavedVoucherCard = ({ voucher, onUnsave }) => {
  const status    = getVoucherStatus(voucher);
  const days      = daysLeft(voucher.endDate);
  const remaining = voucher.quantity - voucher.usedQuantity;
  const isUsable  = status === 'ACTIVE';
  const isExpired = ['EXPIRED', 'SOLD_OUT', 'INACTIVE'].includes(status);

  const borderColor = isUsable ? '#bfdbfe' : '#e2e8f0';
  const bgColor     = isUsable ? '#eff6ff' : '#f8fafc';

  const statusLabel = {
    ACTIVE:   { text: '✅ Có thể sử dụng', color: '#16a34a', bg: '#dcfce7' },
    UPCOMING: { text: '🕐 Sắp diễn ra',   color: '#d97706', bg: '#fef3c7' },
    EXPIRED:  { text: '⏰ Đã hết hạn',    color: '#dc2626', bg: '#fef2f2' },
    SOLD_OUT: { text: '🚫 Đã hết lượt',   color: '#7c3aed', bg: '#ede9fe' },
    INACTIVE: { text: '🔒 Tạm dừng',      color: '#64748b', bg: '#f1f5f9' },
  }[status] || { text: status, color: '#64748b', bg: '#f1f5f9' };

  return (
    <div style={{
      borderRadius: '14px',
      border: `1px solid ${borderColor}`,
      backgroundColor: '#ffffff',
      overflow: 'hidden',
      opacity: isExpired ? 0.65 : 1,
      display: 'flex',
      minWidth: 0,
      boxShadow: isUsable ? '0 2px 10px rgba(37,99,235,0.07)' : 'none',
    }}>
      {/* Left accent strip */}
      <div style={{
        width: '6px', flexShrink: 0,
        backgroundColor: isUsable ? '#2563eb' : (isExpired ? '#e2e8f0' : '#f59e0b')
      }} />

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, padding: '1rem 1.15rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>

        {/* Discount info (left) */}
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <span style={{
              fontFamily: 'monospace', fontWeight: 800, fontSize: '0.9rem',
              backgroundColor: bgColor, color: isUsable ? '#1d4ed8' : '#64748b',
              padding: '0.2rem 0.5rem', borderRadius: '5px', letterSpacing: '0.5px'
            }}>
              {voucher.code}
            </span>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem',
              borderRadius: '9999px', backgroundColor: statusLabel.bg, color: statusLabel.color
            }}>
              {statusLabel.text}
            </span>
          </div>

          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: isUsable ? '#dc2626' : '#94a3b8', marginBottom: '0.25rem' }}>
            {voucher.discountType === 'PERCENT'
              ? `GIẢM ${voucher.discountValue}%`
              : `GIẢM ${fmtMoney(voucher.discountValue)}`}
            {voucher.maxDiscount && (
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8', marginLeft: '0.4rem' }}>
                (tối đa {fmtMoney(voucher.maxDiscount)})
              </span>
            )}
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            {voucher.minOrderValue > 0 && (
              <span>📦 Đơn tối thiểu <strong>{fmtMoney(voucher.minOrderValue)}</strong></span>
            )}
            <span>
              🗓️ HSD: <strong>{fmtDate(voucher.endDate)}</strong>
              {isUsable && days <= 7 && days > 0 && (
                <span style={{ marginLeft: '0.4rem', color: '#dc2626', fontWeight: 700 }}>
                  • Còn {days} ngày!
                </span>
              )}
            </span>
            {isUsable && <span>🎟️ Còn lại: <strong>{remaining}</strong> lượt</span>}
          </div>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {isUsable && (
            <Link
              to="/checkout"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '0.55rem 1.1rem', borderRadius: '8px', border: 'none',
                backgroundColor: '#dc2626', color: '#ffffff',
                fontWeight: 700, fontSize: '0.825rem', textDecoration: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              Sử dụng ngay →
            </Link>
          )}
          <button
            onClick={() => onUnsave(voucher.id)}
            style={{
              padding: '0.4rem 0.85rem', borderRadius: '6px',
              border: '1px solid #fca5a5', backgroundColor: '#fef2f2',
              color: '#dc2626', fontSize: '0.775rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            Bỏ lưu
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const MyVouchers = () => {
  const [allVouchers, setAllVouchers]   = useState([]);
  const [savedIds,    setSavedIds]      = useState([]);
  const [tab,         setTab]           = useState('USABLE');
  const [loading,     setLoading]       = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Get ALL vouchers (including inactive) so we can show expired saved ones
        const data = await voucherService.getAll();
        setAllVouchers(data);
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

  const handleUnsave = (id) => {
    voucherService.unsaveVoucher(id);
    setSavedIds(voucherService.getSavedIds());
  };

  // Only vouchers the user saved
  const mySavedVouchers = useMemo(
    () => allVouchers.filter((v) => savedIds.includes(v.id)),
    [allVouchers, savedIds]
  );

  const tabCounts = useMemo(() => {
    const usable   = mySavedVouchers.filter((v) => getVoucherStatus(v) === 'ACTIVE').length;
    const expiring = mySavedVouchers.filter((v) => {
      const d = daysLeft(v.endDate);
      return getVoucherStatus(v) === 'ACTIVE' && d <= 7 && d > 0;
    }).length;
    const expired  = mySavedVouchers.filter((v) => ['EXPIRED', 'SOLD_OUT', 'INACTIVE'].includes(getVoucherStatus(v))).length;
    return { USABLE: usable, EXPIRING: expiring, EXPIRED: expired };
  }, [mySavedVouchers]);

  const displayed = useMemo(() => {
    return mySavedVouchers.filter((v) => {
      const s    = getVoucherStatus(v);
      const days = daysLeft(v.endDate);
      if (tab === 'USABLE')   return s === 'ACTIVE';
      if (tab === 'EXPIRING') return s === 'ACTIVE' && days <= 7 && days > 0;
      if (tab === 'EXPIRED')  return ['EXPIRED', 'SOLD_OUT', 'INACTIVE'].includes(s);
      return true;
    });
  }, [mySavedVouchers, tab]);

  return (
    <div className="container page-container" style={{ paddingBottom: '4rem' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.3rem' }}>🎒 Mã giảm giá của tôi</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Các voucher bạn đã lưu — chọn khi thanh toán để được giảm giá.
          </p>
        </div>
        <Link
          to="/vouchers"
          style={{
            padding: '0.6rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff', color: '#334155', fontWeight: 600,
            fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex',
            alignItems: 'center', gap: '0.4rem'
          }}
        >
          🎫 Lưu thêm mã
        </Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#94a3b8' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          Đang tải mã giảm giá của bạn...
        </div>
      ) : mySavedVouchers.length === 0 ? (
        /* Empty state */
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '0.75rem' }}>🎒</div>
          <h3 style={{ color: '#0f172a', fontWeight: 700, marginBottom: '0.5rem' }}>Bạn chưa lưu mã giảm giá nào</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Truy cập trang <strong>Mã giảm giá</strong> để tìm và lưu voucher phù hợp nhé!
          </p>
          <Link
            to="/vouchers"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 2rem', borderRadius: '10px', backgroundColor: '#dc2626',
              color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem'
            }}
          >
            🎫 Khám phá mã giảm giá
          </Link>
        </div>
      ) : (
        <>
          {/* ── Tabs ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0' }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '0.55rem 0.9rem', border: 'none',
                  borderBottom: tab === t.key ? '2px solid #dc2626' : '2px solid transparent',
                  backgroundColor: 'transparent',
                  color: tab === t.key ? '#dc2626' : '#64748b',
                  fontWeight: tab === t.key ? 700 : 500,
                  fontSize: '0.85rem', cursor: 'pointer',
                  marginBottom: '-1px', transition: 'all 0.15s'
                }}
              >
                {t.label}
                {tabCounts[t.key] > 0 && (
                  <span style={{
                    marginLeft: '0.4rem', backgroundColor: tab === t.key ? '#dc2626' : '#e2e8f0',
                    color: tab === t.key ? '#fff' : '#64748b',
                    borderRadius: '9999px', padding: '0.05rem 0.45rem',
                    fontSize: '0.725rem', fontWeight: 700
                  }}>
                    {tabCounts[t.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── List ── */}
          {displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
              <p style={{ fontWeight: 600 }}>Không có mã nào trong mục này.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {displayed.map((v) => (
                <SavedVoucherCard key={v.id} voucher={v} onUnsave={handleUnsave} />
              ))}
            </div>
          )}

          {/* ── Bottom link ── */}
          <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
            <Link
              to="/checkout"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.75rem 2rem', borderRadius: '10px',
                backgroundColor: '#dc2626', color: '#fff',
                fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem'
              }}
            >
              🛒 Đến trang thanh toán
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default MyVouchers;
