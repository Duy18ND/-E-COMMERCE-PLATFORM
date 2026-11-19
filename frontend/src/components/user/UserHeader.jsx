import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import Icon from '../common/Icons';
import { INITIAL_CATEGORIES } from '../../services/mockData';
import categoryService from '../../services/categoryService';
import voucherService from '../../services/voucherService';
import userService, { isValidVietnamesePhone } from '../../services/userService';

const UserHeader = () => {
  const { user, isAuthenticated, isAdmin, logout, updateUser } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);

  // Dropdown, Mobile Drawer & Modal states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [savedVoucherCount, setSavedVoucherCount] = useState(() => voucherService.getSavedIds().length);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef(null);
  const categoryMenuRef = useRef(null);

  // Profile Edit Form state
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    avatarUrl: ''
  });

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsCategoryMenuOpen(false);
  }, [location.pathname, location.search]);

  // Load real categories from Backend API on mount
  useEffect(() => {
    let mounted = true;
    categoryService
      .getPublicCategories()
      .then((list) => {
        if (mounted && Array.isArray(list) && list.length > 0) {
          setCategories(list);
        }
      })
      .catch(() => { });
    return () => {
      mounted = false;
    };
  }, []);

  // Sync profile data when user changes or modal opens
  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || user.username || '',
        email: user.email || 'user@shopmart.com',
        phone: user.phone || '0912 345 678',
        avatarUrl:
          user.avatarUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
      });
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
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setFormError('');

    if (profileData.phone && !isValidVietnamesePhone(profileData.phone)) {
      setFormError('Số điện thoại không đúng định dạng Việt Nam (VD: 0912345678 hoặc +84912345678)');
      return;
    }

    if (profileData.fullName && profileData.fullName.length > 150) {
      setFormError('Họ tên không được vượt quá 150 ký tự');
      return;
    }

    setSaving(true);
    try {
      await userService.updateProfile({
        fullName: profileData.fullName,
        phone: profileData.phone,
        avatarUrl: profileData.avatarUrl
      });

      if (updateUser) {
        updateUser({
          fullName: profileData.fullName,
          email: profileData.email,
          phone: profileData.phone,
          avatarUrl: profileData.avatarUrl
        });
      }
      setSuccessToast('Cập nhật thông tin thành công!');
      setTimeout(() => {
        setSuccessToast('');
        setIsEditModalOpen(false);
      }, 1200);
    } catch (err) {
      setFormError(err.message || 'Không thể cập nhật hồ sơ cá nhân. Vui lòng thử lại!');
    } finally {
      setSaving(false);
    }
  };

  const currentAvatar =
    user?.avatarUrl ||
    profileData.avatarUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';

  return (
    <header className="site-header user-header">
      {/* Top Flagship Iridescent Accent Strip */}
      <div className="user-header-accent-bar" aria-hidden="true" />

      <div className="container header-inner">
        <div className="header-main-row">
          {/* 1. LOGO */}
          <Link to="/" className="header-logo">
            <div className="header-logo-icon">
              <Icon name="store" size={19} color="#ffffff" />
              <span className="header-logo-star" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="sparkles" size={10} color="#facc15" />
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span className="header-logo-text">ShopMart</span>
            </div>
          </Link>

          {/* 2. SEARCH BAR (Tự co giãn theo không gian còn lại) */}
          <div className="header-search-wrapper">
            <form onSubmit={handleSearch} className="header-search-form" role="search">
              <span className="header-search-lead-icon" aria-hidden="true">
                <Icon name="search" size={15} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm sản phẩm, thương hiệu..."
                aria-label="Tìm kiếm sản phẩm"
                className="header-search-input"
              />
              <button type="submit" className="header-search-btn" aria-label="Tìm kiếm">
                <Icon name="search" size={14} strokeWidth={2.4} />
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
              <span className="nav-item-icon"><Icon name="ticket" size={15} /></span>
              <span>Mã giảm giá</span>
            </NavLink>

            <NavLink
              to="/flash-sale"
              className={({ isActive }) => `header-nav-item header-flash-pill ${isActive ? 'active' : ''}`}
            >
              <Icon name="flash" size={14} />
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
                <Icon name={isCategoryMenuOpen ? 'chevron-up' : 'chevron-down'} size={13} />
              </button>

              {isCategoryMenuOpen && (
                <div className="header-category-menu">
                  <Link
                    to="/products"
                    onClick={() => setIsCategoryMenuOpen(false)}
                    className="header-category-menu-item all"
                  >
                    <Icon name="layers" size={14} />
                    <span>Tất cả sản phẩm</span>
                  </Link>
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/products?category=${encodeURIComponent(cat.id)}`}
                      onClick={() => setIsCategoryMenuOpen(false)}
                      className="header-category-menu-item"
                    >
                      <Icon name="chevron-right" size={13} />
                      <span>{cat.name}</span>
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
              <Icon name="cart" size={19} />
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
                  <div className="header-avatar-wrap">
                    <img src={currentAvatar} alt="Avatar" className="header-account-avatar" />
                    <span className="header-avatar-online" aria-hidden="true" />
                  </div>
                  <div className="header-account-info">
                    <span className="header-account-role">
                      {isAdmin ? 'Quản trị viên' : 'Tài khoản'}
                    </span>
                    <span className="header-user-name">
                      {user?.fullName || user?.username || 'Tài khoản'}
                    </span>
                  </div>
                  <span className="header-account-caret">
                    <Icon name={isDropdownOpen ? 'chevron-up' : 'chevron-down'} size={14} />
                  </span>
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
                          <Icon name="shield-check" size={15} />
                          <span>Vào trang Quản trị (Admin)</span>
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={handleOpenEdit}
                        className="header-dropdown-btn edit"
                      >
                        <Icon name="edit" size={15} />
                        <span>Sửa thông tin cá nhân</span>
                      </button>

                      <Link
                        to="/my-vouchers"
                        onClick={() => setIsDropdownOpen(false)}
                        className="header-dropdown-link"
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <Icon name="ticket" size={15} />
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
                        <Icon name="package" size={15} />
                        <span>Lịch sử đơn hàng</span>
                      </Link>

                      <div className="header-dropdown-divider" />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="header-dropdown-btn logout"
                      >
                        <Icon name="logout" size={15} />
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
              <Icon name={isMobileMenuOpen ? 'x' : 'menu'} size={19} />
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
                <Icon name="home" size={16} />
                <span>Trang chủ</span>
              </NavLink>
              <NavLink
                to="/products"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `user-mobile-nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon name="package" size={16} />
                <span>Sản phẩm</span>
              </NavLink>
              <NavLink
                to="/vouchers"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `user-mobile-nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon name="ticket" size={16} />
                <span>Mã giảm giá</span>
              </NavLink>
              <NavLink
                to="/flash-sale"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `user-mobile-nav-link flash ${isActive ? 'active' : ''}`}
              >
                <Icon name="flash" size={16} />
                <span>Flash Sale</span>
              </NavLink>
              <NavLink
                to="/orders"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `user-mobile-nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon name="clipboard" size={16} />
                <span>Đơn hàng của tôi</span>
              </NavLink>
              {isAdmin && (
                <NavLink
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="user-mobile-nav-link"
                >
                  <Icon name="shield-check" size={16} />
                  <span>Quản trị hệ thống (Admin)</span>
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
                {categories.map((cat) => (
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <Icon name="success" size={16} />
            <span>{successToast}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile}>
          {formError && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                border: '1px solid #fecaca',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Icon name="warning" size={16} color="#dc2626" />
              <span>{formError}</span>
            </div>
          )}
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
                Ảnh đại diện người dùng
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
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Icon name="logout" size={15} />
              <span>Đăng xuất</span>
            </button>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" disabled={saving} loading={saving} icon={<Icon name="save" size={15} />}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </header>
  );
};

export default UserHeader;

