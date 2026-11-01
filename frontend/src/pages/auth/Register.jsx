import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10,11}$/;

export const validateRegisterForm = ({ fullName, email, phone, password, confirmPassword }) => {
  const errors = {};
  const cleanName = (fullName || '').trim();
  const cleanEmail = (email || '').trim();
  const cleanPhone = (phone || '').trim();

  if (!cleanName) {
    errors.fullName = 'Họ và tên không được để trống.';
  } else if (cleanName.length < 2 || cleanName.length > 150) {
    errors.fullName = 'Họ và tên phải từ 2 đến 150 ký tự.';
  }

  if (!cleanEmail) {
    errors.email = 'Email không được để trống.';
  } else if (!EMAIL_REGEX.test(cleanEmail)) {
    errors.email = 'Địa chỉ Email không đúng định dạng.';
  }

  if (cleanPhone && !PHONE_REGEX.test(cleanPhone)) {
    errors.phone = 'Số điện thoại phải từ 10 đến 11 chữ số.';
  }

  if (!password) {
    errors.password = 'Mật khẩu không được để trống.';
  } else if (password.length < 6 || password.length > 50) {
    errors.password = 'Mật khẩu phải từ 6 đến 50 ký tự.';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp!';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const getPasswordStrength = (password) => {
  if (!password) {
    return { score: 0, label: 'Chưa nhập', color: '#94a3b8' };
  }
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8 && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: 'Yếu', color: '#ef4444' };
  if (score === 2) return { score: 2, label: 'Trung bình', color: '#f59e0b' };
  if (score === 3) return { score: 3, label: 'Khá mạnh', color: '#10b981' };
  return { score: 4, label: 'Rất mạnh', color: '#059669' };
};

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [infoNotice, setInfoNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordStrength = getPasswordStrength(formData.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (error) {
      setError('');
    }
    if (infoNotice) {
      setInfoNotice('');
    }
  };

  const handleHelpClick = () => {
    setError('');
    setInfoNotice(
      'Cần hỗ trợ đăng ký tài khoản? Liên hệ Hotline 1900 8888 (8:00 - 22:00) để được giải đáp nhanh chóng.'
    );
  };

  const handleSocialClick = (provider) => {
    setError('');
    setInfoNotice(
      `Tính năng đăng ký nhanh qua ${provider} đang được tích hợp với cổng OAuth2 của hệ thống. Vui lòng điền biểu mẫu bên trên.`
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setInfoNotice('');

    const validation = validateRegisterForm(formData);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setError(Object.values(validation.errors)[0]);
      return;
    }

    if (!agreeTerms) {
      setError('Vui lòng đồng ý với Điều khoản dịch vụ & Chính sách bảo mật của ShopMart.');
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      // Gửi đúng DTO Backend RegisterRequest: { email, password, fullName, phone, address }
      await authService.register({
        email: formData.email.trim(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim()
      });

      setSuccess('Đăng ký tài khoản thành công! Đang chuyển hướng sang trang đăng nhập...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      if (err.fieldErrors && typeof err.fieldErrors === 'object') {
        setFieldErrors(err.fieldErrors);
      }
      setError(err.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      {/* 1. AUTH TOP HEADER */}
      <header className="auth-topbar">
        <div className="container auth-topbar-inner">
          <div className="auth-topbar-left">
            <Link to="/" className="header-logo">
              <div className="header-logo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 7V6C6 4.34315 7.34315 3 9 3H15C16.6569 3 18 4.34315 18 6V7M4 7H20L19 21H5L4 7Z"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="header-logo-star">⭐</span>
              </div>
              <span className="header-logo-text">ShopMart</span>
            </Link>
            <span className="auth-topbar-divider" aria-hidden="true" />
            <span className="auth-topbar-title">Đăng ký</span>
          </div>

          <div className="auth-topbar-right">
            <button
              type="button"
              onClick={handleHelpClick}
              className="auth-help-link"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Bạn cần giúp đỡ?</span>
            </button>
            <span className="auth-topbar-divider hide-on-mobile" aria-hidden="true" />
            <div className="auth-hotline-box hide-on-mobile">
              <span className="auth-hotline-icon">🎧</span>
              <div className="auth-hotline-meta">
                <span className="auth-hotline-sub">HOTLINE HỖ TRỢ</span>
                <a href="tel:19008888" className="auth-hotline-number">1900 8888</a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN SPLIT BODY */}
      <div className="auth-body">
        <div className="container auth-page-wrapper">
          <div className="auth-split-grid">
            {/* LEFT BRANDING / REGISTER BENEFITS SHOWCASE */}
            <div className="auth-showcase-col">
              <div className="auth-brand-badge">
                <span aria-hidden="true">🎉</span>
                <span>QUÀ TẶNG THÀNH VIÊN MỚI</span>
              </div>

              <h2 className="auth-showcase-heading">
                Đăng ký tài khoản{' '}
                <span className="auth-showcase-highlight">Nhận Voucher 100K</span>{' '}
                ngay hôm nay!
              </h2>

              <p className="auth-showcase-desc">
                Gia nhập cộng đồng ShopMart để tận hưởng đặc quyền mua sắm công nghệ đỉnh cao cùng hàng ngàn ưu đãi miễn phí vận chuyển trọn đời.
              </p>

              {/* Stacked Benefit Cards */}
              <div className="auth-benefit-list">
                <div className="auth-benefit-card">
                  <div className="auth-benefit-icon blue">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 12 20 22 4 22 4 12" />
                      <rect x="2" y="7" width="20" height="5" />
                      <line x1="12" y1="22" x2="12" y2="7" />
                      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                    </svg>
                  </div>
                  <div className="auth-benefit-content">
                    <strong>Gói Voucher 100.000đ</strong>
                    <span>Áp dụng ngay cho đơn hàng đầu tiên từ 300.000đ toàn hệ thống.</span>
                  </div>
                </div>

                <div className="auth-benefit-card">
                  <div className="auth-benefit-icon green">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="3" width="15" height="13" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                  </div>
                  <div className="auth-benefit-content">
                    <strong>Freeship 0đ Trọn Đời</strong>
                    <span>Miễn phí giao hàng hỏa tốc trong 2 giờ tại Hà Nội &amp; TP.HCM.</span>
                  </div>
                </div>

                <div className="auth-benefit-card">
                  <div className="auth-benefit-icon purple">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                  </div>
                  <div className="auth-benefit-content">
                    <strong>Cam Kết Chính Hãng 100% &amp; Bảo Mật</strong>
                    <span>Bảo hành điện tử chính hãng 24/7, cam kết bảo vệ thông tin cá nhân tuyệt đối.</span>
                  </div>
                </div>
              </div>

              {/* Social Proof */}
              <div className="auth-social-proof">
                <div className="auth-avatar-stack" aria-hidden="true">
                  <span className="auth-avatar-item blue">A</span>
                  <span className="auth-avatar-item indigo">H</span>
                  <span className="auth-avatar-item amber">K</span>
                  <span className="auth-avatar-item emerald">M</span>
                </div>
                <p className="auth-social-proof-text">
                  Hơn <strong>150.000+</strong> khách hàng công nghệ tin dùng
                </p>
              </div>
            </div>

            {/* RIGHT REGISTER FORM CARD */}
            <div className="auth-form-col">
              <div className="card auth-card">
                <div className="auth-card-header">
                  <div className="auth-card-title-row">
                    <h1 className="auth-card-title">Đăng ký</h1>
                    <span className="auth-member-pill">Thành viên mới</span>
                  </div>
                  <p className="auth-card-subtitle">
                    Điền thông tin bên dưới để thiết lập tài khoản của bạn
                  </p>
                </div>

                {error && <ErrorMessage message={error} onClose={() => setError('')} />}

                {infoNotice && (
                  <div className="auth-info-banner" role="status">
                    <span>ℹ️</span>
                    <span>{infoNotice}</span>
                  </div>
                )}

                {success && (
                  <div className="auth-success-banner" role="status">
                    <span>✓</span>
                    <span>{success}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <Input
                    label="Họ và tên"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    error={fieldErrors.fullName}
                    placeholder="Nguyễn Văn A"
                    leftIcon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    }
                  />

                  <div className="auth-form-row-2">
                    <Input
                      label="Địa chỉ Email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      error={fieldErrors.email}
                      placeholder="example@gmail.com"
                      leftIcon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      }
                    />

                    <Input
                      label="Số điện thoại"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      error={fieldErrors.phone}
                      placeholder="0912 345 678"
                      leftIcon={
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                          <line x1="12" y1="18" x2="12.01" y2="18" />
                        </svg>
                      }
                    />
                  </div>

                  <Input
                    label="Địa chỉ nhận hàng mặc định"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    error={fieldErrors.address}
                    placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
                    leftIcon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    }
                  />

                  <Input
                    label="Mật khẩu"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    error={fieldErrors.password}
                    placeholder="Tối thiểu 6 ký tự"
                    style={{ marginBottom: '0.5rem' }}
                    leftIcon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    }
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="auth-eye-btn"
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    }
                  />

                  {/* Password Strength Meter */}
                  <div className="auth-strength-meter">
                    <div className="auth-strength-header">
                      <span>Độ mạnh mật khẩu:</span>
                      <span
                        className="auth-strength-label"
                        style={{ color: passwordStrength.color }}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="auth-strength-bars" aria-hidden="true">
                      {[1, 2, 3, 4].map((level) => (
                        <span
                          key={level}
                          className="auth-strength-segment"
                          style={{
                            backgroundColor:
                              passwordStrength.score >= level ? passwordStrength.color : '#e2e8f0'
                          }}
                        />
                      ))}
                    </div>
                    <span className="auth-strength-hint">
                      Tối thiểu 6 ký tự, khuyến nghị bao gồm chữ hoa, chữ số &amp; ký tự đặc biệt.
                    </span>
                  </div>

                  <Input
                    label="Xác nhận mật khẩu"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={fieldErrors.confirmPassword}
                    placeholder="••••••••"
                    leftIcon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <polyline points="9 12 11 14 15 10" />
                      </svg>
                    }
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="auth-eye-btn"
                        aria-label={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                      >
                        {showConfirmPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    }
                  />

                  {/* Terms & Conditions Checkbox */}
                  <div className="auth-terms-row">
                    <label className="auth-checkbox-label auth-terms-label">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="auth-checkbox-input"
                      />
                      <span>
                        Tôi đồng ý với{' '}
                        <Link to="/products" className="auth-inline-link">
                          Điều khoản dịch vụ
                        </Link>{' '}
                        &amp;{' '}
                        <Link to="/products" className="auth-inline-link">
                          Chính sách bảo mật
                        </Link>{' '}
                        của ShopMart.
                      </span>
                    </label>
                  </div>

                  {/* Primary Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    pill={false}
                    className="auth-submit-btn"
                    style={{ width: '100%' }}
                    disabled={loading || Boolean(success)}
                  >
                    {loading
                      ? 'ĐANG TẠO TÀI KHOẢN...'
                      : success
                        ? 'ĐANG CHUYỂN HƯỚNG...'
                        : 'ĐĂNG KÝ  →'}
                  </Button>
                </form>

                {/* Divider */}
                <div className="auth-divider">
                  <span>HOẶC</span>
                </div>

                {/* Social Register Buttons */}
                <div className="auth-social-grid">
                  <button
                    type="button"
                    onClick={() => handleSocialClick('Google')}
                    className="auth-social-btn"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 12.3s.6 3.3 1.6 5.3l3.7-2.8z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 19.9 7.4 23 12 23z"
                      />
                    </svg>
                    <span>Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSocialClick('Facebook')}
                    className="auth-social-btn"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>Facebook</span>
                  </button>
                </div>

                {/* Switch to Login */}
                <p className="auth-switch-text">
                  Đã có tài khoản ShopMart?{' '}
                  <Link to="/login" className="auth-switch-link">
                    Đăng nhập ➔
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. AUTH FOOTER */}
      <footer className="auth-footer">
        <div className="container auth-footer-bar">
          <div className="auth-footer-brand">
            <span className="auth-footer-mini-logo">🛍️</span>
            <strong>ShopMart</strong>
            <span className="auth-footer-tagline">
              — Nền tảng thương mại điện tử công nghệ cao
            </span>
          </div>
          <div className="auth-footer-bar-right">
            <Link to="/products">Điều khoản dịch vụ</Link>
            <Link to="/products">Chính sách bảo mật</Link>
            <Link to="/products">Trung tâm trợ giúp</Link>
            <span className="auth-footer-copyright">
              © 2026 ShopMart. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Register;
