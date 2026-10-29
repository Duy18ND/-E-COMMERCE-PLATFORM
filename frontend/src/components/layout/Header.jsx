import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { INITIAL_CATEGORIES } from '../../services/mockData';

const Header = () => {
  const { user, isAuthenticated, isAdmin, logout, updateUser } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdown & Modal states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const dropdownRef = useRef(null);
  const categoryMenuRef = useRef(null);

  // Profile Edit Form state
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    avatarUrl: ''
  });

  // Sync profile data when user changes or modal opens
  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || user.username || '',
        email: user.email || 'admin@shopmart.com',
        phone: user.phone || '0912 345 678',
        avatarUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
      });
    }
  }, [user, isEditModalOpen]);

  // Click outside listener for dropdown
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
    }
  };

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
    setSuccessToast('Cập nhật thông tin thành công!');
    setTimeout(() => {
      setSuccessToast('');
      setIsEditModalOpen(false);
    }, 1200);
  };

  const trendingTags = [
    'iPhone 15 Series',
    'MacBook Pro M3',
    'Âm thanh cao cấp',
    'Smart Living'
  ];

  const currentAvatar = user?.avatarUrl || profileData.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';

  return (
    <header
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #f1f5f9',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
      }}
    >
      <div className="container" style={{ padding: '0.85rem 1rem' }}>
        <div className="header-main-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
          {/* Logo ShopMart */}
          <Link
            to={isAdmin ? '/admin' : '/'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              textDecoration: 'none',
              flexShrink: 0
            }}
          >
            {/* Custom SVG Icon ShopMart: Blue Bag with Red Star */}
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 7V6C6 4.34315 7.34315 3 9 3H15C16.6569 3 18 4.34315 18 6V7M4 7H20L19 21H5L4 7Z"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  fontSize: '10px',
                  lineHeight: 1
                }}
              >
                ⭐
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
              <span
                style={{
                  fontSize: '1.45rem',
                  fontWeight: '800',
                  color: '#2563eb',
                  letterSpacing: '-0.02em',
                  lineHeight: 1
                }}
              >
                ShopMart
              </span>
              {isAdmin && (
                <span
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #dbeafe',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  Admin Portal
                </span>
              )}
            </div>
          </Link>

          {/* =========================================
              PHẦN GIỮA (CENTER SECTION)
              - Khách hàng: Search bar + trending tags
              - Admin: Thanh trạng thái / huy hiệu quản trị
             ========================================= */}
          {!isAdmin ? (
            <div className="header-search-wrapper" style={{ flex: '1', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <form
                onSubmit={handleSearch}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '9999px',
                  padding: '3px 4px 3px 14px',
                  border: '1px solid #e2e8f0',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm công nghệ cao cấp, phụ kiện..."
                  style={{
                    flex: 1,
                    border: 'none',
                    backgroundColor: 'transparent',
                    outline: 'none',
                    fontSize: '0.85rem',
                    color: '#1e293b',
                    padding: '6px 0'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    borderRadius: '9999px',
                    padding: '7px 16px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Tìm kiếm
                </button>
              </form>

              {/* Trending tags below search bar */}
              <div
                className="header-trending-tags"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.725rem',
                  color: '#64748b',
                  paddingLeft: '0.75rem',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ fontWeight: 600, color: '#94a3b8' }}>Xu hướng:</span>
                {trendingTags.map((tag, idx) => (
                  <span key={tag} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <Link
                      to={`/products?search=${encodeURIComponent(tag)}`}
                      style={{ color: '#64748b', textDecoration: 'none' }}
                      onMouseEnter={(e) => (e.target.style.color = '#2563eb')}
                      onMouseLeave={(e) => (e.target.style.color = '#64748b')}
                    >
                      {tag}
                    </Link>
                    {idx < trendingTags.length - 1 && <span style={{ margin: '0 0.3rem', color: '#cbd5e1' }}>•</span>}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            /* Khi là Admin: Không hiện search bar khách hàng */
            <div style={{ flex: 1 }} />
          )}

          {/* =========================================
              PHẦN BÊN PHẢI (NAV ITEMS & USER PROFILE)
             ========================================= */}
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>
            {isAdmin ? (
              /* KHI LÀ ADMIN:
                 - KHÔNG CÓ Trang chủ, Sản phẩm, Danh mục, Đơn hàng khách hàng.
                 - CHỈ CÓ CÁC MỤC QUẢN TRỊ ADMIN VÀ THÔNG TIN TÀI KHOẢN */
              <nav className="header-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
                <NavLink
                  to="/admin"
                  end
                  style={({ isActive }) => ({
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#2563eb' : '#475569',
                    backgroundColor: isActive ? '#eff6ff' : 'transparent',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '9999px',
                    whiteSpace: 'nowrap',
                    display: 'inline-block',
                    textDecoration: 'none'
                  })}
                >
                  📊 Dashboard
                </NavLink>

                <NavLink
                  to="/admin/products"
                  style={({ isActive }) => ({
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#2563eb' : '#475569',
                    backgroundColor: isActive ? '#eff6ff' : 'transparent',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '9999px',
                    whiteSpace: 'nowrap',
                    display: 'inline-block',
                    textDecoration: 'none'
                  })}
                >
                  📦 Quản lý Sản phẩm
                </NavLink>

                <NavLink
                  to="/admin/categories"
                  style={({ isActive }) => ({
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#2563eb' : '#475569',
                    backgroundColor: isActive ? '#eff6ff' : 'transparent',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '9999px',
                    whiteSpace: 'nowrap',
                    display: 'inline-block',
                    textDecoration: 'none'
                  })}
                >
                  🏷️ Quản lý Danh mục
                </NavLink>

                <NavLink
                  to="/admin/orders"
                  style={({ isActive }) => ({
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#2563eb' : '#475569',
                    backgroundColor: isActive ? '#eff6ff' : 'transparent',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '9999px',
                    whiteSpace: 'nowrap',
                    display: 'inline-block',
                    textDecoration: 'none'
                  })}
                >
                  📑 Quản lý Đơn hàng
                </NavLink>

                <NavLink
                  to="/admin/inventory"
                  style={({ isActive }) => ({
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#2563eb' : '#475569',
                    backgroundColor: isActive ? '#eff6ff' : 'transparent',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '9999px',
                    whiteSpace: 'nowrap',
                    display: 'inline-block',
                    textDecoration: 'none'
                  })}
                >
                  🏭 Quản lý Tồn kho
                </NavLink>

                <NavLink
                  to="/admin/sales"
                  style={({ isActive }) => ({
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? '#dc2626' : '#ea580c',
                    backgroundColor: isActive ? '#fee2e2' : '#fff7ed',
                    border: '1px solid #ffedd5',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '9999px',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    textDecoration: 'none'
                  })}
                >
                  <span>⚡</span>
                  <span>Quản lý Sale</span>
                </NavLink>
              </nav>
            ) : (
              /* KHI LÀ KHÁCH HÀNG: Hiển thị các trang khách hàng */
              <>
                <nav className="header-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <NavLink
                    to="/"
                    style={({ isActive }) => ({
                      fontSize: '0.925rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#2563eb' : '#334155',
                      whiteSpace: 'nowrap',
                      display: 'inline-block',
                      textDecoration: 'none'
                    })}
                  >
                    Trang chủ
                  </NavLink>

                  <NavLink
                    to="/products"
                    style={({ isActive }) => ({
                      fontSize: '0.925rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#2563eb' : '#334155',
                      whiteSpace: 'nowrap',
                      display: 'inline-block',
                      textDecoration: 'none'
                    })}
                  >
                    Sản phẩm
                  </NavLink>

                  <NavLink
                    to="/flash-sale"
                    style={({ isActive }) => ({
                      fontSize: '0.925rem',
                      fontWeight: 700,
                      color: isActive ? '#ffffff' : '#dc2626',
                      backgroundColor: isActive ? '#dc2626' : '#fee2e2',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '9999px',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      textDecoration: 'none',
                      boxShadow: isActive ? '0 2px 8px rgba(220, 38, 38, 0.4)' : 'none',
                      transition: 'all 0.2s ease'
                    })}
                  >
                    <span>⚡</span>
                    <span>Flash Sale</span>
                  </NavLink>

                  <div
                    ref={categoryMenuRef}
                    style={{ position: 'relative', display: 'inline-block' }}
                    onMouseEnter={() => setIsCategoryMenuOpen(true)}
                    onMouseLeave={() => setIsCategoryMenuOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                      style={{
                        fontSize: '0.925rem',
                        fontWeight: isCategoryMenuOpen ? 700 : 500,
                        color: isCategoryMenuOpen ? '#2563eb' : '#334155',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer'
                      }}
                    >
                      <span>Danh mục</span>
                      <span style={{ fontSize: '0.7rem' }}>▾</span>
                    </button>

                    {isCategoryMenuOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          marginTop: '0.45rem',
                          minWidth: '235px',
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)',
                          padding: '0.45rem',
                          zIndex: 120
                        }}
                      >
                        <Link
                          to="/products"
                          onClick={() => setIsCategoryMenuOpen(false)}
                          style={{
                            display: 'block',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: '#2563eb',
                            textDecoration: 'none'
                          }}
                        >
                          Tất cả sản phẩm
                        </Link>
                        {INITIAL_CATEGORIES.map((cat) => (
                          <Link
                            key={cat.id}
                            to={`/products?category=${encodeURIComponent(cat.id)}`}
                            onClick={() => setIsCategoryMenuOpen(false)}
                            style={{
                              display: 'block',
                              padding: '0.55rem 0.75rem',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              fontWeight: 500,
                              color: '#334155',
                              textDecoration: 'none'
                            }}
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <NavLink
                    to="/orders"
                    style={({ isActive }) => ({
                      fontSize: '0.925rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#2563eb' : '#334155',
                      whiteSpace: 'nowrap',
                      display: 'inline-block',
                      textDecoration: 'none'
                    })}
                  >
                    Đơn hàng
                  </NavLink>
                </nav>

                {/* Giỏ hàng chỉ hiện cho khách hàng */}
                <Link
                  to="/cart"
                  style={{
                    position: 'relative',
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#334155',
                    backgroundColor: '#ffffff',
                    flexShrink: 0
                  }}
                  title={isAuthenticated ? 'Giỏ hàng của bạn' : 'Đăng nhập để xem giỏ hàng'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  {isAuthenticated && totalItems > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        borderRadius: '9999px',
                        padding: '1px 6px',
                        minWidth: '18px',
                        textAlign: 'center',
                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.3)'
                      }}
                    >
                      {totalItems}
                    </span>
                  )}
                </Link>
              </>
            )}

            {/* THÔNG TIN TÀI KHOẢN (USER PROFILE) */}
            {isAuthenticated ? (
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                {/* Bấm vào ảnh/thông tin để mở menu */}
                <div
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    padding: '4px 8px 4px 4px',
                    borderRadius: '9999px',
                    border: '1px solid transparent',
                    backgroundColor: isDropdownOpen ? '#f1f5f9' : 'transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isDropdownOpen) e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (!isDropdownOpen) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Bấm để xem thông tin và đăng xuất"
                >
                  <img
                    src={currentAvatar}
                    alt="Avatar"
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #2563eb',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: '0.725rem', color: '#64748b', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                      {isAdmin ? 'Quản trị viên' : 'Tài khoản'}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                      {user?.fullName || user?.username || 'Tài khoản'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '0.1rem' }}>
                    {isDropdownOpen ? '▲' : '▼'}
                  </span>
                </div>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: '280px',
                      backgroundColor: '#ffffff',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
                      padding: '1rem',
                      zIndex: 200,
                      animation: 'fadeIn 0.15s ease'
                    }}
                  >
                    {/* User Card Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        paddingBottom: '0.85rem',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                    >
                      <img
                        src={currentAvatar}
                        alt="Avatar"
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #2563eb'
                        }}
                      />
                      <div style={{ overflow: 'hidden' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: '#0f172a',
                            fontSize: '0.95rem',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden'
                          }}
                        >
                          {user?.fullName || user?.username}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden'
                          }}
                        >
                          {user?.email || profileData.email}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: '0.25rem',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            color: '#2563eb',
                            backgroundColor: '#eff6ff',
                            padding: '1px 6px',
                            borderRadius: '9999px'
                          }}
                        >
                          {isAdmin ? 'Quản trị viên' : 'Khách hàng'}
                        </span>
                      </div>
                    </div>

                    {/* Menu Actions */}
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <button
                        onClick={handleOpenEdit}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0.55rem 0.65rem',
                          borderRadius: '8px',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: 'none',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dbeafe')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                      >
                        <span>✏️</span>
                        <span>Sửa thông tin cá nhân</span>
                      </button>

                      {!isAdmin && (
                        <Link
                          to="/orders"
                          onClick={() => setIsDropdownOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            padding: '0.55rem 0.65rem',
                            borderRadius: '8px',
                            color: '#334155',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            textDecoration: 'none',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <span>📦</span>
                          <span>Lịch sử đơn hàng</span>
                        </Link>
                      )}

                      <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '0.25rem 0' }} />

                      <button
                        onClick={handleLogout}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0.55rem 0.65rem',
                          borderRadius: '8px',
                          backgroundColor: 'transparent',
                          color: '#dc2626',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: 'none',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fee2e2')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <span>🚪</span>
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* KHI CHƯA ĐĂNG NHẬP */
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
                <Link
                  to="/login"
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#2563eb',
                    border: '1.5px solid #dbeafe',
                    backgroundColor: '#eff6ff',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    display: 'inline-block',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#dbeafe';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#eff6ff';
                  }}
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                    transition: 'all 0.2s',
                    display: 'inline-block',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1d4ed8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }}
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
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
          {/* Avatar Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <img
              src={profileData.avatarUrl || currentAvatar}
              alt="Avatar Preview"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #2563eb'
              }}
            />
            <div style={{ flex: 1 }}>
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

            <div style={{ display: 'flex', gap: '0.5rem' }}>
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

export default Header;
