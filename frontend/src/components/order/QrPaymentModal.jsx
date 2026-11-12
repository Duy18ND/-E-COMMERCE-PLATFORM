import { useState, useEffect, useRef, useCallback } from 'react';
import paymentService from '../../services/paymentService';
import { formatCurrency } from '../../utils/formatCurrency';

/**
 * QrPaymentModal — Màn hình quét mã QR chuyển khoản (chuẩn VietQR) cho đơn thanh toán trực tuyến.
 *
 * Kèm "Bảng điều khiển Demo / Test Thanh Toán" để giả lập kết quả giao dịch mà không cần chuyển tiền thật:
 *  - 🟢 Xác nhận đã chuyển khoản  → onPay(true, note)  → Payment SUCCESS → đơn hàng PAID
 *  - 🔴 Giả lập lỗi / Hủy         → onPay(false, note) → Payment FAILED  → Saga Rollback (hoàn kho + hoàn Voucher)
 *  - ⚪ Thanh toán sau            → đóng modal, đơn vẫn PENDING
 *
 * Props:
 *  - isOpen       : boolean
 *  - order        : { id, totalAmount }
 *  - onPay        : async (success: boolean, note: string) => PaymentResponse  (gọi API POST /payments/mock-pay/{orderId})
 *  - onPaid       : (paymentResponse) => void   — gọi sau khi hiển thị hiệu ứng thành công
 *  - onFailed     : (paymentResponse) => void   — gọi sau khi hiển thị thông báo thất bại
 *  - onPayLater   : () => void
 *  - holdMinutes  : number (mặc định 15 phút giữ đơn)
 */

// ─── Thông tin tài khoản nhận tiền (Demo) ─────────────────────────────────────
const BANK_ID = 'MB';
const BANK_NAME = 'MB Bank (Ngân hàng Quân Đội)';
const ACCOUNT_NO = '0838169181';
const ACCOUNT_NAME = 'E-COMMERCE PLATFORM';

const SUCCESS_REDIRECT_DELAY_MS = 1200; // chờ Kafka cập nhật trạng thái đơn sang PAID
const FAILED_REDIRECT_DELAY_MS = 2200;  // đủ thời gian đọc thông báo Saga Rollback

const toIntAmount = (amount) => {
  const n = Math.round(Number(amount));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const buildVietQrUrl = (orderId, amount) => {
  const safeAmount = toIntAmount(amount);
  return `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${safeAmount}&addInfo=THANH%20TOAN%20DON%20${orderId}&accountName=E%20COMMERCE%20PLATFORM`;
};

export const buildFallbackQrUrl = (orderId, amount) => {
  const safeAmount = toIntAmount(amount);
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ORDER_${orderId}_AMOUNT_${safeAmount}`;
};

const formatCountdown = (totalSeconds) => {
  const s = Math.max(0, totalSeconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const copyToClipboard = async (text) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback bên dưới
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
};

// ─── Styles dùng chung ────────────────────────────────────────────────────────
const infoRowStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  gap: '0.75rem', padding: '0.55rem 0', borderBottom: '1px dashed #e2e8f0', fontSize: '0.85rem'
};
const infoLabelStyle = { color: '#64748b', flexShrink: 0 };
const infoValueStyle = { fontWeight: 700, color: '#0f172a', textAlign: 'right', wordBreak: 'break-word' };
const copyBtnStyle = (copied) => ({
  padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
  border: copied ? '1px solid #86efac' : '1px solid #bfdbfe',
  backgroundColor: copied ? '#dcfce7' : '#eff6ff',
  color: copied ? '#16a34a' : '#1d4ed8',
  cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap'
});
const testBtnBase = {
  width: '100%', borderRadius: '10px', padding: '0.75rem 1rem',
  fontSize: '0.875rem', fontWeight: 800, display: 'flex', alignItems: 'center',
  justifyContent: 'center', gap: '0.5rem', transition: 'all 0.15s'
};

const Spinner = ({ color = '#ffffff' }) => (
  <span
    aria-hidden="true"
    style={{
      width: '16px', height: '16px', borderRadius: '50%', display: 'inline-block',
      border: `2.5px solid ${color}`, borderTopColor: 'transparent',
      animation: 'qrPaySpin 0.8s linear infinite'
    }}
  />
);

const QrPaymentModal = ({
  isOpen,
  order,
  onPay,
  onPaid,
  onFailed,
  onPayLater,
  holdMinutes = 15
}) => {
  // phase: idle | confirming | cancelling | success | failed
  const [phase, setPhase] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [qrSrc, setQrSrc] = useState('');
  const [qrBroken, setQrBroken] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(holdMinutes * 60);
  const [copiedKey, setCopiedKey] = useState('');
  const timersRef = useRef([]);

  const orderId = order?.id;
  const rawSubtotal = Number(order?.subtotalAmount ?? 0);
  const voucherDiscount = Math.max(0, Number(order?.discountAmount ?? 0));
  const rawTotal = Number(order?.totalAmount ?? 0);
  // Đảm bảo số tiền cần thanh toán luôn là số tiền ĐÃ TRỪ giảm giá (Flash Sale + Voucher)
  const payableAmount =
    rawSubtotal > 0 && voucherDiscount > 0
      ? Math.max(0, Math.min(rawTotal > 0 ? rawTotal : rawSubtotal - voucherDiscount, rawSubtotal - voucherDiscount))
      : rawTotal;
  const amount = payableAmount;
  const transferContent = `THANH TOAN DON #${orderId}`;
  const busy = phase === 'confirming' || phase === 'cancelling';
  const finished = phase === 'success' || phase === 'failed';

  const schedule = useCallback((fn, ms) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }, []);

  // Reset trạng thái mỗi lần mở modal cho một đơn hàng
  useEffect(() => {
    if (!isOpen || !orderId) return undefined;
    setPhase('idle');
    setErrorMsg('');
    setQrBroken(false);
    setCopiedKey('');
    setQrSrc(buildVietQrUrl(orderId, amount));
    setSecondsLeft(holdMinutes * 60);
    return undefined;
  }, [isOpen, orderId, amount, holdMinutes]);

  // Đồng hồ đếm ngược thời gian giữ đơn
  useEffect(() => {
    if (!isOpen || finished) return undefined;
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, finished]);

  // Khóa cuộn trang nền khi modal mở
  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [isOpen]);

  // Dọn dẹp timer khi unmount
  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  if (!isOpen || !order) return null;

  const handleQrError = () => {
    const fallback = buildFallbackQrUrl(orderId, amount);
    if (qrSrc !== fallback) {
      setQrSrc(fallback);
    } else {
      setQrBroken(true);
    }
  };

  const handleCopy = async (key, text) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      schedule(() => setCopiedKey(''), 1800);
    }
  };

  const runPayment = async (success) => {
    if (busy || finished || !order?.id) return;
    setErrorMsg('');
    setPhase(success ? 'confirming' : 'cancelling');
    try {
      let result;
      if (success) {
        const note = 'Khách hàng xác nhận đã quét mã QR thành công';
        result = typeof onPay === 'function'
          ? await onPay(true, note)
          : await paymentService.mockPay(order.id, true, 'Khách hàng xác nhận đã quét mã QR thành công');
      } else {
        const note = 'Khách hàng hủy tại màn hình QR / Giao dịch lỗi';
        result = typeof onPay === 'function'
          ? await onPay(false, note)
          : await paymentService.mockPay(order.id, false, 'Khách hàng hủy tại màn hình QR / Giao dịch lỗi');
      }
      // Ưu tiên trạng thái thực tế Backend trả về (ví dụ đơn đã thanh toán trước đó)
      const finalStatus = result?.status || (success ? 'SUCCESS' : 'FAILED');
      if (finalStatus === 'SUCCESS') {
        setPhase('success');
        schedule(() => onPaid?.(result), SUCCESS_REDIRECT_DELAY_MS);
      } else if (finalStatus === 'FAILED') {
        setPhase('failed');
        schedule(() => onFailed?.(result), FAILED_REDIRECT_DELAY_MS);
      } else {
        setPhase('idle');
        setErrorMsg(`Giao dịch đang ở trạng thái ${finalStatus}. Vui lòng thử lại.`);
      }
    } catch (err) {
      setPhase('idle');
      setErrorMsg(err?.message || 'Không thể kết nối cổng thanh toán. Vui lòng thử lại.');
    }
  };

  const expired = secondsLeft <= 0;
  const urgent = secondsLeft > 0 && secondsLeft <= 60;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-payment-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', overflowY: 'auto'
      }}
    >
      <style>{`
        @keyframes qrPaySpin { to { transform: rotate(360deg); } }
        @keyframes qrPayPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.8); } }
        @keyframes qrPayScan { 0% { top: 6%; } 50% { top: 88%; } 100% { top: 6%; } }
        @keyframes qrPayPop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
        @keyframes qrPayFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div
        style={{
          position: 'relative', width: '100%', maxWidth: '460px', maxHeight: 'calc(100vh - 2rem)',
          overflowY: 'auto', backgroundColor: '#ffffff', borderRadius: '18px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)', animation: 'qrPayFadeIn 0.25s ease-out'
        }}
      >
        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', color: '#ffffff',
          padding: '1rem 1.25rem', borderRadius: '18px 18px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem'
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 id="qr-payment-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
              📱 Quét mã QR để thanh toán
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', opacity: 0.85 }}>
              Đơn hàng <strong>#{orderId}</strong> · Hỗ trợ mọi ứng dụng ngân hàng (VietQR / Napas 247)
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng và thanh toán sau"
            disabled={busy || finished}
            onClick={() => onPayLater?.()}
            style={{
              width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.12)',
              color: '#ffffff', fontSize: '1.1rem', cursor: busy || finished ? 'not-allowed' : 'pointer'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '1.1rem 1.25rem 1.25rem' }}>
          {/* ── Countdown + trạng thái chờ ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
            backgroundColor: expired ? '#fef2f2' : urgent ? '#fff7ed' : '#f8fafc',
            border: `1px solid ${expired ? '#fecaca' : urgent ? '#fed7aa' : '#e2e8f0'}`,
            borderRadius: '10px', padding: '0.6rem 0.85rem', marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
              {phase === 'success' ? (
                <span style={{ color: '#16a34a' }}>✓ Đã nhận được thanh toán</span>
              ) : phase === 'failed' ? (
                <span style={{ color: '#dc2626' }}>✕ Giao dịch không thành công</span>
              ) : (
                <>
                  <span style={{
                    width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#f59e0b',
                    display: 'inline-block', animation: 'qrPayPulse 1.2s ease-in-out infinite'
                  }} />
                  <span>{busy ? 'Đang xử lý giao dịch...' : 'Đang chờ xác nhận thanh toán...'}</span>
                </>
              )}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>⏱ Giữ đơn:</span>
              <span style={{
                fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem',
                color: expired ? '#dc2626' : urgent ? '#ea580c' : '#0f172a'
              }}>
                {formatCountdown(secondsLeft)}
              </span>
            </div>
          </div>

          {expired && !finished && (
            <div style={{
              fontSize: '0.78rem', color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '1rem'
            }}>
              ⚠ Đã hết thời gian giữ đơn khuyến nghị. Ở chế độ Demo/Test bạn vẫn có thể xác nhận kết quả giao dịch bên dưới.
            </div>
          )}

          {/* ── Khung mã QR ── */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div style={{
              position: 'relative', width: '250px', maxWidth: '100%', aspectRatio: '1 / 1',
              borderRadius: '14px', border: '2px solid #dbeafe', backgroundColor: '#ffffff',
              boxShadow: '0 6px 20px rgba(37, 99, 235, 0.12)', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {qrBroken ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.8rem' }}>
                  <div style={{ fontSize: '2.25rem', marginBottom: '0.35rem' }}>🔌</div>
                  Không tải được ảnh mã QR.<br />Vui lòng chuyển khoản theo thông tin bên dưới.
                </div>
              ) : (
                <img
                  key={qrSrc}
                  src={qrSrc}
                  alt={`Mã VietQR thanh toán đơn hàng #${orderId}`}
                  onError={handleQrError}
                  style={{
                    width: '100%', height: '100%', objectFit: 'contain',
                    filter: finished ? 'blur(2px) grayscale(0.6)' : 'none', transition: 'filter 0.2s'
                  }}
                />
              )}

              {/* Vạch quét động */}
              {!finished && !qrBroken && (
                <span style={{
                  position: 'absolute', left: '6%', right: '6%', height: '2px',
                  background: 'linear-gradient(90deg, transparent, #2563eb, transparent)',
                  boxShadow: '0 0 8px #3b82f6', animation: 'qrPayScan 2.6s ease-in-out infinite'
                }} />
              )}

              {/* Overlay kết quả */}
              {finished && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  backgroundColor: 'rgba(255,255,255,0.82)'
                }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '50%', fontSize: '2.4rem', fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff',
                    backgroundColor: phase === 'success' ? '#16a34a' : '#dc2626',
                    boxShadow: `0 8px 24px ${phase === 'success' ? 'rgba(22,163,74,0.4)' : 'rgba(220,38,38,0.4)'}`,
                    animation: 'qrPayPop 0.45s ease-out'
                  }}>
                    {phase === 'success' ? '✓' : '✕'}
                  </div>
                  <strong style={{ color: phase === 'success' ? '#166534' : '#991b1b', fontSize: '0.95rem' }}>
                    {phase === 'success' ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* ── Thông tin chuyển khoản ── */}
          <div style={{
            backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
            padding: '0.25rem 0.9rem', marginBottom: '1rem'
          }}>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Ngân hàng</span>
              <span style={infoValueStyle}>{BANK_NAME}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Số tài khoản</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ ...infoValueStyle, fontFamily: 'monospace', letterSpacing: '0.04em' }}>{ACCOUNT_NO}</span>
                <button type="button" style={copyBtnStyle(copiedKey === 'account')} onClick={() => handleCopy('account', ACCOUNT_NO)}>
                  {copiedKey === 'account' ? '✓ Đã chép' : 'Sao chép'}
                </button>
              </span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Chủ tài khoản</span>
              <span style={infoValueStyle}>{ACCOUNT_NAME}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Số tiền</span>
              <span style={{ ...infoValueStyle, color: '#dc2626', fontSize: '1.05rem', fontWeight: 900 }}>
                {formatCurrency(Number(payableAmount) || 0)}
              </span>
            </div>
            <div style={{ ...infoRowStyle, borderBottom: 'none' }}>
              <span style={infoLabelStyle}>Nội dung CK</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                <span style={{ ...infoValueStyle, fontFamily: 'monospace', color: '#1d4ed8' }}>{transferContent}</span>
                <button type="button" style={copyBtnStyle(copiedKey === 'content')} onClick={() => handleCopy('content', transferContent)}>
                  {copiedKey === 'content' ? '✓ Đã chép' : 'Sao chép'}
                </button>
              </span>
            </div>
          </div>

          {/* ── Thông báo kết quả / lỗi ── */}
          {phase === 'success' && (
            <div style={{
              backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#166534',
              borderRadius: '10px', padding: '0.7rem 0.85rem', fontSize: '0.82rem', marginBottom: '1rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              <Spinner color="#16a34a" />
              <span>Thanh toán thành công! Đang cập nhật trạng thái <strong>ĐÃ THANH TOÁN (PAID)</strong> và chuyển đến chi tiết đơn hàng...</span>
            </div>
          )}
          {phase === 'failed' && (
            <div style={{
              backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
              borderRadius: '10px', padding: '0.7rem 0.85rem', fontSize: '0.82rem', marginBottom: '1rem', lineHeight: 1.5
            }}>
              <strong>Thanh toán thất bại.</strong> Hệ thống đã kích hoạt Saga Rollback: tự động hoàn lại tồn kho sản phẩm
              và hoàn lượt sử dụng Voucher. Đang chuyển đến chi tiết đơn hàng...
            </div>
          )}
          {errorMsg && (
            <div role="alert" style={{
              backgroundColor: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412',
              borderRadius: '10px', padding: '0.6rem 0.85rem', fontSize: '0.8rem', marginBottom: '1rem'
            }}>
              ⚠ {errorMsg}
            </div>
          )}

          {/* ── Bảng điều khiển Demo / Test Thanh Toán ── */}
          <div style={{
            border: '2px dashed #c4b5fd', backgroundColor: '#faf5ff',
            borderRadius: '12px', padding: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '0.88rem', color: '#5b21b6' }}>🧪 Bảng điều khiển Demo / Test Thanh Toán</strong>
              <span style={{
                fontSize: '0.65rem', fontWeight: 800, color: '#7c3aed', backgroundColor: '#ede9fe',
                padding: '0.12rem 0.45rem', borderRadius: '9999px', letterSpacing: '0.05em'
              }}>
                TEST MODE
              </span>
            </div>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.74rem', color: '#6b7280', lineHeight: 1.45 }}>
              Không cần chuyển tiền thật — bấm nút để gọi API <code>POST /payments/mock-pay/{orderId}</code> giả lập kết quả giao dịch.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <button
                type="button"
                disabled={busy || finished}
                onClick={() => runPayment(true)}
                style={{
                  ...testBtnBase, border: 'none', color: '#ffffff',
                  backgroundColor: busy || finished ? '#86efac' : '#16a34a',
                  boxShadow: busy || finished ? 'none' : '0 4px 12px rgba(22, 163, 74, 0.35)',
                  cursor: busy || finished ? 'not-allowed' : 'pointer'
                }}
              >
                {phase === 'confirming' ? <Spinner /> : <span>🟢</span>}
                <span>{phase === 'confirming' ? 'Đang xác nhận giao dịch...' : 'Xác nhận đã chuyển khoản (Test Thành Công)'}</span>
              </button>

              <button
                type="button"
                disabled={busy || finished}
                onClick={() => runPayment(false)}
                style={{
                  ...testBtnBase, color: '#b91c1c',
                  border: '1.5px solid #fca5a5',
                  backgroundColor: busy || finished ? '#fef2f2' : '#fff1f2',
                  cursor: busy || finished ? 'not-allowed' : 'pointer',
                  opacity: busy && phase !== 'cancelling' ? 0.6 : 1
                }}
              >
                {phase === 'cancelling' ? <Spinner color="#dc2626" /> : <span>🔴</span>}
                <span>{phase === 'cancelling' ? 'Đang hủy giao dịch...' : 'Giả lập Lỗi / Hủy thanh toán (Test Saga Rollback)'}</span>
              </button>

              <button
                type="button"
                disabled={busy || finished}
                onClick={() => onPayLater?.()}
                style={{
                  ...testBtnBase, color: '#334155', fontWeight: 700,
                  border: '1px solid #cbd5e1', backgroundColor: '#ffffff',
                  cursor: busy || finished ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.6 : 1
                }}
              >
                <span>⚪</span>
                <span>Thanh toán sau</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrPaymentModal;

