import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

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
    imageUrl: ''
  });

  useEffect(() => {
    if (isEditMode) {
      // Sẵn sàng kết nối productService.getById(id)
      setFormData({
        name: `Sản phẩm #${id}`,
        category: 'Laptop',
        price: '25000000',
        stock: '15',
        description: 'Mô tả chi tiết sản phẩm mẫu khi ở chế độ chỉnh sửa.',
        imageUrl: ''
      });
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Sẵn sàng kết nối productService.create hoặc productService.update
    console.log(isEditMode ? 'Cập nhật sản phẩm:' : 'Tạo sản phẩm mới:', formData);
    navigate('/admin/products');
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Số lượng tồn kho"
              name="stock"
              type="number"
              required
              value={formData.stock}
              onChange={handleChange}
              placeholder="Ví dụ: 20"
            />

            <Input
              label="Đường dẫn ảnh (URL)"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>

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
