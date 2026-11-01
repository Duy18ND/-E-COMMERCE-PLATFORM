import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import useToast from '../../hooks/useToast';
import productService from '../../services/productService';
import saleService from '../../services/saleService';
import FlashCountdown from '../../components/sale/FlashCountdown';
import Loading from '../../components/common/Loading';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [product, setProduct] = useState(null);
  const [stockInfo, setStockInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedStorage, setSelectedStorage] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAdded, setIsAdded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    setLoading(true);
    setQuantity(1);
    productService
      .getById(id)
      .then(async (data) => {
        setProduct(data);
        setIsWishlisted(saleService.getWishlist().includes(data.id));
        try {
          const stockRes = await productService.checkStock(data.id ?? id, 1);
          setStockInfo(stockRes);
        } catch {
          const fallbackQty = Math.max(0, Number(data.stockQuantity ?? data.stock ?? 0));
          setStockInfo({
            productId: data.id,
            stockQuantity: fallbackQty,
            inStock: fallbackQty > 0,
            sufficientStock: fallbackQty >= 1,
            stockStatusMessage:
              fallbackQty > 0 ? `Còn hàng (${fallbackQty} sản phẩm có sẵn)` : 'Hết hàng'
          });
        }
      })
      .catch(() => {
        // Fallback tìm trong saleService
        const saleProd = saleService.getProductById(id);
        if (saleProd) {
          setProduct(saleProd);
          const fallbackQty = Math.max(0, Number(saleProd.stockQuantity ?? saleProd.stock ?? 0));
          setStockInfo({
            productId: saleProd.id,
            stockQuantity: fallbackQty,
            inStock: fallbackQty > 0,
            sufficientStock: fallbackQty >= 1,
            stockStatusMessage:
              fallbackQty > 0 ? `Còn hàng (${fallbackQty} sản phẩm có sẵn)` : 'Hết hàng'
          });
          setIsWishlisted(saleService.getWishlist().includes(saleProd.id));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="container page-container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <Loading message="Đang tải chi tiết sản phẩm và khuyến mãi..." />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container page-container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Không tìm thấy sản phẩm</h2>
        <p style={{ color: '#64748b', margin: '0.5rem 0 1.5rem' }}>
          Sản phẩm có thể đã ngừng kinh doanh hoặc đường dẫn không đúng.
        </p>
        <Link
          to="/products"
          style={{
            display: 'inline-block',
            padding: '0.65rem 1.5rem',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            borderRadius: '9999px',
            fontWeight: 700
          }}
        >
          Quay lại danh sách sản phẩm
        </Link>
      </div>
    );
  }

  const isSale = Boolean(product.isFlashSale || product.salePrice);
  const originalPrice = product.price || 0;

  // Tính giá theo dung lượng ổ cứng nếu có options
  const storageOption = product.storageOptions && product.storageOptions[selectedStorage];
  const currentSalePrice = storageOption ? storageOption.price : (product.salePrice || originalPrice);
  const currentOriginalPrice = storageOption ? storageOption.originalPrice : originalPrice;
  const currentDiscount = storageOption ? storageOption.discount : (product.discountPercent || 0);
  const savedAmount = Math.max(0, currentOriginalPrice - currentSalePrice);

  const actualStockQuantity = Math.max(
    0,
    Number(stockInfo?.stockQuantity ?? product.stockQuantity ?? product.stock ?? 0)
  );
  const isOutOfStock = stockInfo
    ? !stockInfo.inStock || actualStockQuantity <= 0
    : actualStockQuantity <= 0;
  const stockStatusMessage =
    stockInfo?.stockStatusMessage ||
    (isOutOfStock ? 'Hết hàng' : `Còn hàng (${actualStockQuantity} sản phẩm có sẵn)`);
  const maxOrderQuantity = isSale
    ? Math.max(1, Math.min(2, actualStockQuantity || 1))
    : Math.max(1, actualStockQuantity || 1);

  const sold = Number(product.sold ?? 15);
  const totalStock = Math.max(actualStockQuantity + sold, 1);
  const remainingStock = actualStockQuantity;
  const progressPercent = Math.min(100, Math.round((sold / totalStock) * 100));

  // Gallery images demo
  const galleryImages = [
    product.imageUrl,
    'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=800&q=80'
  ];

  const handleAddToCart = () => {
    if (isAdmin) {
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Khóa tài khoản',
          message: 'Tài khoản Quản trị viên (Admin) không được phép mua hàng.'
        });
      }
      return;
    }

    if (isOutOfStock || quantity > actualStockQuantity) {
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Không đủ tồn kho',
          message: isOutOfStock
            ? 'Sản phẩm hiện đã hết hàng.'
            : `Kho chỉ còn ${actualStockQuantity} sản phẩm.`
        });
      }
      return;
    }

    const payload = {
      ...product,
      price: currentSalePrice,
      originalPrice: currentOriginalPrice,
      salePrice: isSale ? currentSalePrice : null,
      selectedColor: product.colors ? product.colors[selectedColor] : null,
      selectedStorage: storageOption ? storageOption.size : null
    };

    const success = addToCart(payload, quantity);
    if (success) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1500);
    }
  };

  const handleBuyNow = () => {
    if (isAdmin) {
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Khóa tài khoản',
          message: 'Tài khoản Quản trị viên (Admin) không được phép mua hàng.'
        });
      }
      return;
    }

    if (isOutOfStock || quantity > actualStockQuantity) {
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Không đủ tồn kho',
          message: isOutOfStock
            ? 'Sản phẩm hiện đã hết hàng.'
            : `Kho chỉ còn ${actualStockQuantity} sản phẩm.`
        });
      }
      return;
    }

    const payload = {
      ...product,
      price: currentSalePrice,
      originalPrice: currentOriginalPrice,
      salePrice: isSale ? currentSalePrice : null,
      selectedColor: product.colors ? product.colors[selectedColor] : null,
      selectedStorage: storageOption ? storageOption.size : null
    };

    addToCart(payload, quantity);
    navigate('/cart');
  };

  const handleToggleWishlist = () => {
    const next = saleService.toggleWishlist(product.id);
    setIsWishlisted(next);
    if (showToast) {
      showToast({
        type: next ? 'success' : 'info',
        title: next ? 'Đã thích sản phẩm' : 'Đã bỏ yêu thích',
        message: next ? `${product.shortName || product.name} đã được thêm vào mục yêu thích.` : 'Đã xóa khỏi mục yêu thích.'
      });
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '3.5rem' }}>
      {/* 1. BREADCRUMBS & FLASH SALE ACTIVE PILL */}
      <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #f1f5f9', padding: '0.85rem 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
            <Link to="/" style={{ color: '#64748b' }}>Trang chủ</Link>
            <span>›</span>
            <Link to="/products" style={{ color: '#64748b' }}>{product.category || 'Sản phẩm'}</Link>
            <span>›</span>
            <span style={{ color: '#0f172a', fontWeight: 600 }}>{product.shortName || product.name}</span>
          </div>

          {isSale && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.04em'
              }}
            >
              <span>⚡</span>
              <span>ĐANG DIỄN RA FLASH SALE</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN PRODUCT DETAIL CONTENT */}
      <div className="container" style={{ paddingTop: '2rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.25fr',
            gap: '2.5rem',
            alignItems: 'start'
          }}
          className="grid-cols-2"
        >
          {/* LEFT: PRODUCT IMAGE & GALLERY */}
          <div>
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                padding: '1.5rem',
                position: 'relative',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
              }}
            >
              {/* Badges on Image */}
              <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 3, display: 'flex', gap: '0.5rem' }}>
                {isSale && (
                  <span
                    style={{
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)'
                    }}
                  >
                    ⚡ FLASH SALE CHÍNH HÃNG
                  </span>
                )}
                <span
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    border: '1px solid #dbeafe'
                  }}
                >
                  VNA Phân phối
                </span>
              </div>

              {/* Wishlist Button */}
              <button
                onClick={handleToggleWishlist}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  zIndex: 3,
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  border: isWishlisted ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: isWishlisted ? '#dc2626' : '#94a3b8'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isWishlisted ? '#dc2626' : 'none'} stroke={isWishlisted ? '#dc2626' : 'currentColor'} strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>

              {/* Main Image */}
              <div
                style={{
                  height: '380px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc'
                }}
              >
                <img
                  src={galleryImages[selectedImage]}
                  alt={product.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    transition: 'transform 0.3s ease'
                  }}
                />
              </div>

              {/* Thumbnails Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.65rem', marginTop: '1rem' }}>
                {galleryImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    style={{
                      height: '64px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: selectedImage === idx ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
                {/* 360 icon button as in Image 2 */}
                <div
                  style={{
                    height: '64px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    color: '#64748b',
                    fontWeight: 600
                  }}
                  onClick={() => alert('Chế độ xem 360° tương tác mô phỏng')}
                >
                  <span style={{ fontSize: '1.25rem' }}>🔄</span>
                  <span>Video 360°</span>
                </div>
              </div>

              {/* 3 Value badges under image */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid #f1f5f9'
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>🛡️</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>100% Chính Hãng</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Apple VN (VNA)</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>🔄</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>1 Đổi 1 - 30 Ngày</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Lỗi phần cứng</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>🚚</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>Freeship Tốc Độ</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Giao 2H nội thành</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: PRODUCT INFO & FLASH SALE CONTROLS */}
          <div>
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                padding: '2rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
              }}
            >
              {/* Brand & SKU Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    textTransform: 'uppercase'
                  }}
                >
                  THƯƠNG HIỆU: {product.storeName ? product.storeName.toUpperCase() : 'APPLE STORE FLAGSHIP'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  MÃ SP: {product.sku || 'MBP14-M3P-18-512'}
                </span>
              </div>

              {/* Title */}
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3, marginBottom: '0.65rem' }}>
                {product.name}
              </h1>

              {/* Rating & Sold count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#eab308', fontWeight: 700 }}>
                  <span>★</span>
                  <span>{product.rating || 4.9}</span>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>({product.reviewCount || 128} đánh giá thực tế)</span>
                </div>
                <span>•</span>
                <div style={{ color: '#dc2626', fontWeight: 600 }}>
                  🔥 Đã bán {sold} chiếc trong đợt sale
                </div>
                <span>•</span>
                <button
                  onClick={() => alert('Đã sao chép liên kết sản phẩm!')}
                  style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  🔗 Chia sẻ
                </button>
              </div>

              {/* FLASH SALE COUNTDOWN BANNER (NHƯ TRONG ẢNH MẪU 2) */}
              {isSale && (
                <div
                  style={{
                    background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 60%, #991b1b 100%)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.25rem',
                    color: '#ffffff',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.9 }}>
                      ĐỢT GIẢM GIÁ GIỜ VÀNG ĐẶC BIỆT
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>⚡</span>
                      <span>FLASH SALE GIẢM {currentDiscount}%</span>
                    </div>
                  </div>

                  <FlashCountdown targetEndTime={product.saleEndTime} variant="detail" />
                </div>
              )}

              {/* PRICE BOX */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.85rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '2.25rem', fontWeight: 900, color: '#dc2626', lineHeight: 1 }}>
                    {formatCurrency(currentSalePrice)}
                  </span>
                  {currentOriginalPrice > currentSalePrice && (
                    <>
                      <span style={{ fontSize: '1.1rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                        {formatCurrency(currentOriginalPrice)}
                      </span>
                      <span
                        style={{
                          backgroundColor: '#dc2626',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        -{currentDiscount}%
                      </span>
                    </>
                  )}
                </div>

                {isSale && savedAmount > 0 && (
                  <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#dc2626',
                        backgroundColor: '#fee2e2',
                        padding: '4px 10px',
                        borderRadius: '6px'
                      }}
                    >
                      <span>🎁</span>
                      <span>Tiết kiệm ngay: {formatCurrency(savedAmount)}</span>
                      <span style={{ fontWeight: 400, opacity: 0.85 }}>(Áp dụng độc quyền trực tuyến đến hết khung giờ)</span>
                    </div>

                    <div style={{ fontSize: '0.775rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>🏷️</span>
                      <span>So sánh giá thường ngày: 42.990.000 đ</span>
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>(Rẻ hơn thường lệ 10.500.000 đ)</span>
                    </div>
                  </div>
                )}

                {/* Stock progress in detail page */}
                {isSale && (
                  <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: '#475569', fontWeight: 600 }}>
                        🔥 Đã bán {sold}/{totalStock} suất
                      </span>
                      <span style={{ color: '#dc2626', fontWeight: 800 }}>
                        {isOutOfStock ? 'ĐÃ HẾT SUẤT FLASH SALE!' : `CHỈ CÒN LẠI ${remainingStock} SUẤT CUỐI CÙNG!`}
                      </span>
                    </div>
                    <div style={{ height: '7px', backgroundColor: '#fee2e2', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${progressPercent}%`,
                          background: 'linear-gradient(90deg, #f97316 0%, #ef4444 100%)',
                          borderRadius: '9999px'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* QUICK SPECS IF TECH PRODUCT */}
              {product.specs && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.65rem' }}>
                    Cấu hình chi tiết nhanh:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
                    {Object.entries(product.specs).map(([key, val]) => (
                      <div
                        key={key}
                        style={{
                          backgroundColor: '#f8fafc',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'capitalize' }}>{key}</div>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* COLOR SELECTOR */}
              {product.colors && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600 }}>
                      Màu sắc: <strong>{product.colors[selectedColor]}</strong>
                    </span>
                    <span style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>Chỉ còn 9 máy màu Đen</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.65rem' }}>
                    {product.colors.map((color, idx) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(idx)}
                        style={{
                          padding: '0.55rem 1rem',
                          borderRadius: '8px',
                          border: selectedColor === idx ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          backgroundColor: selectedColor === idx ? '#eff6ff' : '#ffffff',
                          color: selectedColor === idx ? '#1d4ed8' : '#334155',
                          fontWeight: selectedColor === idx ? 700 : 500,
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STORAGE OPTIONS */}
              {product.storageOptions && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600 }}>Dung lượng ổ cứng:</span>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Chọn nâng cấp theo nhu cầu</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                    {product.storageOptions.map((opt, idx) => (
                      <div
                        key={opt.size}
                        onClick={() => setSelectedStorage(idx)}
                        style={{
                          padding: '0.65rem',
                          borderRadius: '10px',
                          border: selectedStorage === idx ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          backgroundColor: selectedStorage === idx ? '#eff6ff' : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{opt.size}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626', marginTop: '2px' }}>
                          {formatCurrency(opt.price)}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                          {formatCurrency(opt.originalPrice)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QUANTITY SELECTOR WITH STOCK STATUS & FLASH SALE RESTRICTION NOTICE */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.65rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    backgroundColor: isOutOfStock ? '#fef2f2' : '#f0fdf4',
                    border: isOutOfStock ? '1px solid #fecaca' : '1px solid #bbf7d0'
                  }}
                >
                  <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155' }}>
                    Tình trạng kho:
                  </span>
                  <span
                    data-testid="product-stock-status"
                    style={{
                      fontSize: '0.825rem',
                      fontWeight: 800,
                      color: isOutOfStock ? '#dc2626' : '#16a34a'
                    }}
                  >
                    {isOutOfStock ? '🔴 Hết hàng (0 sản phẩm)' : `🟢 ${stockStatusMessage}`}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Số lượng:</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={isOutOfStock || quantity <= 1}
                      style={{ width: '32px', height: '32px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: isOutOfStock ? 'not-allowed' : 'pointer', fontWeight: 700 }}
                    >
                      -
                    </button>
                    <span style={{ minWidth: '36px', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem' }}>{isOutOfStock ? 0 : quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(maxOrderQuantity, q + 1))}
                      disabled={isOutOfStock || quantity >= maxOrderQuantity}
                      style={{ width: '32px', height: '32px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: isOutOfStock || quantity >= maxOrderQuantity ? 'not-allowed' : 'pointer', fontWeight: 700 }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {isSale && (
                  <div style={{ fontSize: '0.75rem', color: '#ea580c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>⚠️</span>
                    <span>Tối đa 2 sản phẩm/khách hàng theo quy định Flash Sale</span>
                  </div>
                )}
              </div>

              {/* ADMIN RESTRICTION WARNING */}
              {isAdmin && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '10px',
                    color: '#92400e',
                    fontSize: '0.85rem',
                    marginBottom: '1.25rem'
                  }}
                >
                  🛡️ <strong>Tài khoản Quản trị viên (Admin):</strong> Bạn đang ở chế độ xem trước, không thể mua hàng.
                </div>
              )}

              {/* ACTION BUTTONS (MUA NGAY & THÊM VÀO GIỎ) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <button
                  onClick={handleAddToCart}
                  disabled={isAdmin || isOutOfStock}
                  style={{
                    backgroundColor: isOutOfStock ? '#f1f5f9' : isAdded ? '#dcfce7' : '#ffffff',
                    border: isOutOfStock ? '1.5px solid #cbd5e1' : isAdded ? '1.5px solid #16a34a' : '1.5px solid #dc2626',
                    color: isOutOfStock ? '#94a3b8' : isAdded ? '#16a34a' : '#dc2626',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    fontWeight: 700,
                    fontSize: '0.925rem',
                    cursor: isAdmin || isOutOfStock ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>🛒</span>
                  <span>{isOutOfStock ? 'Tạm hết hàng' : isAdded ? '✓ Đã thêm vào giỏ' : 'Thêm vào giỏ'}</span>
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={isAdmin || isOutOfStock}
                  style={{
                    backgroundColor: isOutOfStock ? '#94a3b8' : '#dc2626',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: isAdmin || isOutOfStock ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    boxShadow: isOutOfStock ? 'none' : '0 4px 14px rgba(220, 38, 38, 0.4)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isAdmin && !isOutOfStock) e.currentTarget.style.backgroundColor = '#b91c1c';
                  }}
                  onMouseLeave={(e) => {
                    if (!isAdmin && !isOutOfStock) e.currentTarget.style.backgroundColor = '#dc2626';
                  }}
                >
                  <span>⚡</span>
                  <span>{isOutOfStock ? 'SẢN PHẨM ĐÃ HẾT HÀNG' : 'MUA NGAY VỚI GIÁ FLASH SALE'}</span>
                </button>
              </div>

              {/* TRUST BADGES ROW */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                  padding: '1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.75rem',
                  color: '#475569'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: '#2563eb', fontWeight: 800 }}>✓</span>
                  <span>Bảo hành 24 tháng</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: '#2563eb', fontWeight: 800 }}>✓</span>
                  <span>1 đổi 1 trong 30 ngày</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: '#2563eb', fontWeight: 800 }}>✓</span>
                  <span>Freeship toàn quốc</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. THREE FEATURE CARDS AT BOTTOM (NHƯ TRONG ẢNH MẪU 2) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.25rem',
            marginTop: '2.5rem'
          }}
          className="grid-cols-3"
        >
          {/* Card 1: Đặc quyền Deal Flash Sale */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#dc2626' }}>
              <span style={{ fontSize: '1.25rem' }}>⚡</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Đặc quyền Deal Flash Sale
              </h3>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1rem' }}>
              Chương trình trợ giá độc quyền từ đối tác Apple Việt Nam cho 100 khách hàng nhanh nhất trong ngày. Giá flash sale sẽ lập tức trở về mức niêm yết khi hết 15 suất còn lại hoặc khi đồng hồ đếm ngược kết thúc.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: '#0f172a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ color: '#16a34a' }}>✓</span>
                <span>Hàng mới nguyên seal (Unopened / Chưa Active)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ color: '#16a34a' }}>✓</span>
                <span>Kích hoạt đủ 12 tháng AppleCare chính hãng</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ color: '#16a34a' }}>✓</span>
                <span>Hỗ trợ trả góp 0% lãi suất qua thẻ tín dụng</span>
              </div>
            </div>
          </div>

          {/* Card 2: Hộp sản phẩm bao gồm */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#2563eb' }}>
              <span style={{ fontSize: '1.25rem' }}>📦</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Hộp sản phẩm bao gồm
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '2px' }}>💻</div>
                <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#0f172a' }}>MacBook Pro 14 M3 Pro</div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '2px' }}>🔌</div>
                <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#0f172a' }}>Cáp MagSafe 3</div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '2px' }}>⚡</div>
                <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#0f172a' }}>Củ sạc USB-C 70W / 96W</div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '2px' }}>📖</div>
                <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#0f172a' }}>Sách hướng dẫn sử dụng</div>
              </div>
            </div>
          </div>

          {/* Card 3: Cần tư vấn đặt giữ chỗ? */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#ea580c' }}>
              <span style={{ fontSize: '1.25rem' }}>📞</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Cần tư vấn đặt giữ chỗ?
              </h3>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Đội ngũ chuyên viên tư vấn ShopMart Apple Specialist sẵn sàng giải đáp kỹ thuật, hướng dẫn đặt cọc giữ suất và nhận máy tại cửa hàng gần nhất.
            </p>
            <div
              style={{
                backgroundColor: '#fff7ed',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                border: '1px solid #fed7aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '0.675rem', color: '#9a3412', textTransform: 'uppercase', fontWeight: 700 }}>
                  HOTLINE TRỰC TIẾP
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c2410c' }}>
                  1900 8888 (Nhánh 1)
                </div>
              </div>
              <button
                onClick={() => alert('Đang kết nối tới tổng đài viên ShopMart: 1900 8888')}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Gọi ngay
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
