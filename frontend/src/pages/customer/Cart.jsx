import { Link, Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import CartItem from '../../components/cart/CartItem';
import CartSummary from '../../components/cart/CartSummary';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';

const Cart = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const { cartItems, totalItems, totalPrice, clearCart } = useCart();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isAdmin) {
    return (
      <div className="container page-container">
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', maxWidth: '600px', margin: '2rem auto' }}>
          <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem' }}>🛡️</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            Khu vực mua sắm dành cho Khách hàng
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.925rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
            Tài khoản Quản trị viên (Admin) không sử dụng tính năng giỏ hàng mua sắm. Bạn có thể quản lý sản phẩm, đơn hàng và danh mục trong trang Quản trị.
          </p>
          <Link
            to="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '0.65rem 1.5rem',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}
          >
            <span>Về trang Quản trị (Admin)</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>
    );
  }


  if (cartItems.length === 0) {
    return (
      <div className="container page-container">
        <h1 className="page-title">Giỏ hàng của bạn</h1>
        <EmptyState
          title="Giỏ hàng đang trống"
          description="Bạn chưa thêm sản phẩm nào vào giỏ hàng. Hãy khám phá ngay các sản phẩm hấp dẫn!"
          actionText="Tiếp tục mua sắm"
          onAction={() => window.location.href = '/products'}
        />
      </div>
    );
  }

  return (
    <div className="container page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Giỏ hàng ({totalItems} món)</h1>
        <Button variant="outline" size="sm" onClick={clearCart}>
          Xóa toàn bộ giỏ hàng
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
        <div className="card" style={{ padding: 0 }}>
          {cartItems.map((item) => (
            <CartItem key={item.id} item={item} />
          ))}
        </div>

        <div>
          <CartSummary totalItems={totalItems} totalPrice={totalPrice} />
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Link to="/products" style={{ fontSize: '0.9rem', color: '#64748b' }}>
              &larr; Tiếp tục chọn thêm sản phẩm
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
