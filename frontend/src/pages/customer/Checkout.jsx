import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import orderService from '../../services/orderService';
import paymentService from '../../services/paymentService';
import voucherService, { getVoucherStatus, calcDiscount } from '../../services/voucherService';
import { PAYMENT_METHOD, PAYMENT_METHOD_LABELS } from '../../utils/constants';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import CartSummary from '../../components/cart/CartSummary';
import ErrorMessage from '../../components/common/ErrorMessage';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMoney = (n) => Number(n).toLocaleString('vi-VN') + 'đ';
const fmtDate  = (str) => {
  if (!str) return '';
  const d = new Date(str);
  return isNaN(d) ? str : `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

// ─── VoucherPickerModal ────────────────────────────────────────────────────────
/**
 * Hiển thị danh sách voucher User đã lưu.
 * Chỉ cho chọn những mã đủ điều kiện (ACTIVE + đủ đơn tối thiểu + còn lượt).
 */
const VoucherPickerModal = ({ isOpen, onClose, savedVouchers, orderTotal, appliedVoucherId, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff', borderRadius: '16px',
          width: '100%', maxWidth: '520px', maxHeight: '85vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>
              🎫 Chọn mã giảm giá
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Đơn hàng: <strong>{fmtMoney(orderTotal)}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
              cursor: 'pointer', fontSize: '1rem', color: '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {savedVouchers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎒</div>
              <p style={{ fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Bạn chưa lưu mã giảm giá nào
              </p>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                Hãy vào trang <strong>Mã giảm giá</strong> để lưu voucher trước.
              </p>
              <Link
                to="/vouchers"
                onClick={onClose}
                style={{
                  display: 'inline-block', padding: '0.55rem 1.25rem',
                  borderRadius: '8px', backgroundColor: '#dc2626',
                  color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem'
                }}
              >
                🎫 Đến kho mã giảm giá
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {savedVouchers.map((v) => {
                const status     = getVoucherStatus(v);
                const canApply   = status === 'ACTIVE' && orderTotal >= v.minOrderValue;
                const discount   = calcDiscount(v, orderTotal);
                const isSelected = v.id === appliedVoucherId;

                let disabledReason = null;
                if (status !== 'ACTIVE') {
                  disabledReason = status === 'EXPIRED' ? 'Đã hết hạn' : status === 'SOLD_OUT' ? 'Hết lượt dùng' : 'Không khả dụng';
                } else if (orderTotal < v.minOrderValue) {
                  disabledReason = `Cần đơn tối thiểu ${fmtMoney(v.minOrderValue)}`;
                }

                return (
                  <div
                    key={v.id}
                    style={{
                      borderRadius: '12px',
                      border: isSelected
                        ? '2px solid #dc2626'
                        : canApply ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#fef2f2' : canApply ? '#f8fbff' : '#f8fafc',
                      overflow: 'hidden',
                      opacity: canApply ? 1 : 0.65
                    }}
                  >
                    <div style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        {/* Code + name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: 'monospace', fontWeight: 800,
                            backgroundColor: canApply ? '#eff6ff' : '#f1f5f9',
                            color: canApply ? '#1d4ed8' : '#94a3b8',
                            padding: '0.15rem 0.5rem', borderRadius: '5px', fontSize: '0.875rem'
                          }}>
                            {v.code}
                          </span>
                          {isSelected && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', backgroundColor: '#fee2e2', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              Đang chọn
                            </span>
                          )}
                        </div>

                        {/* Discount value */}
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: canApply ? '#dc2626' : '#94a3b8', marginBottom: '0.2rem' }}>
                          {v.discountType === 'PERCENT'
                            ? `Giảm ${v.discountValue}%`
                            : `Giảm ${fmtMoney(v.discountValue)}`}
                          {v.maxDiscount && canApply && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, marginLeft: '0.35rem' }}>
                              (tối đa {fmtMoney(v.maxDiscount)})
                            </span>
                          )}
                        </div>

                        {/* Conditions */}
                        <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                          {v.minOrderValue > 0 && (
                            <span>Đơn từ {fmtMoney(v.minOrderValue)}</span>
                          )}
                          <span>HSD: {fmtDate(v.endDate)}</span>
                        </div>

                        {/* Disabled reason */}
                        {disabledReason && (
                          <div style={{ marginTop: '0.35rem', fontSize: '0.775rem', color: '#dc2626', fontWeight: 600 }}>
                            ⚠ {disabledReason}
                          </div>
                        )}

                        {/* Savings preview */}
                        {canApply && discount > 0 && (
                          <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>
                            → Bạn tiết kiệm được {fmtMoney(discount)}
                          </div>
                        )}
                      </div>

                      {/* Action button */}
                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
                        {isSelected ? (
                          <button
                            onClick={() => onSelect(null)}
                            style={{
                              padding: '0.45rem 0.9rem', borderRadius: '7px',
                              border: '1px solid #fca5a5', backgroundColor: '#fef2f2',
                              color: '#dc2626', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                            }}
                          >
                            Bỏ chọn
                          </button>
                        ) : (
                          <button
                            onClick={() => canApply && onSelect(v)}
                            disabled={!canApply}
                            style={{
                              padding: '0.45rem 0.9rem', borderRadius: '7px',
                              border: 'none',
                              backgroundColor: canApply ? '#dc2626' : '#e2e8f0',
                              color: canApply ? '#ffffff' : '#94a3b8',
                              fontWeight: 700, fontSize: '0.8rem',
                              cursor: canApply ? 'pointer' : 'not-allowed'
                            }}
                          >
                            {canApply ? 'Chọn' : 'Không đủ ĐK'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc', color: '#334155', fontWeight: 700,
              fontSize: '0.875rem', cursor: 'pointer'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Checkout ─────────────────────────────────────────────────────────────
const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, totalItems, totalPrice, totalOriginalPrice, totalDiscount, refreshCart, addToCart } = useCart();

  const [formData, setFormData] = useState({
    receiverName:   user?.fullName || 'Nguyễn Văn A',
    receiverPhone:  user?.phone    || '0912 345 678',
    streetAddress:  user?.address  || '123 Đường Cầu Giấy, Phường Dịch Vọng',
    city:           'Hà Nội',
    note:           'Giao trong giờ hành chính, gọi trước khi giao 15 phút',
    paymentMethod:  PAYMENT_METHOD.COD
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // ── Voucher state ──────────────────────────────────────────────────────────
  const [savedVouchers,   setSavedVouchers]   = useState([]);  // user's saved vouchers (full objects)
  const [appliedVoucher,  setAppliedVoucher]  = useState(null); // { voucher, discountAmount }
  const [pickerOpen,      setPickerOpen]      = useState(false);

  // Pre-fill user info
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        receiverName:  user.fullName || prev.receiverName,
        receiverPhone: user.phone    || prev.receiverPhone,
        streetAddress: user.address  || prev.streetAddress
      }));
    }
  }, [user]);

  // Load user's saved vouchers on mount and on storage events
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const data = await voucherService.getSavedVouchers();
        setSavedVouchers(data);
      } catch {
        setSavedVouchers([]);
      }
    };
    loadSaved();

    window.addEventListener('app_saved_vouchers_changed', loadSaved);
    window.addEventListener('app_vouchers_changed', loadSaved);
    window.addEventListener('storage', loadSaved);

    return () => {
      window.removeEventListener('app_saved_vouchers_changed', loadSaved);
      window.removeEventListener('app_vouchers_changed', loadSaved);
      window.removeEventListener('storage', loadSaved);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFillTestData = () => {
    setFormData({
      receiverName:  'Nguyễn Văn A',
      receiverPhone: '0912 345 678',
      streetAddress: '123 Đường Cầu Giấy, Phường Dịch Vọng',
      city:          'Hà Nội',
      note:          'Đơn hàng thử nghiệm Flash Sale ShopMart',
      paymentMethod: PAYMENT_METHOD.COD
    });
  };

  // ── Voucher handlers ───────────────────────────────────────────────────────
  const handleSelectVoucher = (v) => {
    if (!v) {
      setAppliedVoucher(null);
      setPickerOpen(false);
      return;
    }
    const discountAmount = calcDiscount(v, totalPrice);
    setAppliedVoucher({ voucher: v, discountAmount });
    setPickerOpen(false);
  };

  const handleRemoveVoucher = () => setAppliedVoucher(null);

  // Recalculate if cart total changes
  useEffect(() => {
    if (appliedVoucher) {
      const newDiscount = calcDiscount(appliedVoucher.voucher, totalPrice);
      setAppliedVoucher((prev) => prev ? { ...prev, discountAmount: newDiscount } : null);
    }
  }, [totalPrice]);

  const handleAddSampleItem = () => {
    addToCart(
      {
        id: 'fs-1',
        name: 'MacBook Pro 14 M3 Pro (18GB / 512GB SSD)',
        price: 49990000,
        salePrice: 32490000,
        discountPercent: 35,
        isFlashSale: true,
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80'
      },
      1
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (cartItems.length === 0) {
      setError('Giỏ hàng của bạn đang trống, không thể tiến hành đặt hàng!');
      return;
    }
    if (!formData.receiverName.trim() || !formData.receiverPhone.trim() || !formData.streetAddress.trim()) {
      setError('Vui lòng điền đầy đủ tên người nhận, số điện thoại và địa chỉ nhận hàng!');
      return;
    }

    const fullShippingAddress = formData.city
      ? `${formData.streetAddress.trim()}, ${formData.city.trim()}`
      : formData.streetAddress.trim();

    setLoading(true);
    try {
      // Tạo đơn hàng – kèm thông tin voucher để sẵn sàng tích hợp Backend
      const createdOrder = await orderService.checkout({
        receiverName:    formData.receiverName.trim(),
        receiverPhone:   formData.receiverPhone.trim(),
        shippingAddress: fullShippingAddress,
        note:            formData.note ? formData.note.trim() : '',
        paymentMethod:   formData.paymentMethod,
        // Voucher info – Backend có thể đọc trường này sau
        voucherId:       appliedVoucher?.voucher?.id     ?? null,
        voucherCode:     appliedVoucher?.voucher?.code   ?? null,
        discountAmount:  appliedVoucher?.discountAmount  ?? 0
      });

      if (formData.paymentMethod === PAYMENT_METHOD.MOCK_ONLINE && createdOrder?.id) {
        try { await paymentService.mockPay(createdOrder.id, true); }
        catch (payErr) { console.warn('Lỗi thanh toán mô phỏng:', payErr); }
      }

      await refreshCart();
      navigate('/order-success', { state: { orderId: createdOrder?.id, order: createdOrder } });
    } catch (err) {
      setError(err.message || 'Đặt hàng không thành công. Vui lòng kiểm tra lại thông tin giỏ hàng!');
    } finally {
      setLoading(false);
    }
  };

  // Derived totals
  const voucherDiscount  = appliedVoucher?.discountAmount ?? 0;
  const finalTotal       = Math.max(0, totalPrice - voucherDiscount);
  const savedVoucherCount = savedVouchers.length;

  return (
    <div className="container page-container" style={{ paddingBottom: '3rem' }}>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Thanh toán &amp; Xác nhận Đơn hàng</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Kiểm tra thông tin giao hàng và xác nhận đơn hàng của bạn
          </p>
        </div>
        <button
          type="button"
          onClick={handleFillTestData}
          style={{
            backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px',
            padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 700,
            color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
          }}
        >
          <span>⚡</span><span>Điền nhanh thông tin test</span>
        </button>
      </div>

      {error && <ErrorMessage message={error} onClose={() => setError('')} />}

      {cartItems.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>🛒</span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Giỏ hàng của bạn đang trống</h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 1.5rem' }}>
            Bạn cần có ít nhất 1 sản phẩm trong giỏ để thực hiện xác nhận đơn hàng.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleAddSampleItem}
              style={{
                backgroundColor: '#dc2626', color: '#ffffff', border: 'none',
                borderRadius: '8px', padding: '0.65rem 1.25rem', fontSize: '0.875rem',
                fontWeight: 700, cursor: 'pointer'
              }}
            >
              ⚡ Thêm sản phẩm mẫu Flash Sale để test ngay
            </button>
            <Link to="/flash-sale" style={{ textDecoration: 'none' }}>
              <Button variant="outline">Quay lại săn Flash Sale</Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ── Voucher picker modal ── */}
          <VoucherPickerModal
            isOpen={pickerOpen}
            onClose={() => setPickerOpen(false)}
            savedVouchers={savedVouchers}
            orderTotal={totalPrice}
            appliedVoucherId={appliedVoucher?.voucher?.id ?? null}
            onSelect={handleSelectVoucher}
          />

          <form onSubmit={handleSubmit}>
            <div
              style={{ display: 'grid', gridTemplateColumns: '1.75fr 1fr', gap: '2rem', alignItems: 'start' }}
              className="grid-cols-2"
            >
              {/* ── Left column ── */}
              <div className="card" style={{ padding: '1.75rem' }}>

                {/* Section 1: Shipping info */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>📍</span><span>1. Thông tin người nhận hàng</span>
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                    Sẵn sàng đặt hàng
                  </span>
                </div>

                <Input label="Họ và tên người nhận" name="receiverName" required value={formData.receiverName} onChange={handleChange} placeholder="Nguyễn Văn A" />
                <Input label="Số điện thoại nhận hàng" name="receiverPhone" type="tel" required value={formData.receiverPhone} onChange={handleChange} placeholder="0912345678" />
                <Input label="Địa chỉ chi tiết (Số nhà, tên đường, phường/xã)" name="streetAddress" required value={formData.streetAddress} onChange={handleChange} placeholder="Số nhà 123, đường Cầu Giấy, phường Dịch Vọng" />
                <Input label="Tỉnh / Thành phố" name="city" value={formData.city} onChange={handleChange} placeholder="Hà Nội, TP.HCM..." />
                <Input label="Ghi chú đơn hàng (Tùy chọn)" name="note" value={formData.note} onChange={handleChange} placeholder="Giao trong giờ hành chính, gọi trước khi giao..." />

                {/* Section 2: Payment method */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>💳</span><span>2. Phương thức thanh toán</span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { value: PAYMENT_METHOD.COD,         icon: '💵', desc: 'Thanh toán bằng tiền mặt khi shipper giao tận nơi và đồng kiểm hàng' },
                      { value: PAYMENT_METHOD.MOCK_ONLINE,  icon: '💳', desc: 'Tự động duyệt trạng thái Đã Thanh Toán (PAID) phục vụ kiểm thử nhanh' }
                    ].map((pm) => (
                      <label key={pm.value} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.75rem 1rem', borderRadius: '10px', cursor: 'pointer',
                        border: formData.paymentMethod === pm.value ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: formData.paymentMethod === pm.value ? '#eff6ff' : '#ffffff'
                      }}>
                        <input type="radio" name="paymentMethod" value={pm.value} checked={formData.paymentMethod === pm.value} onChange={handleChange} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                            {pm.icon} {PAYMENT_METHOD_LABELS[pm.value]}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{pm.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Section 3: Voucher */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>🎫</span><span>3. Mã giảm giá</span>
                  </h3>

                  {appliedVoucher ? (
                    /* Applied state */
                    <div style={{
                      backgroundColor: '#f0fdf4', border: '1px solid #86efac',
                      borderRadius: '10px', padding: '0.85rem 1rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: 'monospace', fontWeight: 800,
                            backgroundColor: '#dcfce7', color: '#16a34a',
                            padding: '0.15rem 0.5rem', borderRadius: '5px', fontSize: '0.875rem'
                          }}>
                            {appliedVoucher.voucher.code}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700 }}>✓ Đã áp dụng</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
                          Tiết kiệm <strong>{fmtMoney(appliedVoucher.discountAmount)}</strong> cho đơn hàng này
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => setPickerOpen(true)}
                          style={{
                            padding: '0.4rem 0.75rem', borderRadius: '7px',
                            border: '1px solid #bfdbfe', backgroundColor: '#eff6ff',
                            color: '#1d4ed8', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          Thay đổi
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveVoucher}
                          style={{
                            padding: '0.4rem 0.75rem', borderRadius: '7px',
                            border: '1px solid #fca5a5', backgroundColor: '#fef2f2',
                            color: '#dc2626', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          Xóa mã
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Select state */
                    <div>
                      <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        style={{
                          width: '100%', padding: '0.75rem 1rem',
                          borderRadius: '10px', border: '2px dashed #bfdbfe',
                          backgroundColor: '#f8fbff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          color: '#1d4ed8', fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.backgroundColor = '#f8fbff'; }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          🎫
                          {savedVoucherCount > 0
                            ? `Chọn mã giảm giá (${savedVoucherCount} mã đã lưu)`
                            : 'Chọn mã giảm giá'}
                        </span>
                        <span>›</span>
                      </button>
                      <p style={{ margin: '0.4rem 0 0', fontSize: '0.775rem', color: '#94a3b8' }}>
                        Chưa có mã?{' '}
                        <Link to="/vouchers" style={{ color: '#2563eb', fontWeight: 600 }}>
                          Xem kho mã giảm giá →
                        </Link>
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit */}
                <div style={{ marginTop: '1.75rem' }}>
                  <button
                    type="submit"
                    disabled={loading || cartItems.length === 0}
                    style={{
                      width: '100%', backgroundColor: '#dc2626', color: '#ffffff',
                      border: 'none', borderRadius: '10px', padding: '0.95rem',
                      fontSize: '1rem', fontWeight: 800,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
                      transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#b91c1c'; }}
                    onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#dc2626'; }}
                  >
                    <span>{loading ? '⏳' : '✓'}</span>
                    <span>{loading ? 'Đang xác nhận đơn hàng...' : 'Xác nhận Đặt hàng'}</span>
                  </button>
                </div>
              </div>

              {/* ── Right column: Order Summary ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <CartSummary
                  totalItems={totalItems}
                  totalPrice={totalPrice}
                  totalOriginalPrice={totalOriginalPrice}
                  totalDiscount={totalDiscount}
                  showCheckoutButton={false}
                />

                {/* Voucher discount + final total */}
                {appliedVoucher && (
                  <div style={{
                    backgroundColor: '#f0fdf4', border: '1px solid #86efac',
                    borderRadius: '12px', padding: '1rem 1.1rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#166534', fontWeight: 700, marginBottom: '0.5rem' }}>
                      <span>🎫 Voucher ({appliedVoucher.voucher.code})</span>
                      <span>-{fmtMoney(appliedVoucher.discountAmount)}</span>
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      paddingTop: '0.6rem', borderTop: '1px solid #bbf7d0',
                      fontSize: '1.1rem', fontWeight: 800, color: '#0f172a'
                    }}>
                      <span>Thành tiền</span>
                      <span style={{ color: '#dc2626' }}>{fmtMoney(finalTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default Checkout;
