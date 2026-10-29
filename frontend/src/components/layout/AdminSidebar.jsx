import { NavLink, Link } from 'react-router-dom';

const AdminSidebar = () => {
  const menuItems = [
    { label: '📊 Tổng quan', path: '/admin', end: true },
    { label: '📦 Quản lý sản phẩm', path: '/admin/products' },
    { label: '🏷️ Quản lý danh mục', path: '/admin/categories' },
    { label: '📑 Quản lý đơn hàng', path: '/admin/orders' },
    { label: '🏭 Quản lý tồn kho', path: '/admin/inventory' },
    { label: '⚡ Quản lý Sale / Khuyến mãi', path: '/admin/sales' },
    { label: '🎫 Quản lý mã giảm giá', path: '/admin/vouchers' }
  ];

  return (
    <aside
      className="admin-sidebar"
      style={{
        width: '260px',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        minHeight: '100vh',
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0
      }}
    >
      <div>
        <div style={{ padding: '0 0.5rem 1.5rem', borderBottom: '1px solid #1e293b' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#38bdf8', fontWeight: 'bold' }}>Admin Portal</h2>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Quản trị hệ thống ShopMart</span>
        </div>

        <nav style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                color: isActive ? '#ffffff' : '#94a3b8',
                backgroundColor: isActive ? '#2563eb' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.925rem',
                transition: 'all 0.15s ease'
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div>
        {/* Active Campaign Mini Card as shown in Image 4 & 5 */}
        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem'
            }}
          >
            ⚡
          </div>
          <div>
            <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>Chiến dịch Sale</div>
            <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#f87171' }}>
              ● Đang hoạt động
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '1rem' }}>
          <Link
            to="/"
            style={{
              display: 'block',
              padding: '0.5rem 0.85rem',
              color: '#cbd5e1',
              fontSize: '0.875rem'
            }}
          >
            ⬅️ Về trang cửa hàng
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
