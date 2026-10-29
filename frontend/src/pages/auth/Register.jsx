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
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validation = validateRegisterForm(formData);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setError(Object.values(validation.errors)[0]);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      // Gửi đúng DTO Backend RegisterRequest: { email, password, fullName, phone }
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
    <div className="container page-container auth-page-wrapper" style={{ maxWidth: '480px' }}>
      <div className="card auth-card" style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>Đăng ký tài khoản</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          Tạo tài khoản để trải nghiệm mua sắm nhanh chóng và tiện lợi
        </p>

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
            label="Họ và tên"
            name="fullName"
            required
            value={formData.fullName}
            onChange={handleChange}
            error={fieldErrors.fullName}
            placeholder="Nguyễn Văn A"
          />

          <Input
            label="Địa chỉ Email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            error={fieldErrors.email}
            placeholder="example@gmail.com"
          />

          <Input
            label="Số điện thoại"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            error={fieldErrors.phone}
            placeholder="0912345678"
          />

          <Input
            label="Địa chỉ nhận hàng mặc định"
            name="address"
            value={formData.address}
            onChange={handleChange}
            error={fieldErrors.address}
            placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
          />

          <Input
            label="Mật khẩu"
            name="password"
            type="password"
            required
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            placeholder="Tối thiểu 6 ký tự"
          />

          <Input
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
            placeholder="••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading || Boolean(success)}
          >
            {loading ? 'Đang tạo tài khoản...' : success ? 'Đang chuyển hướng...' : 'Đăng ký'}
          </Button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ fontWeight: 600, color: '#2563eb' }}>
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
