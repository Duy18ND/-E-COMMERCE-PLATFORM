import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useCart from '../../hooks/useCart';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import CartSummary from '../../components/cart/CartSummary';

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, totalItems, totalPrice, clearCart } = useCart();

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    note: '',
    paymentMethod: 'COD'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Logic gửi đơn hàng đến backend sau này qua orderService.createOrder
    console.log('Đặt hàng với dữ liệu:', formData, cartItems);

    clearCart();
    navigate('/order-success');
  };

  return (
    <div className="container page-container">
      <h1 className="page-title">Thanh toán & Đặt hàng</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Thông tin giao hàng */}
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: '#1e293b' }}>
              Thông tin nhận hàng
            </h2>

            <Input
              label="Họ và tên"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
            />

            <Input
              label="Số điện thoại"
              name="phone"
              type="tel"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="0912345678"
            />

            <Input
              label="Địa chỉ chi tiết"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              placeholder="Số nhà, tên đường, phường/xã"
            />

            <Input
              label="Tỉnh / Thành phố"
              name="city"
              required
              value={formData.city}
              onChange={handleChange}
              placeholder="Hà Nội, TP.HCM, ..."
            />

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Phương thức thanh toán
              </label>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={formData.paymentMethod === 'COD'}
                    onChange={handleChange}
                  />
                  Thanh toán khi nhận hàng (COD)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="BANKING"
                    checked={formData.paymentMethod === 'BANKING'}
                    onChange={handleChange}
                  />
                  Chuyển khoản ngân hàng
                </label>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" style={{ width: '100%' }}>
              Xác nhận Đặt hàng
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
