import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer
      style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #f1f5f9',
        padding: '3rem 0 2rem',
        marginTop: 'auto',
        color: '#64748b',
        fontSize: '0.875rem'
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2.5rem',
            marginBottom: '2.5rem'
          }}
        >
          {/* Brand Col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}
              >
                🛒
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>ShopMart</span>
            </div>
            <p style={{ lineHeight: 1.6, color: '#64748b', fontSize: '0.85rem' }}>
              Hệ sinh thái công nghệ chuẩn mực, phân phối thiết bị điện tử và tiện ích thông minh chính hãng 100%.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ color: '#0f172a', fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>
              Khám Phá
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link to="/products" style={{ color: '#64748b' }}>Điện thoại & Tablet</Link>
              <Link to="/products" style={{ color: '#64748b' }}>Laptop & Workstation</Link>
              <Link to="/products" style={{ color: '#64748b' }}>Phụ kiện & Âm thanh</Link>
              <Link to="/products" style={{ color: '#64748b' }}>Nhà thông minh & Gia dụng</Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 style={{ color: '#0f172a', fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>
              Chính Sách & Hỗ Trợ
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ color: '#64748b' }}>Cam kết 100% chính hãng</span>
              <span style={{ color: '#64748b' }}>Bảo hành toàn diện 24/7</span>
              <span style={{ color: '#64748b' }}>Vận chuyển toàn quốc</span>
              <span style={{ color: '#64748b' }}>Chính sách đổi trả 30 ngày</span>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: '#0f172a', fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>
              Hotline Tư Vấn
            </h4>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', marginBottom: '0.25rem' }}>
              1900 8888
            </div>
            <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
              Từ 8:00 - 22:00 hàng ngày (kể cả CN & Lễ)
            </p>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid #f1f5f9',
            paddingTop: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '0.8rem'
          }}
        >
          <p>&copy; {new Date().getFullYear()} ShopMart. All rights reserved.</p>
          <p style={{ color: '#94a3b8' }}>Nền tảng thương mại điện tử công nghệ cao</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
