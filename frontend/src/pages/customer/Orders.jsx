import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import orderService from '../../services/orderService';
import reviewService, { isOrderCompletedForReview } from '../../services/reviewService';
import productService from '../../services/productService';
import OrderItem from '../../components/order/OrderItem';
import ProductReviewForm from '../../components/product/ProductReviewForm';
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

  // Map lưu đánh giá của người dùng hiện tại theo productId: { [productId]: ReviewResponse }
  const [reviewsMap, setReviewsMap] = useState({});
  // Map lưu hình ảnh sản phẩm thực tế từ Backend product-service: { [productId]: imageUrl }
  const [productImagesMap, setProductImagesMap] = useState({});
  // State quản lý Modal đánh giá sản phẩm ngay trên trang Lịch sử mua hàng
  const [reviewModalState, setReviewModalState] = useState(null);

  const loadUserReviewsAndImagesForOrders = useCallback(async (orderList) => {
    if (!Array.isArray(orderList) || orderList.length === 0) return;

    const uniqueProductIds = Array.from(
      new Set(
        orderList
          .flatMap((ord) => (Array.isArray(ord.items) ? ord.items : []))
          .map((item) => item?.productId || item?.id)
          .filter(Boolean)
          .map((pid) => String(pid))
      )
    );

    if (uniqueProductIds.length === 0) return;

    const reviewEntries = await Promise.all(
      uniqueProductIds.map(async (pid) => {
        try {
          const myRev = await reviewService.getMyReview(pid);
          return [pid, myRev];
        } catch {
          return [pid, null];
        }
      })
    );

    const nextReviewsMap = {};
    reviewEntries.forEach(([pid, rev]) => {
      if (rev && rev.id) {
        nextReviewsMap[String(pid)] = rev;
      }
    });
    setReviewsMap(nextReviewsMap);

    // Tải ảnh sản phẩm thật từ Backend cho các item chưa có imageUrl
    const imageEntries = await Promise.all(
      uniqueProductIds.map(async (pid) => {
        try {
          const prod = await productService.getById(pid);
          return [pid, prod?.imageUrl || prod?.image || null];
        } catch {
          return [pid, null];
        }
      })
    );

    const nextImagesMap = {};
    imageEntries.forEach(([pid, imgUrl]) => {
      if (imgUrl) {
        nextImagesMap[String(pid)] = imgUrl;
      }
    });
    setProductImagesMap(nextImagesMap);
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Gọi API Backend thật: GET /api/v1/orders/my-orders
      const data = await orderService.getMyOrders();
      const orderList = Array.isArray(data) ? data : [];
      setOrders(orderList);
      await loadUserReviewsAndImagesForOrders(orderList);
    } catch (err) {
      const status = err?.status || err?.response?.status;
      if (status === 401) {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem lịch sử đơn hàng.');
      } else {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Không thể tải danh sách đơn hàng từ máy chủ. Vui lòng thử lại!'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [loadUserReviewsAndImagesForOrders]);

  useEffect(() => {
    fetchOrders();
    // [Task ECOM-313] Đồng bộ tự động danh sách đơn hàng Customer khi Admin cập nhật trạng thái
    if (typeof orderService.subscribeOrderStatusSync === 'function') {
      return orderService.subscribeOrderStatusSync(() => {
        fetchOrders();
      });
    }
    return undefined;
  }, [fetchOrders]);

  // Mở Modal đánh giá sản phẩm từ danh sách đơn hàng
  const handleOpenReviewModal = (order, item, existingReview = null) => {
    if (!order || !item) return;
    if (!isOrderCompletedForReview(order.status)) {
      return;
    }
    const productId = item.productId || item.id;
    const currentReview = existingReview || (productId ? reviewsMap[String(productId)] : null) || null;
    setReviewModalState({
      order,
      item,
      existingReview: currentReview
    });
  };

  const handleCloseReviewModal = () => {
    setReviewModalState(null);
  };

  // Sau khi gửi đánh giá thành công -> cập nhật ngay trạng thái sản phẩm sang "Đã đánh giá" không cần reload trang
  const handleReviewSuccess = (savedReview) => {
    const productId =
      savedReview?.productId ||
      reviewModalState?.item?.productId ||
      reviewModalState?.item?.id;

    if (productId && savedReview) {
      setReviewsMap((prev) => ({
        ...prev,
        [String(productId)]: savedReview
      }));
    }
    setReviewModalState(null);
  };

  // Nếu Backend báo 409 Conflict (đã đánh giá trước đó), đồng bộ lại đánh giá thật từ Backend
  const handleDuplicateReviewDetected = async (productId) => {
    if (!productId) return;
    try {
      const existing = await reviewService.getMyReview(productId);
      if (existing && existing.id) {
        setReviewsMap((prev) => ({
          ...prev,
          [String(productId)]: existing
        }));
      }
    } catch {
      // Bỏ qua nếu không tải được
    }
  };

  // Lọc danh sách theo tab trạng thái và từ khóa tìm kiếm
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filter theo trạng thái (Tab COMPLETED khớp cả DELIVERED và COMPLETED từ Backend)
      const matchesTab =
        activeTab === 'ALL' ||
        order.status === activeTab ||
        (activeTab === ORDER_STATUS.COMPLETED && isOrderCompletedForReview(order.status));
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
        if (o.status === 'DELIVERED') {
          map[ORDER_STATUS.COMPLETED] = (map[ORDER_STATUS.COMPLETED] || 0) + 1;
        }
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

  const activeModalProductId =
    reviewModalState?.item?.productId || reviewModalState?.item?.id;
  const activeModalProductImage =
    reviewModalState?.item?.imageUrl ||
    reviewModalState?.item?.image ||
    (activeModalProductId ? productImagesMap[String(activeModalProductId)] : null);

  return (
    <div className="container page-container" style={{ paddingBottom: '3rem' }}>
      {/* Header trang */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: '0 0 0.25rem 0' }}>Lịch sử đơn hàng của bạn</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
            Theo dõi tiến độ, chi tiết và đánh giá các sản phẩm trong đơn hàng đã hoàn thành
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
            <OrderItem
              key={order.id || order.orderNumber}
              order={order}
              reviewsMap={reviewsMap}
              productImagesMap={productImagesMap}
              onOpenReviewModal={handleOpenReviewModal}
            />
          ))}
        </div>
      )}

      {/* MODAL ĐÁNH GIÁ SẢN PHẨM TRONG LỊCH SỬ MUA HÀNG */}
      {reviewModalState && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Đánh giá sản phẩm đã mua"
          data-testid="order-history-review-modal"
          onClick={handleCloseReviewModal}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1100
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '640px',
              maxHeight: '92vh',
              overflowY: 'auto'
            }}
          >
            <ProductReviewForm
              product={{
                id: activeModalProductId,
                name: reviewModalState.item.productName || reviewModalState.item.name,
                imageUrl: activeModalProductImage
              }}
              orderId={reviewModalState.order.id}
              orderInfo={reviewModalState.order}
              initialReview={reviewModalState.existingReview}
              onSuccess={handleReviewSuccess}
              onCancel={handleCloseReviewModal}
              onDuplicateDetected={handleDuplicateReviewDetected}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
