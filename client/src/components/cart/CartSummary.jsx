import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import Button from '../common/Button';

const CartSummary = ({ totalItems = 0, totalPrice = 0, showCheckoutButton = true }) => {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        Tóm tắt đơn hàng
      </h3>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#64748b' }}>
        <span>Tổng số lượng:</span>
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{totalItems} sản phẩm</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#64748b' }}>
        <span>Phí vận chuyển:</span>
        <span style={{ color: '#16a34a', fontWeight: 500 }}>Miễn phí</span>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '0.75rem',
          marginBottom: '1.25rem',
          fontSize: '1.125rem',
          fontWeight: 'bold'
        }}
      >
        <span>Tổng thanh toán:</span>
        <span style={{ color: '#2563eb' }}>{formatCurrency(totalPrice)}</span>
      </div>

      {showCheckoutButton && (
        <Link to="/checkout" style={{ width: '100%', display: 'block' }}>
          <Button variant="primary" style={{ width: '100%' }} disabled={totalItems === 0}>
            Tiến hành đặt hàng
          </Button>
        </Link>
      )}
    </div>
  );
};

export default CartSummary;
