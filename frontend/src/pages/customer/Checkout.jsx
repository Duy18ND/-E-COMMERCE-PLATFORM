import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import useNotification from '../../hooks/useNotification';
import { USE_MOCK_AUTH } from '../../services/authService';
import userService from '../../services/userService';
import { getToken } from '../../utils/auth';
import orderService from '../../services/orderService';
import paymentService from '../../services/paymentService';
import voucherService, { getVoucherStatus, calcDiscount, parseLocalDateBoundary } from '../../services/voucherService';
import {
  PAYMENT_METHOD,
  PAYMENT_METHOD_LABELS,
  ONLINE_PAYMENT_PROVIDERS,
  ONLINE_PAYMENT_METHODS_LIST
} from '../../utils/constants';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import CartSummary from '../../components/cart/CartSummary';
import ErrorMessage from '../../components/common/ErrorMessage';
import QrPaymentModal from '../../components/order/QrPaymentModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtMoney = (n) => Number(n).toLocaleString('vi-VN') + 'đ';
const fmtDate  = (str) => {
  if (!str) return '';
  const d = parseLocalDateBoundary(str, false);
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
          padding: '1.1rem 1.25rem', borderBottom: '1px solid #f1f5f9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem'
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
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
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
                const minOrder   = Number(v.minOrderValue || 0);
                const canApply   = status === 'ACTIVE' && orderTotal > 0 && orderTotal >= minOrder;
                const discount   = calcDiscount(v, orderTotal);
                const isSelected = v.id === appliedVoucherId;

                let disabledReason = null;
                if (status !== 'ACTIVE') {
                  disabledReason = status === 'EXPIRED' ? 'Đã hết hạn' : status === 'SOLD_OUT' ? 'Hết lượt dùng' : 'Không khả dụng';
                } else if (orderTotal <= 0 || orderTotal < minOrder) {
                  disabledReason = `Cần đơn tối thiểu ${fmtMoney(minOrder)}`;
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
                    <div style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
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
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
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

// Pure address mapping helpers (exported for verification)

const normalizeTextSegment = (val) =>
  String(val || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

/**
 * Ghép phần địa chỉ chi tiết từ AddressResponse (addressLine, ward, district),
 * loại bỏ trùng lặp nếu segment cuối trùng với city.
 */
export const buildStreetAddressFromDto = (addr) => {
  if (!addr || typeof addr !== 'object') return '';
  const cityNorm = normalizeTextSegment(addr.city);
  const rawParts = [addr.addressLine, addr.ward, addr.district]
    .map((part) => (part ? String(part).trim() : ''))
    .filter(Boolean);

  const uniqueParts = [];
  for (const part of rawParts) {
    const partNorm = normalizeTextSegment(part);
    if (cityNorm && partNorm === cityNorm) continue;
    if (!uniqueParts.some((existing) => normalizeTextSegment(existing) === partNorm)) {
      uniqueParts.push(part);
    }
  }
  return uniqueParts.join(', ');
};

/**
 * Ghép streetAddress và city thành shippingAddress gửi Backend, không ghép tỉnh/thành phố 2 lần.
 */
export const composeFullShippingAddress = (streetAddress, city) => {
  const cleanStreet = String(streetAddress || '').trim().replace(/,+\s*$/, '');
  const cleanCity = String(city || '').trim();
  if (!cleanCity) return cleanStreet;
  if (!cleanStreet) return cleanCity;

  const streetNorm = normalizeTextSegment(cleanStreet);
  const cityNorm = normalizeTextSegment(cleanCity);
  const streetSegments = cleanStreet.split(',').map((s) => normalizeTextSegment(s)).filter(Boolean);
  const lastSegment = streetSegments[streetSegments.length - 1] || '';

  if (
    streetNorm === cityNorm ||
    lastSegment === cityNorm ||
    streetNorm.endsWith(`, ${cityNorm}`)
  ) {
    return cleanStreet;
  }
  return `${cleanStreet}, ${cleanCity}`;
};

/**
 * Ánh xạ dữ liệu nhận hàng từ AddressResponse + Profile thực tế của Backend (không dùng dữ liệu giả).
 */
export const mapAddressToCheckoutFields = (addr, profile = null, fallbackUser = null) => ({
  receiverName: addr?.receiverName || profile?.fullName || fallbackUser?.fullName || '',
  receiverPhone: addr?.phone || profile?.phone || fallbackUser?.phone || '',
  streetAddress: addr ? buildStreetAddressFromDto(addr) : '',
  city: addr?.city ? String(addr.city).trim() : ''
});

// ─── Main Checkout ─────────────────────────────────────────────────────────────
const Checkout = () => {
  const navigate = useNavigate();
  const { user, isMockAuth } = useAuth();
  const { cartItems, totalItems, totalPrice, totalOriginalPrice, totalDiscount, refreshCart, addToCart } = useCart();
  const { notify } = useNotification();

  const [formData, setFormData] = useState({
    receiverName:   '',
    receiverPhone:  '',
    streetAddress:  '',
    city:           '',
    note:           '',
    paymentMethod:  PAYMENT_METHOD.COD
  });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const userEditedRef = useRef(false);
  const [selectedOnlineMethod, setSelectedOnlineMethod] = useState(ONLINE_PAYMENT_PROVIDERS.MOMO);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // ── Voucher state ──────────────────────────────────────────────────────────
  const [savedVouchers,   setSavedVouchers]   = useState([]);  // user's saved vouchers (full objects)
  const [appliedVoucher,  setAppliedVoucher]  = useState(null); // { voucher, discountAmount }
  const [pickerOpen,      setPickerOpen]      = useState(false);

  // ── QR payment state (đơn thanh toán trực tuyến chờ quét mã VietQR) ───────
  const [qrOrder, setQrOrder] = useState(null);

  // Tải hồ sơ & sổ địa chỉ thực tế từ Backend API khi mở trang Checkout
  useEffect(() => {
    let isMounted = true;
    const token = getToken();
    const isMockSession = Boolean(
      USE_MOCK_AUTH || isMockAuth || (typeof token === 'string' && token.startsWith('mock-'))
    );

    if (isMockSession) {
      setSavedAddresses([]);
      setSelectedAddressId('');
      if (user && !userEditedRef.current) {
        setFormData((prev) => ({
          ...prev,
          receiverName:  user?.fullName || prev.receiverName,
          receiverPhone: user?.phone    || prev.receiverPhone,
          streetAddress: user?.address  || prev.streetAddress
        }));
      }
      return undefined;
    }

    const loadCheckoutRecipientData = async () => {
      setAddressLoading(true);
      try {
        const [profileRes, addressesRes] = await Promise.allSettled([
          userService.getProfile(),
          userService.getAddresses()
        ]);

        if (!isMounted) return;

        const profile = profileRes.status === 'fulfilled' ? profileRes.value : null;
        const apiAddresses =
          addressesRes.status === 'fulfilled' && Array.isArray(addressesRes.value)
            ? addressesRes.value
            : [];
        const profileAddresses = Array.isArray(profile?.addresses) ? profile.addresses : [];
        const addressList = apiAddresses.length > 0 ? apiAddresses : profileAddresses;

        setSavedAddresses(addressList);

        const defaultAddr =
          profile?.defaultAddress ||
          addressList.find((addr) => Boolean(addr?.isDefault)) ||
          addressList[0] ||
          null;

        if (defaultAddr?.id != null) {
          setSelectedAddressId(String(defaultAddr.id));
        } else {
          setSelectedAddressId(addressList.length > 0 ? 'CUSTOM' : '');
        }

        if (!userEditedRef.current) {
          const mapped = mapAddressToCheckoutFields(defaultAddr, profile, user);
          setFormData((prev) => ({
            ...prev,
            receiverName:  mapped.receiverName,
            receiverPhone: mapped.receiverPhone,
            streetAddress: mapped.streetAddress,
            city:          mapped.city,
            note:          prev.note || ''
          }));
        }
      } finally {
        if (isMounted) {
          setAddressLoading(false);
        }
      }
    };

    loadCheckoutRecipientData();
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.userId, user?.fullName, user?.phone, user?.address, isMockAuth]);

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
    if (name === 'receiverName' || name === 'receiverPhone' || name === 'streetAddress' || name === 'city') {
      userEditedRef.current = true;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectSavedAddress = (e) => {
    const nextId = e.target.value;
    setSelectedAddressId(nextId);
    userEditedRef.current = true;

    if (!nextId || nextId === 'CUSTOM') {
      setFormData((prev) => ({
        ...prev,
        streetAddress: '',
        city: ''
      }));
      return;
    }

    const picked = savedAddresses.find((addr) => String(addr.id) === String(nextId));
    if (picked) {
      const mapped = mapAddressToCheckoutFields(picked, null, user);
      setFormData((prev) => ({
        ...prev,
        receiverName: mapped.receiverName,
        receiverPhone: mapped.receiverPhone,
        streetAddress: mapped.streetAddress,
        city: mapped.city
      }));
    }
  };

  const handleFillTestData = () => {
    if (!import.meta.env.DEV) return;
    userEditedRef.current = true;
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
    const currentSubtotal = Number(totalPrice) || 0;
    const currentShippingFee = 0;
    const currentDiscount = calcDiscount(v, currentSubtotal);
    if (currentDiscount <= 0 || currentSubtotal <= 0 || currentSubtotal < Number(v.minOrderValue || 0)) {
      setAppliedVoucher(null);
      setPickerOpen(false);
      return;
    }
    const currentTotal = Math.max(0, currentSubtotal - currentDiscount) + currentShippingFee;

    setAppliedVoucher({
      voucher: v,
      couponCode: v.code,
      subtotal: currentSubtotal,
      discountAmount: currentDiscount,
      shippingFee: currentShippingFee,
      totalAmount: currentTotal
    });
    setPickerOpen(false);
  };

  const handleRemoveVoucher = () => setAppliedVoucher(null);

  // Recalculate if cart total changes (and auto-invalidate if order drops below minOrderValue)
  useEffect(() => {
    if (appliedVoucher) {
      const v = appliedVoucher.voucher;
      const status = getVoucherStatus(v);
      const minOrder = Number(v?.minOrderValue || 0);
      if (!v || status !== 'ACTIVE' || totalPrice <= 0 || totalPrice < minOrder) {
        setAppliedVoucher(null);
        return;
      }
      const currentSubtotal = Number(totalPrice) || 0;
      const currentShippingFee = Number(appliedVoucher.shippingFee ?? 0);
      const newDiscount = calcDiscount(v, currentSubtotal);
      const newTotal = Math.max(0, currentSubtotal - newDiscount) + currentShippingFee;
      setAppliedVoucher((prev) =>
        prev
          ? {
              ...prev,
              couponCode: v.code,
              subtotal: currentSubtotal,
              discountAmount: newDiscount,
              shippingFee: currentShippingFee,
              totalAmount: newTotal
            }
          : null
      );
    }
  }, [totalPrice]);

  // Derived totals (Công thức: totalAmount = subtotal - discountAmount + shippingFee)
  const subtotal          = Number(totalPrice) || 0;
  const shippingFee       = Number(appliedVoucher?.shippingFee ?? 0);
  const couponCode        = appliedVoucher?.couponCode ?? appliedVoucher?.voucher?.code ?? null;
  const voucherDiscount   = Number(appliedVoucher?.discountAmount ?? 0);
  const discountAmount    = appliedVoucher ? voucherDiscount : 0;
  const finalTotal        = Math.max(0, totalPrice - voucherDiscount) + shippingFee;
  const totalAmount       = finalTotal;
  const savedVoucherCount = savedVouchers.length;

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

  const selectedProvider =
    ONLINE_PAYMENT_METHODS_LIST.find((m) => m.id === selectedOnlineMethod) ||
    ONLINE_PAYMENT_METHODS_LIST[0];
  const isOnlineMethod = formData.paymentMethod === PAYMENT_METHOD.MOCK_ONLINE;

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

    const fullShippingAddress = composeFullShippingAddress(
      formData.streetAddress,
      formData.city
    );

    setLoading(true);
    try {
      // Tạo đơn hàng – kèm đầy đủ thông tin tạm tính (đã áp giá Flash Sale), giảm giá Voucher và thông tin thanh toán
      const createdOrder = await orderService.checkout({
        receiverName:               formData.receiverName.trim(),
        receiverPhone:              formData.receiverPhone.trim(),
        shippingAddress:            fullShippingAddress,
        note:                       formData.note ? formData.note.trim() : '',
        paymentMethod:              formData.paymentMethod,
        onlinePaymentProvider:      isOnlineMethod ? selectedOnlineMethod : null,
        onlinePaymentProviderLabel: isOnlineMethod ? selectedProvider.title || selectedProvider.name : null,
        couponCode,
        voucherId:                  appliedVoucher?.voucher?.id ?? null,
        voucherCode:                couponCode ?? null,
        subtotal,
        subtotalAmount:             totalPrice,
        originalAmount:             totalOriginalPrice > totalPrice ? totalOriginalPrice : totalPrice,
        productDiscountAmount:      totalDiscount,
        discountAmount:             voucherDiscount,
        shippingFee,
        totalAmount,
        finalTotal
      });

      const resolvedSubtotal = Number(createdOrder?.subtotalAmount || totalPrice || 0);
      const resolvedVoucherDiscount = Math.max(Number(createdOrder?.discountAmount || 0), voucherDiscount);
      const resolvedPayableTotal =
        finalTotal >= 0 && totalPrice > 0
          ? finalTotal
          : Math.max(0, resolvedSubtotal - resolvedVoucherDiscount);
      const normalizedCreatedOrder = {
        ...createdOrder,
        originalAmount:        Math.max(Number(createdOrder?.originalAmount || 0), totalOriginalPrice || resolvedSubtotal),
        subtotalAmount:        resolvedSubtotal,
        productDiscountAmount: Math.max(Number(createdOrder?.productDiscountAmount || 0), totalDiscount || 0),
        voucherCode:           createdOrder?.voucherCode || appliedVoucher?.voucher?.code || null,
        discountAmount:        resolvedVoucherDiscount,
        totalAmount:           resolvedPayableTotal
      };

      await refreshCart();

      // Thanh toán trực tuyến (khác COD): giữ đơn PENDING và mở màn hình quét mã QR thay vì chuyển trang ngay
      const isOnlinePayment = formData.paymentMethod !== PAYMENT_METHOD.COD;
      if (isOnlinePayment && normalizedCreatedOrder?.id && normalizedCreatedOrder?.status !== 'PAID') {
        setQrOrder(normalizedCreatedOrder);
        notify.success(`Đặt hàng thành công! Vui lòng quét mã QR để thanh toán đơn hàng #${normalizedCreatedOrder.id}.`);
        return;
      }

      notify.success(`Đặt hàng thành công! Đơn hàng #${normalizedCreatedOrder?.id || ''} đã được ghi nhận.`);
      navigate('/order-success', {
        state: {
          orderId: normalizedCreatedOrder?.id,
          order: normalizedCreatedOrder,
          isOnlinePayment: isOnlineMethod,
          onlineProvider: selectedProvider,
          onlineMethod: selectedProvider.title || selectedProvider.name,
          amountPaid: resolvedPayableTotal
        }
      });
    } catch (err) {
      const errMsg = err.message || 'Đặt hàng không thành công. Vui lòng kiểm tra lại thông tin giỏ hàng!';
      setError(errMsg);
      notify.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // ── QR payment handlers ────────────────────────────────────────────────────
  // Gọi API POST /payments/mock-pay/{orderId} với body { success, note }
  const handleQrPay = (success, note) => paymentService.mockPay(qrOrder.id, success, note);

  const handleQrPaid = () => {
    const orderId = qrOrder?.id;
    notify.success(`Thanh toán thành công! Đơn hàng #${orderId} đã chuyển sang ĐÃ THANH TOÁN (PAID).`);
    setQrOrder(null);
    navigate(`/orders/${orderId}`, { state: { expectedStatus: 'PAID', fromQrPayment: true } });
  };

  const handleQrFailed = () => {
    const orderId = qrOrder?.id;
    notify.error(`Thanh toán đơn hàng #${orderId} thất bại. Hệ thống đã hoàn lại tồn kho và lượt sử dụng Voucher (Saga Rollback).`);
    setQrOrder(null);
    navigate(`/orders/${orderId}`, { state: { expectedStatus: 'FAILED', fromQrPayment: true } });
  };

  const handleQrPayLater = () => {
    const orderId = qrOrder?.id;
    notify.info(`Đơn hàng #${orderId} đang chờ thanh toán. Bạn có thể bấm "Thanh toán QR ngay" trong chi tiết đơn hàng bất cứ lúc nào.`);
    setQrOrder(null);
    navigate(`/orders/${orderId}`);
  };
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
        {import.meta.env.DEV && (
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
        )}
      </div>

      {error && <ErrorMessage message={error} onClose={() => setError('')} />}

      {/* ── Màn hình quét mã QR thanh toán (VietQR) cho đơn online vừa tạo ── */}
      <QrPaymentModal
        isOpen={!!qrOrder}
        order={qrOrder}
        onPay={handleQrPay}
        onPaid={handleQrPaid}
        onFailed={handleQrFailed}
        onPayLater={handleQrPayLater}
      />

      {qrOrder ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>📱</span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
            Đơn hàng #{qrOrder.id} đang chờ thanh toán
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 0' }}>
            Vui lòng hoàn tất quét mã QR để xác nhận thanh toán.
          </p>
        </div>
      ) : cartItems.length === 0 ? (
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
            <div className="layout-split">
              {/* ── Left column ── */}
              <div className="card" style={{ padding: 'clamp(1rem, 3vw, 1.75rem)', minWidth: 0 }}>

                {/* Section 1: Shipping info */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>📍</span><span>1. Thông tin người nhận hàng</span>
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                    Sẵn sàng đặt hàng
                  </span>
                </div>

                {addressLoading ? (
                  <div style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '0.85rem' }}>
                    Đang tải thông tin người nhận từ hồ sơ của bạn...
                  </div>
                ) : savedAddresses.length > 0 && (
                  <div style={{
                    marginBottom: '1rem',
                    padding: '0.8rem 0.95rem',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0'
                  }}>
                    <label
                      htmlFor="saved-address-select"
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#334155',
                        marginBottom: '0.4rem'
                      }}
                    >
                      Chọn từ sổ địa chỉ ({savedAddresses.length} địa chỉ đã lưu)
                    </label>
                    <select
                      id="saved-address-select"
                      name="savedAddressId"
                      value={selectedAddressId}
                      onChange={handleSelectSavedAddress}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.875rem'
                      }}
                    >
                      {savedAddresses.map((addr) => {
                        const labelParts = [
                          addr.receiverName,
                          addr.phone,
                          composeFullShippingAddress(buildStreetAddressFromDto(addr), addr.city)
                        ].filter(Boolean);
                        return (
                          <option key={addr.id} value={String(addr.id)}>
                            {addr.isDefault ? '[Mặc định] ' : ''}
                            {labelParts.join(' - ')}
                          </option>
                        );
                      })}
                      <option value="CUSTOM">Nhập địa chỉ nhận hàng khác</option>
                    </select>
                  </div>
                )}

                <Input label="Họ và tên người nhận" name="receiverName" required value={formData.receiverName} onChange={handleChange} placeholder="Nhập họ và tên người nhận" />
                <Input label="Số điện thoại nhận hàng" name="receiverPhone" type="tel" required value={formData.receiverPhone} onChange={handleChange} placeholder="Nhập số điện thoại nhận hàng (VD: 0912345678)" />
                <Input label="Địa chỉ chi tiết (Số nhà, tên đường, phường/xã, quận/huyện)" name="streetAddress" required value={formData.streetAddress} onChange={handleChange} placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện" />
                <Input label="Tỉnh / Thành phố" name="city" value={formData.city} onChange={handleChange} placeholder="Nhập tỉnh / thành phố" />
                <Input label="Ghi chú đơn hàng (Tùy chọn)" name="note" value={formData.note} onChange={handleChange} placeholder="Nhập ghi chú giao hàng nếu cần (tùy chọn)" />

                {/* Section 2: Payment method */}
                <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>💳</span><span>2. Phương thức thanh toán</span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Lựa chọn 1: COD */}
                    <label style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                      padding: '0.85rem 1rem', borderRadius: '10px', cursor: 'pointer',
                      border: formData.paymentMethod === PAYMENT_METHOD.COD ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: formData.paymentMethod === PAYMENT_METHOD.COD ? '#eff6ff' : '#ffffff',
                      transition: 'all 0.15s ease'
                    }}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={PAYMENT_METHOD.COD}
                        checked={formData.paymentMethod === PAYMENT_METHOD.COD}
                        onChange={handleChange}
                        style={{ marginTop: '3px', accentColor: '#2563eb' }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>💵</span>
                          <span>{PAYMENT_METHOD_LABELS[PAYMENT_METHOD.COD]}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                          Thanh toán bằng tiền mặt khi shipper giao tận nơi và đồng kiểm hàng
                        </div>
                      </div>
                    </label>

                    {/* Lựa chọn 2: Thanh toán trực tuyến */}
                    <div style={{
                      borderRadius: '10px',
                      border: formData.paymentMethod === PAYMENT_METHOD.MOCK_ONLINE ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: formData.paymentMethod === PAYMENT_METHOD.MOCK_ONLINE ? '#f8faff' : '#ffffff',
                      overflow: 'hidden',
                      transition: 'all 0.15s ease'
                    }}>
                      <label style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                        padding: '0.85rem 1rem', cursor: 'pointer',
                        backgroundColor: formData.paymentMethod === PAYMENT_METHOD.MOCK_ONLINE ? '#eff6ff' : 'transparent',
                        borderBottom: formData.paymentMethod === PAYMENT_METHOD.MOCK_ONLINE ? '1px solid #bfdbfe' : 'none'
                      }}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={PAYMENT_METHOD.MOCK_ONLINE}
                          checked={formData.paymentMethod === PAYMENT_METHOD.MOCK_ONLINE}
                          onChange={handleChange}
                          style={{ marginTop: '3px', accentColor: '#2563eb' }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.35rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>💳</span>
                              <span>{PAYMENT_METHOD_LABELS[PAYMENT_METHOD.MOCK_ONLINE]}</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '4px' }}>
                              Khuyên dùng
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                            Hỗ trợ MoMo, ZaloPay, VietQR / Chuyển khoản ngân hàng và Thẻ quốc tế Visa/Mastercard — Tự động duyệt trạng thái Đã Thanh Toán (PAID)
                          </div>
                        </div>
                      </label>

                      {/* Danh sách 4 phương thức trực tuyến - Chỉ hiển thị khi chọn Thanh toán trực tuyến */}
                      {formData.paymentMethod === PAYMENT_METHOD.MOCK_ONLINE && (
                        <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>👇</span><span>Chọn phương thức thanh toán trực tuyến:</span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.6rem' }}>
                            {ONLINE_PAYMENT_METHODS_LIST.map((method) => {
                              const isSelected = selectedOnlineMethod === method.id;
                              return (
                                <label
                                  key={method.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.65rem',
                                    padding: '0.75rem 0.85rem',
                                    borderRadius: '8px',
                                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                    backgroundColor: isSelected ? '#ffffff' : '#f8fafc',
                                    boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.15)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name="onlinePaymentProvider"
                                    value={method.id}
                                    checked={isSelected}
                                    onChange={() => setSelectedOnlineMethod(method.id)}
                                    style={{ accentColor: '#2563eb' }}
                                  />
                                  <div style={{ fontSize: '1.35rem', lineHeight: 1 }}>{method.icon}</div>
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: isSelected ? '#1e40af' : '#1e293b' }}>
                                      {method.name}
                                    </div>
                                    <div style={{ fontSize: '0.725rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {method.title}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <span style={{ color: '#2563eb', fontWeight: 800, fontSize: '0.9rem' }}>✓</span>
                                  )}
                                </label>
                              );
                            })}
                          </div>

                          {/* Xác nhận thanh toán: Hiển thị phương thức đã chọn & Tổng tiền cần thanh toán */}
                          <div style={{
                            marginTop: '0.4rem',
                            padding: '0.85rem 1rem',
                            borderRadius: '8px',
                            backgroundColor: '#ffffff',
                            border: '1.5px dashed #93c5fd',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.45rem'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem', fontSize: '0.85rem' }}>
                              <span style={{ color: '#64748b' }}>Phương thức đã chọn:</span>
                              <span style={{ fontWeight: 700, color: '#1e40af', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span>{selectedProvider.icon}</span>
                                <span>{selectedProvider.title || selectedProvider.name}</span>
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.45rem' }}>
                              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Tổng tiền cần thanh toán:</span>
                              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#dc2626' }}>
                                {fmtMoney(totalAmount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
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
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem'
                    }}>
                      <div style={{ minWidth: 0 }}>
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
                      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, flexWrap: 'wrap' }}>
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
                      width: '100%',
                      backgroundColor: isOnlineMethod ? '#2563eb' : '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.95rem',
                      fontSize: '1rem',
                      fontWeight: 800,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: isOnlineMethod ? '0 4px 14px rgba(37, 99, 235, 0.35)' : '0 4px 14px rgba(220, 38, 38, 0.35)',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading && cartItems.length > 0) {
                        e.currentTarget.style.backgroundColor = isOnlineMethod ? '#1d4ed8' : '#b91c1c';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading && cartItems.length > 0) {
                        e.currentTarget.style.backgroundColor = isOnlineMethod ? '#2563eb' : '#dc2626';
                      }
                    }}
                  >
                    <span>{loading ? '⏳' : (isOnlineMethod ? '🔒' : '✓')}</span>
                    <span>
                      {loading
                        ? (isOnlineMethod ? 'Đang xử lý thanh toán...' : 'Đang xác nhận đơn hàng...')
                        : (isOnlineMethod ? 'Xác nhận thanh toán' : 'Xác nhận Đặt hàng')}
                    </span>
                  </button>
                </div>
              </div>

              {/* ── Right column: Order Summary ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>
                <CartSummary
                  totalItems={totalItems}
                  totalPrice={totalPrice}
                  totalOriginalPrice={totalOriginalPrice}
                  totalDiscount={totalDiscount}
                  couponCode={couponCode}
                  couponDiscount={discountAmount}
                  shippingFee={shippingFee}
                  finalTotal={totalAmount}
                  showCheckoutButton={false}
                />

                {/* Voucher discount + final total */}
                {appliedVoucher && (
                  <div style={{
                    backgroundColor: '#f0fdf4', border: '1px solid #86efac',
                    borderRadius: '12px', padding: '1rem 1.1rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem', fontSize: '0.9rem', color: '#166534', fontWeight: 700, marginBottom: '0.5rem' }}>
                      <span>🎫 Voucher ({appliedVoucher.voucher.code})</span>
                      <span>-{fmtMoney(appliedVoucher.discountAmount)}</span>
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem',
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
