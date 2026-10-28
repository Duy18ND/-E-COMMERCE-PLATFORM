import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  const { cartItems, totalItems, totalPrice, totalOriginalPrice, totalDiscount, refreshCart, addToCart } = useCart();

  const [formData, setFormData] = useState({
    receiverName: user?.fullName || 'Nguyễn Văn A',
    receiverPhone: user?.phone || '0912 345 678',
    streetAddress: user?.address || '123 Đường Cầu Giấy, Phường Dịch Vọng',
    city: 'Hà Nội',
    note: 'Giao trong giờ hành chính, gọi trước khi giao 15 phút',
    paymentMethod: PAYMENT_METHOD.COD
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Điền sẵn thông tin từ tài khoản người dùng nếu có
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        receiverName: user.fullName || prev.receiverName,
        receiverPhone: user.phone || prev.receiverPhone,
        streetAddress: user.address || prev.streetAddress
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFillTestData = () => {
    setFormData({
      receiverName: 'Nguyễn Văn A',
      receiverPhone: '0912 345 678',
      streetAddress: '123 Đường Cầu Giấy, Phường Dịch Vọng',
      city: 'Hà Nội',
      note: 'Đơn hàng thử nghiệm Flash Sale ShopMart',
      paymentMethod: PAYMENT_METHOD.COD
    });
  };

  const handleAddSampleItem = () => {
    addToCart(
      {
        id: 'fs-1',
        name: 'MacBook Pro 14 M3 Pro (18GB / 512GB SSD)',
        price: 49990000,
        salePrice: 32490000,
        discountPercent: 35,
        isFlashSale: true,
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80'
      },
      1
    );
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
      // 1. Gửi request tạo đơn hàng đến Backend hoặc Local Mock
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

      // 3. Đồng bộ lại giỏ hàng (đã tự động dọn sạch sau khi checkout)
      await refreshCart();

      // 4. Điều hướng sang trang thành công và truyền chi tiết đơn
      navigate('/order-success', {
        state: {
          orderId: createdOrder?.id,
          order: createdOrder
        }
      });
    } catch (err) {
      setError(err.message || 'Đặt hàng không thành công. Vui lòng kiểm tra lại thông tin giỏ hàng!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-container" style={{ paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Thanh toán & Xác nhận Đơn hàng</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Kiểm tra thông tin giao hàng và xác nhận đơn hàng của bạn
          </p>
        </div>

        {/* Nút test nhanh cho người kiểm thử */}
        <button
          type="button"
          onClick={handleFillTestData}
          style={{
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '0.45rem 0.85rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#2563eb',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <span>⚡</span>
          <span>Điền nhanh thông tin test</span>
        </button>
      </div>

      {error && <ErrorMessage message={error} onClose={() => setError('')} />}

      {cartItems.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>🛒</span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            Giỏ hàng của bạn đang trống
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 1.5rem' }}>
            Bạn cần có ít nhất 1 sản phẩm trong giỏ để thực hiện xác nhận đơn hàng.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleAddSampleItem}
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.65rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ⚡ Thêm sản phẩm mẫu Flash Sale để test ngay
            </button>
            <Link to="/flash-sale" style={{ textDecoration: 'none' }}>
              <Button variant="outline">
                Quay lại săn Flash Sale
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.75fr 1fr',
              gap: '2rem',
              alignItems: 'start'
            }}
            className="grid-cols-2"
          >
            {/* Thông tin giao hàng */}
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>📍</span>
                  <span>1. Thông tin người nhận hàng</span>
                </h2>
                <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                  Sẵn sàng đặt hàng
                </span>
              </div>

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
                label="Địa chỉ chi tiết (Số nhà, tên đường, phường/xã)"
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

              {/* Phương thức thanh toán */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>💳</span>
                  <span>2. Phương thức thanh toán</span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border: formData.paymentMethod === PAYMENT_METHOD.COD ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: formData.paymentMethod === PAYMENT_METHOD.COD ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={PAYMENT_METHOD.COD}
                      checked={formData.paymentMethod === PAYMENT_METHOD.COD}
                      onChange={handleChange}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                        💵 {PAYMENT_METHOD_LABELS[PAYMENT_METHOD.COD]}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Thanh toán bằng tiền mặt khi shipper giao tận nơi và đồng kiểm hàng
                      </div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border: formData.paymentMethod === PAYMENT_METHOD.MOCK_ONLINE ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: formData.paymentMethod === PAYMENT_METHOD.MOCK_ONLINE ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={PAYMENT_METHOD.MOCK_ONLINE}
                      checked={formData.paymentMethod === PAYMENT_METHOD.MOCK_ONLINE}
                      onChange={handleChange}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                        💳 {PAYMENT_METHOD_LABELS[PAYMENT_METHOD.MOCK_ONLINE]}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Tự động duyệt trạng thái Đã Thanh Toán (PAID) phục vụ kiểm thử nhanh
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit button */}
              <div style={{ marginTop: '1.75rem' }}>
                <button
                  type="submit"
                  disabled={loading || cartItems.length === 0}
                  style={{
                    width: '100%',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.95rem',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = '#b91c1c';
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) e.currentTarget.style.backgroundColor = '#dc2626';
                  }}
                >
                  <span>{loading ? '⏳' : '✓'}</span>
                  <span>{loading ? 'Đang xác nhận đơn hàng...' : 'Xác nhận Đặt hàng'}</span>
                </button>
              </div>
            </div>

            {/* Right Column: Order Summary Preview */}
            <div>
              <CartSummary
                totalItems={totalItems}
                totalPrice={totalPrice}
                totalOriginalPrice={totalOriginalPrice}
                totalDiscount={totalDiscount}
                showCheckoutButton={false}
              />
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default Checkout;
