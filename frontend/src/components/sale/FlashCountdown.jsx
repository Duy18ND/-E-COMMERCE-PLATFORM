import { useState, useEffect } from 'react';

/**
 * FlashCountdown - Đồng hồ đếm ngược thời gian thực cho chiến dịch Flash Sale
 * @param {string|Date} targetEndTime - Thời gian kết thúc
 * @param {string} variant - 'hero' | 'banner' | 'compact' | 'mini'
 */
const FlashCountdown = ({ targetEndTime, variant = 'hero', onExpire }) => {
  const calculateTimeLeft = () => {
    // Nếu không có targetEndTime hoặc giá trị không hợp lệ, mặc định đếm ngược đến 2 giờ 15 phút 24 giây kể từ phiên
    let end;
    if (targetEndTime) {
      const parsed = new Date(targetEndTime).getTime();
      end = isNaN(parsed) ? Date.now() + (2 * 3600 + 15 * 60 + 24) * 1000 : parsed;
    } else {
      end = Date.now() + (2 * 3600 + 15 * 60 + 24) * 1000;
    }
    const difference = end - Date.now();

    if (isNaN(difference) || difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      total: difference
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining.total <= 0) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetEndTime]);

  const pad = (num) => String(num).padStart(2, '0');

  // Variant 1: Hero Banner (Dark background with red blocks as in Image 1)
  if (variant === 'hero') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.85rem',
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          padding: '0.65rem 1.15rem',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171', fontSize: '0.85rem', fontWeight: 700 }}>
          <span style={{ fontSize: '1rem' }}>⏱️</span>
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>KẾT THÚC SAU:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.25rem',
                minWidth: '40px',
                height: '38px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(220, 38, 38, 0.4)'
              }}
            >
              {pad(timeLeft.hours + timeLeft.days * 24)}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>Giờ</div>
          </div>

          <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.2rem', marginBottom: '12px' }}>:</span>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.25rem',
                minWidth: '40px',
                height: '38px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(220, 38, 38, 0.4)'
              }}
            >
              {pad(timeLeft.minutes)}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>Phút</div>
          </div>

          <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.2rem', marginBottom: '12px' }}>:</span>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.25rem',
                minWidth: '40px',
                height: '38px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(220, 38, 38, 0.4)'
              }}
            >
              {pad(timeLeft.seconds)}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>Giây</div>
          </div>
        </div>
      </div>
    );
  }

  // Variant 2: Product Detail Countdown (As shown in Image 2 - Dark red box with rounded corners)
  if (variant === 'detail') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#fecaca', textTransform: 'uppercase', marginRight: '0.35rem' }}>
          KẾT THÚC SAU:
        </span>
        <span
          style={{
            backgroundColor: '#7f1d1d',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.95rem',
            padding: '3px 8px',
            borderRadius: '6px',
            minWidth: '30px',
            textAlign: 'center'
          }}
        >
          {pad(timeLeft.hours)}
        </span>
        <span style={{ color: '#ffffff', fontWeight: 800 }}>:</span>
        <span
          style={{
            backgroundColor: '#7f1d1d',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.95rem',
            padding: '3px 8px',
            borderRadius: '6px',
            minWidth: '30px',
            textAlign: 'center'
          }}
        >
          {pad(timeLeft.minutes)}
        </span>
        <span style={{ color: '#ffffff', fontWeight: 800 }}>:</span>
        <span
          style={{
            backgroundColor: '#7f1d1d',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.95rem',
            padding: '3px 8px',
            borderRadius: '6px',
            minWidth: '30px',
            textAlign: 'center'
          }}
        >
          {pad(timeLeft.seconds)}
        </span>
      </div>
    );
  }

  // Variant 3: Alert Bar (For Cart warning banner - 15 minutes reservation timer)
  if (variant === 'cart-alert') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontWeight: 800,
          backgroundColor: 'rgba(0,0,0,0.25)',
          padding: '2px 8px',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '1rem',
          letterSpacing: '1px'
        }}
      >
        <span>{pad(timeLeft.minutes)}</span>
        <span>:</span>
        <span>{pad(timeLeft.seconds)}</span>
      </span>
    );
  }

  // Default compact
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 700, fontSize: '0.85rem', color: '#dc2626' }}>
      <span>⏱️</span>
      <span>{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}</span>
    </div>
  );
};

export default FlashCountdown;
