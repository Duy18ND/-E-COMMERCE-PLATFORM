import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useNotification from '../../hooks/useNotification';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateLoginForm = ({ email, password }) => {
  const errors = {};
  const cleanEmail = (email || '').trim();

  if (!cleanEmail) {
    errors.email = 'Email không được để trống.';
  } else if (!EMAIL_REGEX.test(cleanEmail)) {
    errors.email = 'Địa chỉ Email không đúng định dạng.';
  }

  if (!password) {
    errors.password = 'Mật khẩu không được để trống.';
  } else if (password.length < 6) {
    errors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { notify } = useNotification();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [infoNotice, setInfoNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || null;

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

  const handleQuickFill = (email, password) => {
    setFormData({ email, password });
    setFieldErrors({});
    setError('');
    setSuccess('');
    setInfoNotice('');
  };

  const handleForgotPassword = () => {
    setError('');
    setInfoNotice(
      'Vui lòng liên hệ Hotline 1900 8888 hoặc sử dụng tài khoản kiểm thử bên dưới để truy cập nhanh.'
    );
  };

  const handleSocialClick = (provider) => {
    setError('');
    setInfoNotice(
      `Tính năng đăng nhập qua ${provider} đang được tích hợp với cổng OAuth2 của hệ thống. Vui lòng đăng nhập bằng Email & Mật khẩu.`
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setInfoNotice('');

    const validation = validateLoginForm(formData);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setError(Object.values(validation.errors)[0]);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      // Đăng nhập qua authService (Gọi API Backend POST /api/v1/auth/login hoặc fallback local)
      const user = await login({
        email: formData.email.trim(),
        password: formData.password
      });

      const userRoles = Array.isArray(user?.roles) ? user.roles : [];
      const isAdmin = userRoles.includes('ROLE_ADMIN') || userRoles.includes('ADMIN');

      setSuccess('Đăng nhập thành công! Đang chuyển hướng...');
      notify.success(`Chào mừng ${user?.fullName || 'bạn'} đã đăng nhập thành công!`);

      // Điều hướng theo vai trò USER / ADMIN:
      // - Nếu Admin: ưu tiên trang đích /admin/* hoặc mặc định về /admin
      // - Nếu User: ưu tiên trang đích khách hàng hoặc mặc định về /
      if (isAdmin) {
        navigate(from && from.startsWith('/admin') ? from : '/admin', { replace: true });
      } else {
        const safeTarget = from && !from.startsWith('/admin') ? from : '/';
        navigate(safeTarget, { replace: true });
      }
    } catch (err) {
      if (err.fieldErrors && typeof err.fieldErrors === 'object') {
        setFieldErrors(err.fieldErrors);
      }
      const errMsg = err.message || 'Email hoặc mật khẩu không chính xác.';
      setError(errMsg);
      notify.error(errMsg);
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
            <span className="auth-topbar-title">Đăng nhập</span>
          </div>

          <div className="auth-topbar-right">
            <button
              type="button"
              onClick={handleForgotPassword}
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
            <div className="auth-hotline hide-on-mobile">
              <span className="auth-hotline-label">Hotline:</span>{' '}
              <a href="tel:19008888" className="auth-hotline-number">1900 8888</a>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN SPLIT BODY */}
      <div className="auth-body">
        <div className="container auth-page-wrapper">
          <div className="auth-split-grid">
            {/* LEFT BRANDING / E-COMMERCE ILLUSTRATION AREA */}
            <div className="auth-showcase-col">
              <div className="auth-brand-badge">
                <span className="auth-brand-dot" />
                <span>NỀN TẢNG MUA SẮM CÔNG NGHỆ SỐ 1</span>
              </div>

              <h2 className="auth-showcase-heading">
                Mua sắm thiết bị công nghệ{' '}
                <span className="auth-showcase-highlight">chính hãng 100%</span>{' '}
                tại ShopMart
              </h2>

              <p className="auth-showcase-desc">
                Đăng nhập ngay để nhận hàng ngàn mã giảm giá độc quyền, trải nghiệm giao hàng thần tốc 2H và chính sách bảo hành điện tử chính hãng.
              </p>

              {/* 2x2 Feature Cards */}
              <div className="auth-feature-grid">
                <div className="auth-feature-card">
                  <div className="auth-feature-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                  </div>
                  <div className="auth-feature-text">
                    <strong>100% Chính Hãng</strong>
                    <span>Bảo hành cam kết ủy quyền</span>
                  </div>
                </div>

                <div className="auth-feature-card">
                  <div className="auth-feature-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <div className="auth-feature-text">
                    <strong>Freeship 2H</strong>
                    <span>Giao siêu tốc nội thành</span>
                  </div>
                </div>

                <div className="auth-feature-card">
                  <div className="auth-feature-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                  </div>
                  <div className="auth-feature-text">
                    <strong>Đổi trả 30 ngày</strong>
                    <span>Miễn phí đổi hàng lỗi</span>
                  </div>
                </div>

                <div className="auth-feature-card">
                  <div className="auth-feature-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="12" y1="2" x2="12" y2="6" />
                    </svg>
                  </div>
                  <div className="auth-feature-text">
                    <strong>Deal Flash Sale</strong>
                    <span>Ưu đãi giảm sâu đến 50%</span>
                  </div>
                </div>
              </div>

              {/* Welcome Voucher Banner */}
              <div className="auth-voucher-banner">
                <div className="auth-voucher-banner-left">
                  <span className="auth-voucher-tag">VOUCHER CHÀO MỪNG</span>
                  <div className="auth-voucher-title">
                    Nhận ngay Voucher 100.000đ cho đơn đầu tiên
                  </div>
                </div>
                <div className="auth-voucher-value">-100K</div>
              </div>
            </div>

            {/* RIGHT LOGIN FORM CARD */}
            <div className="auth-form-col">
              <div className="card auth-card">
                <div className="auth-card-header">
                  <h1 className="auth-card-title">Đăng nhập</h1>
                  <p className="auth-card-subtitle">
                    Vui lòng nhập thông tin để truy cập tài khoản ShopMart
                  </p>
                </div>

                {/* Khung điền nhanh tài khoản kiểm thử USER / ADMIN */}
                <div className="auth-demo-box">
                  <div className="auth-demo-label">
                    <span>🧪 Tài khoản dùng thử nhanh:</span>
                    <span className="auth-demo-pass">MK: 123456</span>
                  </div>
                  <div className="auth-demo-actions">
                    <button
                      type="button"
                      onClick={() => handleQuickFill('user@test.com', '123456')}
                      className="auth-demo-chip user"
                    >
                      👤 Khách hàng (user@test.com)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('admin@test.com', '123456')}
                      className="auth-demo-chip admin"
                    >
                      🛡️ Quản trị (admin@test.com)
                    </button>
                  </div>
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
                    label="Email hoặc Tên đăng nhập"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    error={fieldErrors.email}
                    placeholder="user@test.com hoặc admin@test.com"
                    leftIcon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
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
                    placeholder="Nhập mật khẩu của bạn"
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
                        title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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

                  {/* Remember Me & Forgot Password Row */}
                  <div className="auth-options-row">
                    <label className="auth-checkbox-label">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="auth-checkbox-input"
                      />
                      <span>Duy trì đăng nhập</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="auth-forgot-btn"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>

                  {/* Primary Submit Button */}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    pill={false}
                    className="auth-submit-btn"
                    style={{ width: '100%' }}
                    disabled={loading}
                  >
                    {loading ? 'ĐANG XÁC THỰC...' : 'ĐĂNG NHẬP'}
                  </Button>
                </form>

                {/* Divider */}
                <div className="auth-divider">
                  <span>HOẶC</span>
                </div>

                {/* Social Login Buttons */}
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

                {/* Switch to Register */}
                <p className="auth-switch-text">
                  Bạn mới biết đến ShopMart?{' '}
                  <Link to="/register" className="auth-switch-link">
                    Đăng ký ngay
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. AUTH FOOTER */}
      <footer className="auth-footer">
        <div className="container auth-footer-inner">
          <div className="auth-footer-links">
            <Link to="/products">Chính sách bảo mật</Link>
            <span className="auth-footer-dot">•</span>
            <Link to="/products">Quy chế hoạt động</Link>
            <span className="auth-footer-dot">•</span>
            <Link to="/products">Chính sách đổi trả &amp; hoàn tiền</Link>
            <span className="auth-footer-dot">•</span>
            <Link to="/products">Điều khoản dịch vụ ShopMart</Link>
          </div>
          <div className="auth-footer-copy">
            © 2026 ShopMart. Bản quyền thuộc về Công ty Cổ phần Thương mại Công nghệ ShopMart.
            <br />
            Địa chỉ: Tòa nhà ShopMart Tower, Khu Công Nghệ Cao, TP. Hồ Chí Minh – Hotline hỗ trợ: 1900 8888
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;
