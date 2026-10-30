import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

// ─── Image upload constants ───────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_MB = 5;

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    description: '',
    imageUrl: ''   // keeps existing field name – will hold blob URL or server URL
  });

  // ─── Image upload state ───────────────────────────────────────────────────
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef(null);

  // Simple inline toast replacement (uses browser alert-style via state banner)
  const [toastMsg, setToastMsg] = useState('');
  const showInlineToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  useEffect(() => {
    if (isEditMode) {
      // Sẵn sàng kết nối productService.getById(id)
      const existingImageUrl = '';  // replace with API response.imageUrl when ready
      setFormData({
        name: `Sản phẩm #${id}`,
        category: 'Laptop',
        price: '25000000',
        stock: '15',
        description: 'Mô tả chi tiết sản phẩm mẫu khi ở chế độ chỉnh sửa.',
        imageUrl: existingImageUrl
      });
      setImagePreview(existingImageUrl);
      setImageFile(null);
    }
  }, [id, isEditMode]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ─── Image handlers ───────────────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Vui lòng chọn file hình ảnh JPG, PNG hoặc WEBP.');
      showInlineToast('File không hợp lệ: Vui lòng chọn JPG, PNG hoặc WEBP.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setImageError(`Ảnh vượt quá dung lượng cho phép (tối đa ${MAX_IMAGE_SIZE_MB}MB).`);
      showInlineToast(`File quá lớn: Tối đa ${MAX_IMAGE_SIZE_MB}MB.`);
      e.target.value = '';
      return;
    }

    // Revoke previous blob URL
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    const blobUrl = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(blobUrl);
    setImageError('');
    setFormData((prev) => ({ ...prev, imageUrl: blobUrl }));
    e.target.value = '';
  };

  const handleImageRemove = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview('');
    setImageError('');
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // formData.imageUrl holds blob URL (local preview) or original server URL.
    // When connecting real API: upload imageFile first, then use returned URL.
    console.log(isEditMode ? 'Cập nhật sản phẩm:' : 'Tạo sản phẩm mới:', formData);
    navigate('/admin/products');
  };

  // ─── Styles helpers ───────────────────────────────────────────────────────
  const uploadZoneStyle = {
    width: '100%',
    minHeight: '140px',
    borderRadius: '10px',
    border: '2px dashed #cbd5e1',
    backgroundColor: '#f8fafc',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    color: '#94a3b8',
    fontSize: '0.875rem',
    fontWeight: 500
  };

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/admin/products" style={{ color: '#64748b', fontSize: '0.9rem' }}>
          &larr; Quay lại danh sách sản phẩm
        </Link>
        <h1 className="page-title" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
          {isEditMode ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
        </h1>
      </div>

      {/* Inline toast banner */}
      {toastMsg && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: '0.875rem',
            fontWeight: 500
          }}
        >
          ⚠️ {toastMsg}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <Input
            label="Tên sản phẩm"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="Nhập tên sản phẩm..."
          />

          <div className="form-grid-2">
            <Input
              label="Danh mục"
              name="category"
              required
              value={formData.category}
              onChange={handleChange}
              placeholder="Laptop, Điện thoại..."
            />

            <Input
              label="Đơn giá (VNĐ)"
              name="price"
              type="number"
              required
              value={formData.price}
              onChange={handleChange}
              placeholder="Ví dụ: 15000000"
            />
          </div>

          <div className="form-grid-2">
            <Input
              label="Số lượng tồn kho"
              name="stock"
              type="number"
              required
              value={formData.stock}
              onChange={handleChange}
              placeholder="Ví dụ: 20"
            />
          </div>

          {/* ─── Hình ảnh sản phẩm ─────────────────────────────────────── */}
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '1.25rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#fafafa'
            }}
          >
            <label
              style={{
                display: 'block',
                marginBottom: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#334155'
              }}
            >
              Hình ảnh sản phẩm
            </label>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />

            {imagePreview ? (
              /* Preview state */
              <div>
                <div
                  style={{
                    width: '100%',
                    height: '200px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '2px solid #e2e8f0',
                    backgroundColor: '#f1f5f9',
                    marginBottom: '0.65rem'
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="Preview sản phẩm"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
                  />
                </div>

                {imageFile ? (
                  <p style={{ margin: '0 0 0.65rem', fontSize: '0.8rem', color: '#64748b' }}>
                    📎 {imageFile.name}{' '}
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>(Ảnh mới)</span>
                  </p>
                ) : (
                  <p style={{ margin: '0 0 0.65rem', fontSize: '0.8rem', color: '#64748b' }}>
                    Ảnh hiện tại
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '0.4rem 1rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#334155'
                    }}
                  >
                    🔄 Thay ảnh
                  </button>
                  <button
                    type="button"
                    onClick={handleImageRemove}
                    style={{
                      padding: '0.4rem 1rem',
                      borderRadius: '6px',
                      border: '1px solid #fecaca',
                      backgroundColor: '#fef2f2',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#dc2626'
                    }}
                  >
                    🗑 Xóa ảnh
                  </button>
                </div>
              </div>
            ) : (
              /* Empty state — click to open file picker */
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={uploadZoneStyle}
              >
                <span style={{ fontSize: '2rem' }}>🖼️</span>
                <span>+ Chọn ảnh từ máy tính</span>
                <span style={{ fontSize: '0.75rem', color: '#b0bec5' }}>
                  JPG, PNG, WEBP – Tối đa {MAX_IMAGE_SIZE_MB}MB
                </span>
              </button>
            )}

            {imageError && (
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#dc2626' }}>
                {imageError}
              </p>
            )}
          </div>

          {/* ─── Mô tả ─────────────────────────────────────────────────── */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Mô tả chi tiết
            </label>
            <textarea
              name="description"
              rows="4"
              value={formData.description}
              onChange={handleChange}
              placeholder="Nhập mô tả thông tin sản phẩm..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '1rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <Link to="/admin/products">
              <Button variant="secondary">Hủy bỏ</Button>
            </Link>
            <Button type="submit" variant="primary">
              {isEditMode ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
