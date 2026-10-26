import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import orderService from '../../services/orderService';
import { formatCurrency } from '../../utils/formatCurrency';
import Loading from '../../components/common/Loading';

const Dashboard = () => {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Gọi API Backend: GET /api/admin/orders/stats
        const data = await orderService.getOrderStats();
        setStatsData(data);
      } catch (err) {
        console.warn('Chưa thể tải thống kê từ máy chủ:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const totalRevenue = statsData?.totalRevenue ?? 0;
  const totalOrders = statsData?.totalOrders ?? 0;
  const pendingOrders = statsData?.pendingOrders ?? 0;
  const totalUsers = statsData?.totalUsers ?? 0;

  const statsCards = [
    {
      title: 'Doanh thu hệ thống',
      value: formatCurrency(totalRevenue),
      icon: '💰',
      color: '#2563eb'
    },
    {
      title: 'Tổng đơn hàng',
      value: totalOrders,
      icon: '📑',
      color: '#16a34a'
    },
    {
      title: 'Đơn chờ xử lý (PENDING)',
      value: pendingOrders,
      icon: '⏳',
      color: '#d97706'
    },
    {
      title: 'Tổng người dùng',
      value: totalUsers,
      icon: '👥',
      color: '#9333ea'
    }
  ];

  return (
    <div>
      <h1 className="page-title">Bảng điều khiển Quản trị</h1>
      <p className="page-subtitle">Tổng quan hoạt động kinh doanh và số liệu thời gian thực</p>

      {loading ? (
        <div style={{ padding: '2rem 0' }}>
          <Loading message="Đang cập nhật chỉ số thống kê..." />
        </div>
      ) : (
        /* Stats Cards */
        <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
          {statsCards.map((stat, idx) => (
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
      )}

      {/* Quick shortcuts */}
      <div className="card">
        <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Thao tác nhanh</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <Link
            to="/admin/orders"
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              borderRadius: '0.375rem',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            📑 Kiểm tra danh sách đơn hàng cần duyệt
          </Link>
          <Link
            to="/admin/products/new"
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#f0fdf4',
              color: '#166534',
              borderRadius: '0.375rem',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            ➕ Thêm sản phẩm mới
          </Link>
          <Link
            to="/admin/inventory"
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              borderRadius: '0.375rem',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            ⚠️ Kiểm tra tồn kho sản phẩm
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
