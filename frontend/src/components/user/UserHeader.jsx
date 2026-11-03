import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { INITIAL_CATEGORIES } from '../../services/mockData';
import { MOCK_USERS } from '../../mock/mockUsers';
import voucherService from '../../services/voucherService';

const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';

const EMPTY_AVATAR_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="#e2e8f0"/><circle cx="60" cy="45" r="22" fill="#94a3b8"/><path d="M24 102c6-20 22-32 36-32s30 12 36 32" fill="#94a3b8"/></svg>'
  );

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXT = /\.(jpg|jpeg|png|webp)$/i;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

const UserHeader = () => {
  const { user, isAuthenticated, isAdmin, logout, updateUser } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdown, Mobile Drawer & Modal states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [selectedAvatarFileName, setSelectedAvatarFileName] = useState('');
  const [savedVoucherCount, setSavedVoucherCount] = useState(() => voucherService.getSavedIds().length);
  const dropdownRef = useRef(null);
  const categoryMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  // Profile Edit Form state
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    avatarUrl: ''
  });

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsCategoryMenuOpen(false);
  }, [location.pathname, location.search]);

  // Sync profile data when user changes or modal opens
  useEffect(() => {
    if (user) {
      const matchedMock =
        MOCK_USERS.find(
          (m) =>
            (user.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
            (user.id && String(m.id) === String(user.id))
        ) || MOCK_USERS[0];

      const initialAvatar = user.avatarRemoved
        ? ''
        : user.avatarUrl ||
        user.avatar ||
        matchedMock?.avatarUrl ||
        matchedMock?.avatar ||
        DEFAULT_AVATAR_URL;

      setProfileData({
        fullName: user.fullName || user.username || matchedMock?.fullName || '',
        email: user.email || matchedMock?.email || 'user@shopmart.com',
        phone: user.phone || matchedMock?.phone || '0912 345 678',
        address:
          user.address ||
          matchedMock?.address ||
          '123 Đường Cầu Giấy, Dịch Vọng, Cầu Giấy, Hà Nội',
        avatarUrl: initialAvatar
      });
      setAvatarError('');
      setSelectedAvatarFileName(
        typeof initialAvatar === 'string' && initialAvatar.startsWith('data:image/')
          ? 'Ảnh đã chọn từ máy'
          : ''
      );
    }
  }, [user, isEditModalOpen]);

  // Sync saved voucher count
  useEffect(() => {
    const handleUpdate = () => {
      setSavedVoucherCount(voucherService.getSavedIds().length);
    };
    window.addEventListener('app_saved_vouchers_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('app_saved_vouchers_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
        setIsCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    setIsEditModalOpen(false);
    setIsMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const handleOpenEdit = () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    setAvatarError('');
    setIsEditModalOpen(true);
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTriggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const fileType = (file.type || '').toLowerCase();
    const fileName = file.name || '';
    const isValidType =
      ALLOWED_IMAGE_TYPES.includes(fileType) && ALLOWED_IMAGE_EXT.test(fileName);

    if (!isValidType) {
      setAvatarError('Định dạng ảnh không hợp lệ! Chỉ cho phép file JPG, JPEG, PNG hoặc WEBP.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError('Dung lượng ảnh vượt quá 5MB! Vui lòng chọn ảnh có kích thước tối đa 5MB.');
      e.target.value = '';
      return;
    }

    setAvatarError('');
    setSelectedAvatarFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const resultUrl = event.target?.result;
      if (typeof resultUrl === 'string') {
        setProfileData((prev) => ({
          ...prev,
          avatarUrl: resultUrl
        }));
      }
    };
    reader.onerror = () => {
      setAvatarError('Không thể đọc file ảnh. Vui lòng thử lại.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    setProfileData((prev) => ({
      ...prev,
      avatarUrl: ''
    }));
    setSelectedAvatarFileName('');
    setAvatarError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const isRemoved = !profileData.avatarUrl;
    if (updateUser) {
      updateUser({
        fullName: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        address: profileData.address,
        avatarUrl: profileData.avatarUrl,
        avatar: profileData.avatarUrl,
        avatarRemoved: isRemoved
      });
    }
    setSuccessToast('Cập nhật thông tin thành công!');
    setTimeout(() => {
      setSuccessToast('');
      setIsEditModalOpen(false);
    }, 1200);
  };

  const currentAvatar = user?.avatarRemoved
    ? EMPTY_AVATAR_PLACEHOLDER
    : user?.avatarUrl ||
    user?.avatar ||
    profileData.avatarUrl ||
    DEFAULT_AVATAR_URL;

  const modalAvatarPreview = profileData.avatarUrl || EMPTY_AVATAR_PLACEHOLDER;
  const hasLocalSelectedAvatar =
    Boolean(selectedAvatarFileName) ||
    (typeof profileData.avatarUrl === 'string' && profileData.avatarUrl.startsWith('data:image/'));

  return (
    <header className="site-header user-header">
      <div className="container header-inner">
        <div className="header-main-row">
          {/* 1. LOGO */}
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

          {/* 2. SEARCH BAR (Tự co giãn theo không gian còn lại) */}
          <div className="header-search-wrapper">
            <form onSubmit={handleSearch} className="header-search-form" role="search">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm sản phẩm, thương hiệu..."
                aria-label="Tìm kiếm sản phẩm"
                className="header-search-input"
              />
              <button type="submit" className="header-search-btn" aria-label="Tìm kiếm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span className="header-search-btn-text">Tìm kiếm</span>
              </button>
            </form>
          </div>

          {/* 3. NAVIGATION DESKTOP (Trang chủ, Sản phẩm, Mã giảm giá, Flash Sale, Danh mục, Đơn hàng) */}
          <nav className="header-nav-links header-nav-customer" aria-label="Điều hướng chính">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `header-nav-item ${isActive ? 'active' : ''}`}
            >
              Trang chủ
            </NavLink>

            <NavLink
              to="/products"
              className={({ isActive }) => `header-nav-item ${isActive ? 'active' : ''}`}
            >
              Sản phẩm
            </NavLink>

            <NavLink
              to="/vouchers"
              className={({ isActive }) => `header-nav-item header-nav-voucher ${isActive ? 'active' : ''}`}
            >
              <span className="nav-item-icon">🎟️</span>
              <span>Mã giảm giá</span>
            </NavLink>

            <NavLink
              to="/flash-sale"
              className={({ isActive }) => `header-nav-item header-flash-pill ${isActive ? 'active' : ''}`}
            >
              <span>⚡</span>
              <span>Flash Sale</span>
            </NavLink>

            {/* Dropdown Danh mục */}
            <div
              ref={categoryMenuRef}
              className="header-category-dropdown"
              onMouseEnter={() => setIsCategoryMenuOpen(true)}
              onMouseLeave={() => setIsCategoryMenuOpen(false)}
            >
              <button
                type="button"
                className={`header-nav-item header-category-btn ${isCategoryMenuOpen ? 'active' : ''}`}
                onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                aria-expanded={isCategoryMenuOpen}
              >
                <span>Danh mục</span>
                <span style={{ fontSize: '0.7rem' }}>▾</span>
              </button>

              {isCategoryMenuOpen && (
                <div className="header-category-menu">
                  <Link
                    to="/products"
                    onClick={() => setIsCategoryMenuOpen(false)}
                    className="header-category-menu-item all"
                  >
                    Tất cả sản phẩm
                  </Link>
                  {INITIAL_CATEGORIES.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/products?category=${encodeURIComponent(cat.id)}`}
                      onClick={() => setIsCategoryMenuOpen(false)}
                      className="header-category-menu-item"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <NavLink
              to="/orders"
              className={({ isActive }) => `header-nav-item ${isActive ? 'active' : ''}`}
            >
              Đơn hàng
            </NavLink>
          </nav>

          {/* 4. CART & ACCOUNT & MOBILE MENU TOGGLE */}
          <div className="header-right-Utilities">
            {/* Cart Button */}
            <Link
              to="/cart"
              className="header-cart"
              title={isAuthenticated ? 'Giỏ hàng của bạn' : 'Giỏ hàng'}
              aria-label="Giỏ hàng"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {totalItems > 0 && (
                <span className="header-cart-badge">{totalItems}</span>
              )}
            </Link>

            {/* Account Section */}
            {isAuthenticated ? (
              <div ref={dropdownRef} className="header-account">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="header-account-trigger"
                  title="Tài khoản của bạn"
                >
                  <img src={currentAvatar} alt="Avatar" className="header-account-avatar" />
                  <div className="header-account-info">
                    <span className="header-account-role">
                      {isAdmin ? 'Quản trị viên' : 'Tài khoản'}
                    </span>
                    <span className="header-user-name">
                      {user?.fullName || user?.username || 'Tài khoản'}
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
                          {user?.fullName || user?.username}
                        </div>
                        <div className="header-dropdown-email">
                          {user?.email || profileData.email}
                        </div>
                        <span className="header-dropdown-badge">
                          {isAdmin ? 'Quản trị viên' : 'Khách hàng'}
                        </span>
                      </div>
                    </div>

                    <div className="header-dropdown-actions">
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsDropdownOpen(false)}
                          className="header-dropdown-link highlight"
                        >
                          <span>⚡</span>
                          <span>Vào trang Quản trị (Admin)</span>
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={handleOpenEdit}
                        className="header-dropdown-btn edit"
                      >
                        <span>✏️</span>
                        <span>Sửa thông tin cá nhân</span>
                      </button>

                      <Link
                        to="/my-vouchers"
                        onClick={() => setIsDropdownOpen(false)}
                        className="header-dropdown-link"
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span>🎟️</span>
                          <span>Mã giảm giá của tôi</span>
                        </span>
                        {savedVoucherCount > 0 && (
                          <span className="header-dropdown-count">{savedVoucherCount}</span>
                        )}
                      </Link>

                      <Link
                        to="/orders"
                        onClick={() => setIsDropdownOpen(false)}
                        className="header-dropdown-link"
                      >
                        <span>📦</span>
                        <span>Lịch sử đơn hàng</span>
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
            ) : (
              <div className="header-account header-auth-buttons">
                <Link to="/login" className="header-auth-btn login">
                  Đăng nhập
                </Link>
                <Link to="/register" className="header-auth-btn register">
                  Đăng ký
                </Link>
              </div>
            )}

            {/* Hamburger Menu Button for Tablet/Mobile (< 992px) */}
            <button
              type="button"
              className="header-menu-toggle"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label="Mở menu điều hướng"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* COLLAPSIBLE NAVIGATION DRAWER FOR TABLET & MOBILE (< 992px) */}
        {isMobileMenuOpen && (
          <div className="user-mobile-drawer">
            <nav className="user-mobile-nav-list" aria-label="Menu di động">
              <NavLink
                to="/"
                end
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `user-mobile-nav-link ${isActive ? 'active' : ''}`}
              >
                🏠 Trang chủ
              </NavLink>
              <NavLink
                to="/products"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `user-mobile-nav-link ${isActive ? 'active' : ''}`}
              >
                🛍️ Sản phẩm
              </NavLink>
              <NavLink
                to="/vouchers"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `user-mobile-nav-link ${isActive ? 'active' : ''}`}
              >
                🎟️ Mã giảm giá
              </NavLink>
              <NavLink
                to="/flash-sale"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `user-mobile-nav-link flash ${isActive ? 'active' : ''}`}
              >
                ⚡ Flash Sale
              </NavLink>
              <NavLink
                to="/orders"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `user-mobile-nav-link ${isActive ? 'active' : ''}`}
              >
                📦 Đơn hàng của tôi
              </NavLink>
              {isAdmin && (
                <NavLink
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="user-mobile-nav-link"
                >
                  🛡️ Quản trị hệ thống (Admin)
                </NavLink>
              )}
            </nav>

            <div className="user-mobile-categories">
              <div className="user-mobile-section-title">Danh mục sản phẩm</div>
              <div className="user-mobile-cat-grid">
                <Link
                  to="/products"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="user-mobile-cat-pill"
                >
                  Tất cả sản phẩm
                </Link>
                {INITIAL_CATEGORIES.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/products?category=${encodeURIComponent(cat.id)}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="user-mobile-cat-pill"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Thông tin tài khoản & Chỉnh sửa"
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
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img
                src={modalAvatarPreview}
                alt="Avatar Preview"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: profileData.avatarUrl ? '3px solid #2563eb' : '3px solid #cbd5e1',
                  flexShrink: 0,
                  backgroundColor: '#f1f5f9'
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                  Ảnh đại diện người dùng
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                  Cho phép JPG, JPEG, PNG, WEBP (Tối đa 5MB)
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleAvatarFileChange}
                  style={{ display: 'none' }}
                />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginTop: '0.55rem'
                  }}
                >
                  {!hasLocalSelectedAvatar ? (
                    <button
                      type="button"
                      onClick={handleTriggerFileSelect}
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        padding: '0.35rem 0.7rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Chọn ảnh từ máy
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleTriggerFileSelect}
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        padding: '0.35rem 0.7rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Thay ảnh
                    </button>
                  )}

                  {Boolean(profileData.avatarUrl) && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      style={{
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        padding: '0.35rem 0.7rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>
              </div>
            </div>

            {avatarError && (
              <div
                role="alert"
                style={{
                  marginTop: '0.5rem',
                  padding: '0.45rem 0.75rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 500
                }}
              >
                ⚠️ {avatarError}
              </div>
            )}
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
            placeholder="example@gmail.com"
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
            label="Địa chỉ"
            name="address"
            type="text"
            value={profileData.address}
            onChange={handleProfileChange}
            placeholder="Nhập địa chỉ nhận hàng..."
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

export default UserHeader;
