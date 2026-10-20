import { NavLink, Link } from 'react-router-dom';

const AdminSidebar = () => {
  const menuItems = [
    { label: '📊 Tổng quan', path: '/admin', end: true },
    { label: '📦 Quản lý sản phẩm', path: '/admin/products' },
    { label: '🏷️ Quản lý danh mục', path: '/admin/categories' },
    { label: '📑 Quản lý đơn hàng', path: '/admin/orders' },
    { label: '🏭 Quản lý tồn kho', path: '/admin/inventory' }
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
        justifyContent: 'space-between'
      }}
    >
      <div>
        <div style={{ padding: '0 0.5rem 1.5rem', borderBottom: '1px solid #1e293b' }}>
          <h2 style={{ fontSize: '1.25rem', color: '#38bdf8', fontWeight: 'bold' }}>Admin Portal</h2>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Quản trị hệ thống</span>
        </div>

        <nav style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              style={({ isActive }) => ({
                display: 'block',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.375rem',
                color: isActive ? '#ffffff' : '#94a3b8',
                backgroundColor: isActive ? '#2563eb' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.925rem'
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
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
    </aside>
  );
};

export default AdminSidebar;
