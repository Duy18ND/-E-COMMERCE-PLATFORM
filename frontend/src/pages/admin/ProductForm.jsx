import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import useToast from '../../hooks/useToast';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

// ─── Image upload constants ───────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_MB = 5;

export const validateAdminProductForm = (data = {}) => {
  const errors = {};
  const trimmedName = String(data.name ?? '').trim();
  const trimmedCategory = String(data.category ?? '').trim();
  const priceNum = Number(data.price);
  const stockNum = Number(data.stock ?? data.stockQuantity);

  if (!trimmedName) {
    errors.name = 'Tên sản phẩm không được để trống';
  }
  if (!trimmedCategory) {
    errors.category = 'Danh mục sản phẩm không được để trống';
  }
  if (data.price === '' || data.price === null || data.price === undefined || Number.isNaN(priceNum) || priceNum <= 0) {
    errors.price = 'Giá sản phẩm phải lớn hơn 0';
  }
  if (data.stock === '' || data.stock === null || data.stock === undefined || Number.isNaN(stockNum) || stockNum < 0) {
    errors.stock = 'Số lượng tồn kho không được nhỏ hơn 0';
  }

  return errors;
};

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    description: '',
    imageUrl: '' // keeps existing field name – will hold blob URL or server URL
  });
  const [formErrors, setFormErrors] = useState({});
  const [availableCategories, setAvailableCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);

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
    categoryService
      .getAll()
      .then((cats) => {
        if (Array.isArray(cats)) {
          setAvailableCategories(cats);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isEditMode) {
      productService
        .getById(id)
        .then((prod) => {
          if (prod) {
            const existingImageUrl = prod.imageUrl || prod.image || '';
            setFormData({
              name: prod.name || `Sản phẩm #${id}`,
              category: prod.category || 'Laptop & Workstation',
              price: String(prod.price ?? 25000000),
              stock: String(prod.stockQuantity ?? prod.stock ?? 15),
              description: prod.description || 'Mô tả chi tiết sản phẩm.',
              imageUrl: existingImageUrl
            });
            setImagePreview(existingImageUrl);
            setImageFile(null);
          }
        })
        .catch(() => {
          setFormData({
            name: `Sản phẩm #${id}`,
            category: 'Laptop & Workstation',
            price: '25000000',
            stock: '15',
            description: 'Mô tả chi tiết sản phẩm mẫu khi ở chế độ chỉnh sửa.',
            imageUrl: ''
          });
        });
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
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateAdminProductForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      const firstErr = Object.values(validationErrors)[0];
      showInlineToast(firstErr);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        price: Number(formData.price),
        stock: Number(formData.stock),
        stockQuantity: Number(formData.stock),
        description: formData.description.trim(),
        imageUrl: formData.imageUrl
      };

      if (isEditMode) {
        await productService.update(id, payload);
      } else {
        await productService.create(payload);
      }

      if (showToast) {
        showToast({
          type: 'success',
          title: isEditMode ? 'Cập nhật thành công' : 'Tạo sản phẩm thành công',
          message: `Sản phẩm "${payload.name}" đã được lưu.`
        });
      }
      navigate('/admin/products');
    } catch (err) {
      showInlineToast(err.message || 'Không thể lưu thông tin sản phẩm');
    } finally {
      setSubmitting(false);
    }
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
        <form onSubmit={handleSubmit} noValidate>
          <Input
            label="Tên sản phẩm"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            error={formErrors.name}
            placeholder="Nhập tên sản phẩm..."
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <Input
                label="Danh mục"
                name="category"
                list="admin-category-options"
                required
                value={formData.category}
                onChange={handleChange}
                error={formErrors.category}
                placeholder="Laptop, Điện thoại..."
              />
              {availableCategories.length > 0 && (
                <datalist id="admin-category-options">
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              )}
            </div>

            <Input
              label="Đơn giá (VNĐ)"
              name="price"
              type="number"
              min="1"
              required
              value={formData.price}
              onChange={handleChange}
              error={formErrors.price}
              placeholder="Ví dụ: 15000000"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Số lượng tồn kho"
              name="stock"
              type="number"
              min="0"
              required
              value={formData.stock}
              onChange={handleChange}
              error={formErrors.stock}
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
                    onError={(e) => {
                      e.currentTarget.style.opacity = '0.3';
                    }}
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
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : isEditMode ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
