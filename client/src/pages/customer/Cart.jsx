import { Link } from 'react-router-dom';
import useCart from '../../hooks/useCart';
import CartItem from '../../components/cart/CartItem';
import CartSummary from '../../components/cart/CartSummary';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';

const Cart = () => {
  const { cartItems, totalItems, totalPrice, clearCart } = useCart();

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
