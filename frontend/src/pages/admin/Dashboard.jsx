import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';

const Dashboard = () => {
  const stats = [
    { title: 'Doanh thu tháng', value: formatCurrency(125400000), icon: '💰', color: '#2563eb' },
    { title: 'Đơn hàng mới', value: '48', icon: '📑', color: '#16a34a' },
    { title: 'Tổng sản phẩm', value: '156', icon: '📦', color: '#9333ea' },
    { title: 'Cảnh báo hết hàng', value: '5', icon: '⚠️', color: '#dc2626' }
  ];

  return (
    <div>
      <h1 className="page-title">Bảng điều khiển Quản trị</h1>
      <p className="page-subtitle">Tổng quan hoạt động kinh doanh và trạng thái hệ thống</p>

      {/* Stats Cards */}
      <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
        {stats.map((stat, idx) => (
          <div key={idx} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '0.5rem',
                backgroundColor: `${stat.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}
            >
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{stat.title}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick shortcuts */}
      <div className="card">
        <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Thao tác nhanh</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <Link
            to="/admin/products/new"
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              borderRadius: '0.375rem',
              fontWeight: 500
            }}
          >
            ➕ Thêm sản phẩm mới
          </Link>
          <Link
            to="/admin/orders"
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#f0fdf4',
              color: '#16a34a',
              borderRadius: '0.375rem',
              fontWeight: 500
            }}
          >
            📑 Kiểm tra đơn hàng cần duyệt
          </Link>
          <Link
            to="/admin/inventory"
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              borderRadius: '0.375rem',
              fontWeight: 500
            }}
          >
            ⚠️ Kiểm tra tồn kho sắp hết
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
