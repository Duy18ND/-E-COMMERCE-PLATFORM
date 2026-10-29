import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
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

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
  };

  const handleQuickFill = (email, password) => {
    setFormData({ email, password });
    setFieldErrors({});
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

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
      setError(err.message || 'Email hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-container auth-page-wrapper" style={{ maxWidth: '460px' }}>
      <div className="card auth-card" style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>Đăng nhập</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.25rem', textAlign: 'center' }}>
          Nhập thông tin tài khoản để tiếp tục trải nghiệm
        </p>

        {/* Khung điền nhanh tài khoản kiểm thử USER / ADMIN */}
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #dbeafe',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '1.25rem',
            fontSize: '0.8rem',
            color: '#1e40af'
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>
            🧪 Tài khoản TEST nhanh (USER & ADMIN):
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleQuickFill('user@test.com', '123456')}
              style={{
                background: '#ffffff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                color: '#2563eb',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              👤 USER: user@test.com
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('admin@test.com', '123456')}
              style={{
                background: '#ffffff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                color: '#dc2626',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              🛡️ ADMIN: admin@test.com
            </button>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.35rem' }}>
            Mật khẩu mặc định: <strong>123456</strong>
          </div>
        </div>

        {error && <ErrorMessage message={error} onClose={() => setError('')} />}

        {success && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#dcfce7',
              color: '#166534',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '1rem',
              border: '1px solid #bbf7d0'
            }}
          >
            ✓ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <Input
            label="Địa chỉ Email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            error={fieldErrors.email}
            placeholder="user@test.com hoặc admin@test.com"
          />

          <Input
            label="Mật khẩu"
            name="password"
            type="password"
            required
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            placeholder="••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </Button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          Chưa có tài khoản?{' '}
          <Link to="/register" style={{ fontWeight: 600, color: '#2563eb' }}>
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
