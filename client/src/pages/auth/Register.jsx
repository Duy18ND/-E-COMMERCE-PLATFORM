import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }

    setLoading(true);
    try {
      // Sẵn sàng kết nối với authService.register(formData)
      console.log('Đăng ký tài khoản:', formData);
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Đăng ký không thành công. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-container" style={{ maxWidth: '480px' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>Đăng ký tài khoản</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          Tạo tài khoản để trải nghiệm mua sắm nhanh chóng và tiện lợi
        </p>

        {error && <ErrorMessage message={error} onClose={() => setError('')} />}

        <form onSubmit={handleSubmit}>
          <Input
            label="Họ và tên"
            name="fullName"
            required
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Nguyễn Văn A"
          />

          <Input
            label="Địa chỉ Email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="example@gmail.com"
          />

          <Input
            label="Tên đăng nhập"
            name="username"
            required
            value={formData.username}
            onChange={handleChange}
            placeholder="username123"
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

          <Input
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
          />

          <Button type="submit" variant="primary" size="lg" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </Button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
