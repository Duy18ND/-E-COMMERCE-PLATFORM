import { Link } from 'react-router-dom';
import Icon from '../common/Icons';

const Footer = () => {
  return (
    <footer
      style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e3e8ef',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  backgroundColor: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}
              >
                <Icon name="store" size={18} color="#ffffff" />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0b1220', letterSpacing: '-0.02em' }}>
                Shop<span style={{ color: '#2563eb' }}>Mart</span>
              </span>
            </div>
            <p style={{ lineHeight: 1.65, color: '#475569', fontSize: '0.85rem' }}>
              Hệ sinh thái công nghệ chuẩn mực, phân phối thiết bị điện tử và tiện ích thông minh chính hãng 100%.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ color: '#0b1220', fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>
              Khám Phá
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <Link to="/products" style={{ color: '#475569' }}>Điện thoại &amp; Tablet</Link>
              <Link to="/products" style={{ color: '#475569' }}>Laptop &amp; Workstation</Link>
              <Link to="/products" style={{ color: '#475569' }}>Phụ kiện &amp; Âm thanh</Link>
              <Link to="/products" style={{ color: '#475569' }}>Nhà thông minh &amp; Gia dụng</Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 style={{ color: '#0b1220', fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>
              Chính Sách &amp; Hỗ Trợ
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <span style={{ color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                <Icon name="shield-check" size={15} color="#2563eb" />
                <span>Cam kết 100% chính hãng</span>
              </span>
              <span style={{ color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                <Icon name="headset" size={15} color="#2563eb" />
                <span>Bảo hành toàn diện 24/7</span>
              </span>
              <span style={{ color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                <Icon name="shipping" size={15} color="#2563eb" />
                <span>Vận chuyển toàn quốc</span>
              </span>
              <span style={{ color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                <Icon name="refresh" size={15} color="#2563eb" />
                <span>Chính sách đổi trả 30 ngày</span>
              </span>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: '#0b1220', fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>
              Hotline Tư Vấn
            </h4>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', marginBottom: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
              <Icon name="phone" size={18} />
              <span>1900 8888</span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Icon name="clock" size={14} />
              <span>Từ 8:00 - 22:00 hàng ngày (kể cả CN &amp; Lễ)</span>
            </p>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid #eef2f7',
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
          <p style={{ color: '#64748b' }}>Nền tảng thương mại điện tử công nghệ cao</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
