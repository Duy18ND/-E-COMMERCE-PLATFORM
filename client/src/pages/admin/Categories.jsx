import { useState, useMemo } from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';

const Categories = () => {
  const [categories, setCategories] = useState([
    { id: '1', name: 'Laptop & Workstation', description: 'Các dòng máy tính xách tay văn phòng, gaming, đồ họa', count: 24 },
    { id: '2', name: 'Điện thoại & Tablet', description: 'Điện thoại thông minh Android, iPhone và máy tính bảng', count: 35 },
    { id: '3', name: 'Phụ Kiện & Âm Thanh', description: 'Bàn phím cơ, chuột không dây, tai nghe chống ồn và củ cáp sạc', count: 80 },
    { id: '4', name: 'Nhà Thông Minh & Gia Dụng', description: 'Robot hút bụi, máy lọc không khí và đèn thông minh', count: 18 },
    { id: '5', name: 'Đồng Hồ Thông Minh', description: 'Smartwatch theo dõi sức khỏe và thể thao', count: 0 }
  ]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [countFilter, setCountFilter] = useState('');
  const [sortBy, setSortBy] = useState('');

  // Modal create state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');

  // Filtered & Sorted categories
  const filteredCategories = useMemo(() => {
    return categories
      .filter((cat) => {
        // Search term in name or description
        const matchSearch =
          cat.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
          cat.description.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
          cat.id.toLowerCase().includes(searchTerm.toLowerCase().trim());

        // Count filter
        let matchCount = true;
        if (countFilter === 'HAS_PRODUCTS') {
          matchCount = cat.count > 0;
        } else if (countFilter === 'EMPTY') {
          matchCount = cat.count === 0;
        }

        return matchSearch && matchCount;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
        if (sortBy === 'count_desc') return b.count - a.count;
        if (sortBy === 'count_asc') return a.count - b.count;
        return 0;
      });
  }, [categories, searchTerm, countFilter, sortBy]);

  const handleResetFilter = () => {
    setSearchTerm('');
    setCountFilter('');
    setSortBy('');
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!categoryName) return;

    const newCategory = {
      id: String(Date.now()),
      name: categoryName,
      description: categoryDesc,
      count: 0
    };

    setCategories([...categories, newCategory]);
    setCategoryName('');
    setCategoryDesc('');
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc muốn xóa danh mục này?')) {
      setCategories(categories.filter((c) => c.id !== id));
    }
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Quản lý danh mục</h1>
          <p className="page-subtitle" style={{ margin: '0.25rem 0 0' }}>
            Phân loại và quản lý các danh mục sản phẩm trên hệ thống
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          ➕ Thêm danh mục
        </Button>
      </div>

      {/* SEARCH & FILTER TOOLBAR */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.85rem' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                fontSize: '0.9rem'
              }}
            >
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm danh mục theo tên hoặc mô tả..."
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem 0.6rem 2.2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          {/* Product Count Filter */}
          <select
            value={countFilter}
            onChange={(e) => setCountFilter(e.target.value)}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          >
            <option value="">Tất cả số lượng SP</option>
            <option value="HAS_PRODUCTS">Có sản phẩm (&gt; 0)</option>
            <option value="EMPTY">Chưa có sản phẩm (= 0)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          >
            <option value="">Sắp xếp: Mặc định</option>
            <option value="name_asc">Tên: A - Z</option>
            <option value="name_desc">Tên: Z - A</option>
            <option value="count_desc">Số lượng SP: Nhiều nhất</option>
            <option value="count_asc">Số lượng SP: Ít nhất</option>
          </select>
        </div>

        {/* Filter stats & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ color: '#64748b' }}>
            Hiển thị <strong>{filteredCategories.length}</strong> / {categories.length} danh mục
          </span>
          {(searchTerm || countFilter || sortBy) && (
            <button
              onClick={handleResetFilter}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              🔄 Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* CATEGORIES TABLE */}
      <div className="card" style={{ padding: 0 }}>
        {filteredCategories.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏷️</div>
            <p style={{ fontWeight: 600 }}>Không tìm thấy danh mục nào phù hợp</p>
            <p style={{ fontSize: '0.85rem' }}>Thử nhập từ khóa khác hoặc xóa bộ lọc</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên danh mục</th>
                  <th>Mô tả</th>
                  <th>Số lượng SP</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat) => (
                  <tr key={cat.id}>
                    <td>#{cat.id}</td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{cat.name}</td>
                    <td style={{ color: '#64748b', maxWidth: '350px' }}>{cat.description}</td>
                    <td>
                      <span className="badge badge-primary">{cat.count} sản phẩm</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(cat.id)}>
                        Xóa
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREATE CATEGORY */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Thêm danh mục mới"
      >
        <form onSubmit={handleAddCategory}>
          <Input
            label="Tên danh mục"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            required
            placeholder="Ví dụ: Máy tính bảng"
          />
          <Input
            label="Mô tả"
            value={categoryDesc}
            onChange={(e) => setCategoryDesc(e.target.value)}
            placeholder="Mô tả ngắn gọn về danh mục..."
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary">
              Lưu danh mục
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Categories;
