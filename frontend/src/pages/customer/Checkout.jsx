import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import orderService from '../../services/orderService';
import paymentService from '../../services/paymentService';
import { PAYMENT_METHOD, PAYMENT_METHOD_LABELS } from '../../utils/constants';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import CartSummary from '../../components/cart/CartSummary';
import ErrorMessage from '../../components/common/ErrorMessage';

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, totalItems, totalPrice, refreshCart } = useCart();

  const [formData, setFormData] = useState({
    receiverName: '',
    receiverPhone: '',
    streetAddress: '',
    city: '',
    note: '',
    paymentMethod: PAYMENT_METHOD.COD
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Điền sẵn thông tin từ tài khoản người dùng nếu có
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        receiverName: user.fullName || '',
        receiverPhone: user.phone || '',
        streetAddress: user.address || ''
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (cartItems.length === 0) {
      setError('Giỏ hàng của bạn đang trống, không thể tiến hành đặt hàng!');
      return;
    }

    if (!formData.receiverName.trim() || !formData.receiverPhone.trim() || !formData.streetAddress.trim()) {
      setError('Vui lòng điền đầy đủ tên người nhận, số điện thoại và địa chỉ nhận hàng!');
      return;
    }

    // Kết hợp địa chỉ chi tiết và thành phố thành shippingAddress đầy đủ cho Backend
    const fullShippingAddress = formData.city
      ? `${formData.streetAddress.trim()}, ${formData.city.trim()}`
      : formData.streetAddress.trim();

    setLoading(true);

    try {
      // 1. Gửi request tạo đơn hàng đến Backend POST /api/orders/checkout
      const createdOrder = await orderService.checkout({
        receiverName: formData.receiverName.trim(),
        receiverPhone: formData.receiverPhone.trim(),
        shippingAddress: fullShippingAddress,
        note: formData.note ? formData.note.trim() : '',
        paymentMethod: formData.paymentMethod
      });

      // 2. Nếu khách hàng chọn thanh toán trực tuyến mô phỏng MOCK_ONLINE, tự động kích hoạt Mock Pay
      if (formData.paymentMethod === PAYMENT_METHOD.MOCK_ONLINE && createdOrder?.id) {
        try {
          await paymentService.mockPay(createdOrder.id, true);
        } catch (payErr) {
          console.warn('Lỗi thanh toán mô phỏng:', payErr);
        }
      }

      // 3. Đồng bộ lại giỏ hàng (Backend đã tự động dọn sạch giỏ sau khi checkout)
      await refreshCart();

      // 4. Điều hướng sang trang thành công
      navigate('/order-success', { state: { orderId: createdOrder?.id } });
    } catch (err) {
      setError(err.message || 'Đặt hàng không thành công. Vui lòng kiểm tra lại thông tin giỏ hàng!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-container">
      <h1 className="page-title">Thanh toán & Đặt hàng</h1>

      {error && <ErrorMessage message={error} onClose={() => setError('')} />}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Thông tin giao hàng */}
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#1e293b' }}>
              Thông tin nhận hàng
            </h2>

            <Input
              label="Họ và tên người nhận"
              name="receiverName"
              required
              value={formData.receiverName}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
            />

            <Input
              label="Số điện thoại nhận hàng"
              name="receiverPhone"
              type="tel"
              required
              value={formData.receiverPhone}
              onChange={handleChange}
              placeholder="0912345678"
            />

            <Input
              label="Địa chỉ chi tiết (Số nhà, tên đường)"
              name="streetAddress"
              required
              value={formData.streetAddress}
              onChange={handleChange}
              placeholder="Số nhà 123, đường Cầu Giấy, phường Dịch Vọng"
            />

            <Input
              label="Tỉnh / Thành phố"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Hà Nội, TP.HCM..."
            />

            <Input
              label="Ghi chú đơn hàng (Tùy chọn)"
              name="note"
              value={formData.note}
              onChange={handleChange}
              placeholder="Giao trong giờ hành chính, gọi trước khi giao..."
            />

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Phương thức thanh toán
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={PAYMENT_METHOD.COD}
                    checked={formData.paymentMethod === PAYMENT_METHOD.COD}
                    onChange={handleChange}
                  />
                  <span>💵 {PAYMENT_METHOD_LABELS[PAYMENT_METHOD.COD]}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={PAYMENT_METHOD.MOCK_ONLINE}
                    checked={formData.paymentMethod === PAYMENT_METHOD.MOCK_ONLINE}
                    onChange={handleChange}
                  />
                  <span>💳 {PAYMENT_METHOD_LABELS[PAYMENT_METHOD.MOCK_ONLINE]}</span>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              style={{ width: '100%' }}
              disabled={loading || cartItems.length === 0}
            >
              {loading ? 'Đang tạo đơn hàng...' : 'Xác nhận Đặt hàng'}
            </Button>
          </div>

          {/* Tóm tắt */}
          <div>
            <CartSummary totalItems={totalItems} totalPrice={totalPrice} showCheckoutButton={false} />
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
