import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';

const ProductDetail = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    const success = addToCart(product, quantity);
    if (success) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1500);
    }
  };


  useEffect(() => {
    // Sẵn sàng kết nối productService.getById(id)
    setLoading(true);
    const timer = setTimeout(() => {
      setProduct({
        id,
        name: `Sản phẩm mẫu #${id}`,
        price: 15000000,
        category: 'Điện tử',
        stock: 12,
        description: 'Mô tả chi tiết sản phẩm. Đây là nội dung mẫu thể hiện thông số kỹ thuật và thông tin bảo hành của sản phẩm.'
      });
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [id]);

  if (loading) {
    return (
      <div className="container page-container">
        <Loading message="Đang tải thông tin sản phẩm..." />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container page-container">
        <p>Không tìm thấy sản phẩm.</p>
        <Link to="/products">Quay lại danh sách</Link>
      </div>
    );
  }

  return (
    <div className="container page-container">
      <Link to="/products" style={{ display: 'inline-block', marginBottom: '1rem', color: '#64748b' }}>
        &larr; Quay lại danh sách sản phẩm
      </Link>

      <div className="grid-cols-2" style={{ alignItems: 'start' }}>
        {/* Product Image Box */}
        <div
          className="card"
          style={{
            height: '360px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc'
          }}
        >
          <span style={{ fontSize: '5rem', color: '#cbd5e1' }}>📦</span>
        </div>

        {/* Product Information */}
        <div className="card">
          <span className="badge badge-primary">{product.category}</span>
          <h1 style={{ fontSize: '1.75rem', margin: '0.75rem 0' }}>{product.name}</h1>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb', marginBottom: '1rem' }}>
            {formatCurrency(product.price)}
          </div>

          <p style={{ color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            {product.description}
          </p>

          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#475569' }}>Tình trạng kho: </span>
            <strong style={{ color: product.stock > 0 ? '#16a34a' : '#dc2626' }}>
              {product.stock > 0 ? `Còn hàng (${product.stock})` : 'Hết hàng'}
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Số lượng:</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                style={{ width: '32px', height: '32px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px' }}
              >
                -
              </button>
              <span style={{ minWidth: '32px', textAlign: 'center', fontWeight: 'bold' }}>{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                style={{ width: '32px', height: '32px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px' }}
              >
                +
              </button>
            </div>
          </div>

          {isAdmin && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                color: '#92400e',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>⚠️</span>
              <span>
                <strong>Tài khoản Quản trị viên (Admin):</strong> Bạn không được phép mua hàng hay thêm sản phẩm vào giỏ.
              </span>
            </div>
          )}

          <Button
            variant={isAdmin ? 'secondary' : isAdded ? 'success' : 'primary'}
            size="lg"
            onClick={handleAddToCart}
            disabled={isAdmin}
            style={{
              width: '100%',
              backgroundColor: isAdmin ? '#94a3b8' : isAdded ? '#16a34a' : undefined,
              borderColor: isAdmin ? '#94a3b8' : isAdded ? '#16a34a' : undefined,
              color: '#ffffff',
              cursor: isAdmin ? 'not-allowed' : 'pointer',
              transition: 'all 0.25s ease'
            }}
          >
            {isAdmin ? 'Admin (Không thể thêm giỏ hàng)' : isAdded ? '✓ Đã thêm vào giỏ hàng' : 'Thêm vào giỏ hàng'}
          </Button>


        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
