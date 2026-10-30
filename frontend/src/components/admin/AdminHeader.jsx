import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';

const AdminHeader = ({ onToggleMobileDrawer, isMobileDrawerOpen }) => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const dropdownRef = useRef(null);

  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    avatarUrl: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || user.username || 'System Admin',
        email: user.email || 'admin@shopmart.com',
        phone: user.phone || '0912 345 678',
        avatarUrl:
          user.avatarUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
      });
    }
  }, [user, isEditModalOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    setIsEditModalOpen(false);
    await logout();
    navigate('/login');
  };

  const handleOpenEdit = () => {
    setIsDropdownOpen(false);
    setIsEditModalOpen(true);
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (updateUser) {
      updateUser({
        fullName: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        avatarUrl: profileData.avatarUrl
      });
    }
    setSuccessToast('Cập nhật thông tin quản trị viên thành công!');
    setTimeout(() => {
      setSuccessToast('');
      setIsEditModalOpen(false);
    }, 1200);
  };

  const currentAvatar =
    user?.avatarUrl ||
    profileData.avatarUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';

  return (
    <header className="site-header admin-header">
      <div className="admin-header-inner">
        <div className="admin-header-row">
          {/* Left: Hamburger Drawer Toggle (Mobile/Tablet) + Brand Logo */}
          <div className="admin-header-left">
            <button
              type="button"
              className="admin-drawer-toggle"
              onClick={onToggleMobileDrawer}
              aria-label="Mở menu quản trị"
              aria-expanded={isMobileDrawerOpen}
            >
              {isMobileDrawerOpen ? '✕' : '☰'}
            </button>

            <Link to="/admin" className="header-logo">
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
              <div className="admin-logo-titles">
                <span className="header-logo-text">ShopMart</span>
                <span className="header-admin-badge">Admin Portal</span>
              </div>
            </Link>
          </div>

          {/* Center: Admin Top Navigation (Desktop) */}
          <nav className="admin-header-nav" aria-label="Điều hướng quản trị">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => `admin-header-link ${isActive ? 'active' : ''}`}
            >
              <span className="admin-link-icon">📊</span>
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/admin/products"
              className={({ isActive }) => `admin-header-link ${isActive ? 'active' : ''}`}
            >
              <span className="admin-link-icon">📦</span>
              <span>
                <span className="admin-nav-prefix">Quản lý </span>Sản phẩm
              </span>
            </NavLink>

            <NavLink
              to="/admin/categories"
              className={({ isActive }) => `admin-header-link ${isActive ? 'active' : ''}`}
            >
              <span className="admin-link-icon">🏷️</span>
              <span>
                <span className="admin-nav-prefix">Quản lý </span>Danh mục
              </span>
            </NavLink>

            <NavLink
              to="/admin/orders"
              className={({ isActive }) => `admin-header-link ${isActive ? 'active' : ''}`}
            >
              <span className="admin-link-icon">📑</span>
              <span>
                <span className="admin-nav-prefix">Quản lý </span>Đơn hàng
              </span>
            </NavLink>

            <NavLink
              to="/admin/inventory"
              className={({ isActive }) => `admin-header-link ${isActive ? 'active' : ''}`}
            >
              <span className="admin-link-icon">🏭</span>
              <span>
                <span className="admin-nav-prefix">Quản lý </span>Tồn kho
              </span>
            </NavLink>

            <NavLink
              to="/admin/sales"
              className={({ isActive }) => `admin-header-link sale ${isActive ? 'active' : ''}`}
            >
              <span>⚡</span>
              <span>
                <span className="admin-nav-prefix">Quản lý </span>Sale
              </span>
            </NavLink>

            <NavLink
              to="/admin/vouchers"
              className={({ isActive }) => `admin-header-link ${isActive ? 'active' : ''}`}
            >
              <span className="admin-link-icon">🎫</span>
              <span>
                <span className="admin-nav-prefix">Quản lý </span>Voucher
              </span>
            </NavLink>
          </nav>

          {/* Right: Admin Account Profile */}
          <div ref={dropdownRef} className="header-account">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="header-account-trigger"
              title="Tài khoản Quản trị viên"
            >
              <img src={currentAvatar} alt="Avatar" className="header-account-avatar" />
              <div className="header-account-info">
                <span className="header-account-role">Quản trị viên</span>
                <span className="header-user-name">
                  {user?.fullName || user?.username || 'System Admin'}
                </span>
              </div>
              <span className="header-account-caret">{isDropdownOpen ? '▲' : '▼'}</span>
            </button>

            {isDropdownOpen && (
              <div className="header-dropdown-menu">
                <div className="header-dropdown-user">
                  <img src={currentAvatar} alt="Avatar" className="header-dropdown-avatar" />
                  <div style={{ overflow: 'hidden', minWidth: 0 }}>
                    <div className="header-dropdown-name">
                      {user?.fullName || user?.username || 'System Admin'}
                    </div>
                    <div className="header-dropdown-email">
                      {user?.email || profileData.email}
                    </div>
                    <span className="header-dropdown-badge">Quản trị viên</span>
                  </div>
                </div>

                <div className="header-dropdown-actions">
                  <button
                    type="button"
                    onClick={handleOpenEdit}
                    className="header-dropdown-btn edit"
                  >
                    <span>✏️</span>
                    <span>Sửa thông tin cá nhân</span>
                  </button>

                  <Link
                    to="/"
                    onClick={() => setIsDropdownOpen(false)}
                    className="header-dropdown-link"
                  >
                    <span>🏪</span>
                    <span>Xem giao diện Cửa hàng</span>
                  </Link>

                  <div className="header-dropdown-divider" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="header-dropdown-btn logout"
                  >
                    <span>🚪</span>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Thông tin Quản trị viên"
      >
        {successToast && (
          <div
            style={{
              padding: '0.65rem 1rem',
              backgroundColor: '#dcfce7',
              color: '#16a34a',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '1rem',
              textAlign: 'center'
            }}
          >
            ✓ {successToast}
          </div>
        )}

        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <img
              src={profileData.avatarUrl || currentAvatar}
              alt="Avatar Preview"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #2563eb',
                flexShrink: 0
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                Ảnh đại diện quản trị viên
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                Bạn có thể cập nhật đường dẫn ảnh (URL) bên dưới
              </div>
            </div>
          </div>

          <Input
            label="Họ và tên"
            name="fullName"
            value={profileData.fullName}
            onChange={handleProfileChange}
            required
            placeholder="Nhập họ và tên..."
          />

          <Input
            label="Địa chỉ Email"
            name="email"
            type="email"
            value={profileData.email}
            onChange={handleProfileChange}
            placeholder="admin@shopmart.com"
          />

          <Input
            label="Số điện thoại"
            name="phone"
            type="tel"
            value={profileData.phone}
            onChange={handleProfileChange}
            placeholder="0912 345 678"
          />

          <Input
            label="Đường dẫn ảnh đại diện (Avatar URL)"
            name="avatarUrl"
            value={profileData.avatarUrl}
            onChange={handleProfileChange}
            placeholder="https://images.unsplash.com/..."
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid #f1f5f9'
            }}
          >
            <button
              type="button"
              onClick={handleLogout}
              style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🚪 Đăng xuất
            </button>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary">
                Lưu thay đổi
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </header>
  );
};

export default AdminHeader;

