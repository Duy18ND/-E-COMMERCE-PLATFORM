import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import orderService from '../../services/orderService';
import OrderItem from '../../components/order/OrderItem';
import EmptyState from '../../components/common/EmptyState';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import { ORDER_STATUS } from '../../utils/constants';

const FILTER_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: ORDER_STATUS.PENDING, label: 'Chờ xử lý / TT' },
  { key: ORDER_STATUS.PAID, label: 'Đã thanh toán' },
  { key: ORDER_STATUS.CONFIRMED, label: 'Đã xác nhận' },
  { key: ORDER_STATUS.PROCESSING, label: 'Đang xử lý' },
  { key: ORDER_STATUS.SHIPPING, label: 'Đang giao' },
  { key: ORDER_STATUS.COMPLETED, label: 'Hoàn thành' },
  { key: ORDER_STATUS.CANCELLED, label: 'Đã hủy' }
];

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      // Gọi API Backend thật: GET /api/v1/orders/my-orders
      const data = await orderService.getMyOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách đơn hàng. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // [Task ECOM-313] Đồng bộ tự động danh sách đơn hàng Customer khi Admin cập nhật trạng thái
    if (typeof orderService.subscribeOrderStatusSync === 'function') {
      return orderService.subscribeOrderStatusSync(() => {
        fetchOrders();
      });
    }
    return undefined;
  }, []);

  // Lọc danh sách theo tab trạng thái và từ khóa tìm kiếm
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filter theo trạng thái
      const matchesTab = activeTab === 'ALL' || order.status === activeTab;
      if (!matchesTab) return false;

      // Filter theo từ khóa
      if (!searchTerm.trim()) return true;
      const term = searchTerm.trim().toLowerCase();
      const matchId = String(order.id || order.orderNumber || '').toLowerCase().includes(term);
      const matchReceiver = String(order.receiverName || '').toLowerCase().includes(term);
      const matchItems = Array.isArray(order.items) && order.items.some((item) =>
        String(item.name || item.productName || '').toLowerCase().includes(term)
      );
      return matchId || matchReceiver || matchItems;
    });
  }, [orders, activeTab, searchTerm]);

  // Đếm số lượng theo trạng thái
  const counts = useMemo(() => {
    const map = { ALL: orders.length };
    orders.forEach((o) => {
      if (o.status) {
        map[o.status] = (map[o.status] || 0) + 1;
      }
    });
    return map;
  }, [orders]);

  if (loading) {
    return (
      <div className="container page-container">
        <Loading message="Đang tải danh sách đơn hàng của bạn..." />
      </div>
    );
  }

  return (
    <div className="container page-container" style={{ paddingBottom: '3rem' }}>
      {/* Header trang */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: '0 0 0.25rem 0' }}>Lịch sử đơn hàng của bạn</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            Theo dõi tiến độ, chi tiết và trạng thái các đơn hàng đã đặt
          </p>
        </div>
        <button
          onClick={fetchOrders}
          aria-label="Làm mới danh sách đơn hàng"
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#334155',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          🔄 Làm mới
        </button>
      </div>

      {error && <ErrorMessage message={error} onClose={() => setError('')} />}

      {/* Bộ lọc trạng thái (Tabs) & Tìm kiếm */}
      {orders.length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Lọc đơn hàng theo trạng thái"
            style={{
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '0.25rem',
              borderBottom: '1px solid #e2e8f0'
            }}
          >
            {FILTER_TABS.map((tab) => {
              const count = counts[tab.key] || 0;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '0.55rem 0.95rem',
                    borderRadius: '8px 8px 0 0',
                    border: 'none',
                    borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                    background: isActive ? '#eff6ff' : 'transparent',
                    color: isActive ? '#1d4ed8' : '#64748b',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span
                      style={{
                        padding: '0.1rem 0.45rem',
                        borderRadius: '9999px',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        backgroundColor: isActive ? '#2563eb' : '#e2e8f0',
                        color: isActive ? '#ffffff' : '#475569'
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ maxWidth: '400px', width: '100%' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã đơn, tên người nhận, sản phẩm..."
              aria-label="Tìm kiếm đơn hàng"
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      )}

      {/* Hiển thị danh sách đơn hoặc Empty State */}
      {orders.length === 0 ? (
        <EmptyState
          title="Bạn chưa có đơn hàng nào"
          description="Hãy đặt mua sản phẩm đầu tiên để theo dõi tình trạng đơn hàng tại đây."
          actionText="Bắt đầu mua sắm"
          onAction={() => navigate('/products')}
        />
      ) : filteredOrders.length === 0 ? (
        <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Không tìm thấy đơn hàng phù hợp</h3>
          <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.9rem' }}>
            Không có đơn hàng nào khớp với bộ lọc hoặc từ khóa tìm kiếm của bạn.
          </p>
          <button
            onClick={() => {
              setActiveTab('ALL');
              setSearchTerm('');
            }}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div>
          {filteredOrders.map((order) => (
            <OrderItem key={order.id || order.orderNumber} order={order} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
