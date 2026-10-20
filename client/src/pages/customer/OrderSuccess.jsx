import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';

const OrderSuccess = () => {
  return (
    <div className="container page-container" style={{ textAlign: 'center', maxWidth: '600px' }}>
      <div className="card" style={{ padding: '3rem 2rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem', color: '#16a34a' }}>🎉</div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem', color: '#0f172a' }}>
          Đặt hàng thành công!
        </h1>
        <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: 1.6 }}>
          Cảm ơn bạn đã tin tưởng mua sắm tại cửa hàng của chúng tôi. Đơn hàng của bạn đã được ghi nhận và đang được chuẩn bị để giao trong thời gian sớm nhất.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <Link to="/orders">
            <Button variant="primary">Xem lịch sử đơn hàng</Button>
          </Link>
          <Link to="/products">
            <Button variant="outline">Tiếp tục mua sắm</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
