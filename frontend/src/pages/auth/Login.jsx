import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isMockAuth } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuickFill = (email, password) => {
    setFormData({ email, password });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email.trim() || !formData.password) {
      setError('Vui lòng nhập đầy đủ Email và mật khẩu.');
      return;
    }

    setLoading(true);

    try {
      // Đăng nhập qua authService (Mock hoặc Backend)
      const user = await login({
        email: formData.email.trim(),
        password: formData.password
      });

      // Kiểm tra quyền ROLE_ADMIN
      const userRoles = Array.isArray(user?.roles) ? user.roles : [];
      const isAdmin = userRoles.includes('ROLE_ADMIN') || userRoles.includes('ADMIN');

      // Điều hướng thông minh:
      // - Nếu Admin: nếu có trang đích admin thì đến đó, không thì vào /admin
      // - Nếu Khách (ROLE_USER): nếu trang đích không phải /admin thì đến đó, ngược lại về /
      if (isAdmin) {
        navigate(from && from.startsWith('/admin') ? from : '/admin', { replace: true });
      } else {
        const safeTarget = from && !from.startsWith('/admin') ? from : '/';
        navigate(safeTarget, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Email hoặc mật khẩu không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-container" style={{ maxWidth: '460px' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>Đăng nhập</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.25rem', textAlign: 'center' }}>
          Nhập thông tin tài khoản để tiếp tục trải nghiệm
        </p>

        {/* Khung gợi ý tài khoản test khi đang ở chế độ Mock Auth */}
        {isMockAuth && (
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
              🧪 Tài khoản TEST (Chế độ Mock Auth):
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleQuickFill('user@test.com', '123456')}
                style={{
                  background: '#ffffff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  padding: '3px 8px',
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
                  padding: '3px 8px',
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
        )}

        {error && <ErrorMessage message={error} onClose={() => setError('')} />}

        <form onSubmit={handleSubmit}>
          <Input
            label="Địa chỉ Email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="user@test.com hoặc admin@test.com"
          />

          <Input
            label="Mật khẩu"
            name="password"
            type="password"
            required
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
          />

          <Button type="submit" variant="primary" size="lg" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </Button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          Chưa có tài khoản?{' '}
          <Link to="/register" style={{ fontWeight: 600 }}>
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
