import { NavLink, Link } from 'react-router-dom';
import Icon from '../common/Icons';

const AdminSidebar = ({
  isOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const menuItems = [
    { icon: 'dashboard', text: 'Tổng quan', path: '/admin', end: true },
    { icon: 'package', text: 'Quản lý sản phẩm', path: '/admin/products' },
    { icon: 'tag', text: 'Quản lý danh mục', path: '/admin/categories' },
    { icon: 'clipboard', text: 'Quản lý đơn hàng', path: '/admin/orders' },
    { icon: 'layers', text: 'Quản lý tồn kho', path: '/admin/inventory' },
    { icon: 'flash', text: 'Quản lý Sale / Khuyến mãi', path: '/admin/sales' },
    { icon: 'ticket', text: 'Quản lý mã giảm giá', path: '/admin/vouchers' },
    { icon: 'star', text: 'Quản lý đánh giá', path: '/admin/reviews' },
    { icon: 'users', text: 'Quản lý Tài khoản', path: '/admin/users' }
  ];

  return (
    <>
      {/* Backdrop overlay cho chế độ Drawer trên Mobile (< 768px) */}
      {isOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''} ${isOpen ? 'drawer-open' : ''}`}
        aria-label="Thanh điều hướng Quản trị"
      >
        <div>
          <div className="admin-sidebar-brand">
            <div className="admin-sidebar-brand-info">
              <h2 className="admin-sidebar-title">Admin Portal</h2>
              <span className="admin-sidebar-subtitle">Quản trị hệ thống ShopMart</span>
            </div>

            {onToggleCollapse && (
              <button
                type="button"
                className="admin-sidebar-collapse-btn"
                onClick={onToggleCollapse}
                title={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
                aria-label="Thu gọn hoặc mở rộng sidebar"
              >
                <Icon name={isCollapsed ? 'chevron-right' : 'chevron-left'} size={15} />
              </button>
            )}

            {onClose && (
              <button
                type="button"
                className="admin-sidebar-close-btn"
                onClick={onClose}
                aria-label="Đóng menu"
              >
                <Icon name="x" size={16} />
              </button>
            )}
          </div>

          <nav className="admin-sidebar-nav">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={() => {
                  if (onClose) onClose();
                }}
                title={item.text}
                className={({ isActive }) => `admin-sidebar-link ${isActive ? 'active' : ''}`}
              >
                <span className="admin-sidebar-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={item.icon} size={17} />
                </span>
                <span className="admin-sidebar-label">{item.text}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="admin-sidebar-footer">
          {/* Active Campaign Mini Card */}
          <div className="admin-sidebar-campaign-card">
            <div className="admin-sidebar-campaign-icon" style={{ color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="flash" size={16} />
            </div>
            <div className="admin-sidebar-campaign-text">
              <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>Chiến dịch Sale</div>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Icon name="active" size={9} color="#4ade80" />
                <span>Đang hoạt động</span>
              </div>
            </div>
          </div>

          <div className="admin-sidebar-store-return">
            <Link
              to="/"
              onClick={() => {
                if (onClose) onClose();
              }}
              className="admin-sidebar-store-link"
              title="Về trang cửa hàng"
            >
              <span className="admin-sidebar-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="arrow-left" size={16} />
              </span>
              <span className="admin-sidebar-label">Về trang cửa hàng</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
