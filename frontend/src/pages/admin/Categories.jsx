import { useState, useMemo, useEffect, useCallback } from 'react';
import categoryService from '../../services/categoryService';
import useToast from '../../hooks/useToast';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/admin/Pagination';

const Categories = () => {
  const { showToast } = useToast();

  // State danh sách và loading
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE
  const [productCountFilter, setProductCountFilter] = useState('ALL'); // ALL, HAS_PRODUCTS, EMPTY
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name_asc, name_desc, count_desc, count_asc

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected category for detail/edit/delete
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Form states for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    description: '',
    status: 'ACTIVE'
  });
  const [formErrors, setFormErrors] = useState({});

  // 1. Tải danh mục từ Service
  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await categoryService.getAll();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lỗi',
        message: 'Không thể tải danh sách danh mục: ' + err.message
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 2. Thống kê Metrics cho 4 thẻ Header
  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.status === 'ACTIVE').length;
    const inactive = categories.filter((c) => c.status === 'INACTIVE').length;
    const totalProducts = categories.reduce((sum, c) => sum + (Number(c.productCount) || 0), 0);
    return { total, active, inactive, totalProducts };
  }, [categories]);

  // 3. Lọc và Sắp xếp danh mục
  const filteredCategories = useMemo(() => {
    return categories
      .filter((cat) => {
        const term = searchTerm.toLowerCase().trim();
        const matchSearch =
          cat.name.toLowerCase().includes(term) ||
          cat.id.toLowerCase().includes(term) ||
          (cat.description && cat.description.toLowerCase().includes(term));

        const matchStatus =
          statusFilter === 'ALL'
            ? true
            : statusFilter === 'ACTIVE'
            ? cat.status === 'ACTIVE'
            : cat.status === 'INACTIVE';

        let matchCount = true;
        if (productCountFilter === 'HAS_PRODUCTS') {
          matchCount = (cat.productCount || 0) > 0;
        } else if (productCountFilter === 'EMPTY') {
          matchCount = (cat.productCount || 0) === 0;
        }

        return matchSearch && matchStatus && matchCount;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        }
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'vi');
        if (sortBy === 'name_desc') return b.name.localeCompare(a.name, 'vi');
        if (sortBy === 'count_desc') return (b.productCount || 0) - (a.productCount || 0);
        if (sortBy === 'count_asc') return (a.productCount || 0) - (b.productCount || 0);
        return 0;
      });
  }, [categories, searchTerm, statusFilter, productCountFilter, sortBy]);

  // 4. Phân trang dữ liệu
  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCategories.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCategories, currentPage, itemsPerPage]);

  // Tự động reset trang về 1 khi người dùng đổi từ khóa tìm kiếm hoặc bộ lọc
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleProductCountFilterChange = (e) => {
    setProductCountFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setProductCountFilter('ALL');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setItemsPerPage(newSize);
    setCurrentPage(1);
  };

  // 5. Validation form
  const validateForm = (isEdit = false, currentId = null) => {
    const errors = {};
    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      errors.name = 'Tên danh mục không được để trống.';
    } else {
      // Kiểm tra trùng tên (không phân biệt hoa thường)
      const isDuplicate = categories.some((c) => {
        if (isEdit && String(c.id).toLowerCase() === String(currentId).toLowerCase()) {
          return false;
        }
        return c.name.trim().toLowerCase() === trimmedName.toLowerCase();
      });

      if (isDuplicate) {
        errors.name = `Tên danh mục "${trimmedName}" đã tồn tại trong hệ thống.`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 6. Xử lý Thêm danh mục
  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=400&q=80',
      description: '',
      status: 'ACTIVE'
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    if (!validateForm(false)) return;

    try {
      await categoryService.create(formData);
      await loadCategories();
      setIsAddModalOpen(false);
      setCurrentPage(1);
      showToast({
        type: 'success',
        title: 'Thành công',
        message: 'Thêm danh mục thành công'
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể thêm danh mục'
      });
    }
  };

  // 7. Xử lý Xem chi tiết
  const handleOpenDetailModal = (category) => {
    setSelectedCategory(category);
    setIsDetailModalOpen(true);
  };

  // 8. Xử lý Sửa danh mục
  const handleOpenEditModal = (category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name || '',
      image: category.image || '',
      description: category.description || '',
      status: category.status || 'ACTIVE'
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!selectedCategory) return;
    if (!validateForm(true, selectedCategory.id)) return;

    try {
      await categoryService.update(selectedCategory.id, formData);
      await loadCategories();
      setIsEditModalOpen(false);
      showToast({
        type: 'success',
        title: 'Thành công',
        message: 'Đã cập nhật danh mục thành công'
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể cập nhật danh mục'
      });
    }
  };

  // 9. Xử lý Xóa danh mục
  const handleOpenDeleteModal = (category) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCategory) return;
    try {
      await categoryService.delete(selectedCategory.id);
      await loadCategories();
      setIsDeleteModalOpen(false);

      // Nếu trang hiện tại không còn dữ liệu sau khi xóa, lùi về trang trước
      if (paginatedCategories.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }

      showToast({
        type: 'success',
        title: 'Thành công',
        message: 'Đã xóa danh mục thành công'
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Lỗi',
        message: err.message || 'Không thể xóa danh mục'
      });
    }
  };

  // Định dạng ngày hiển thị DD/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '---';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="admin-categories-page">
      {/* 1. HEADER TRANG */}
      <div
        className="flex-between"
        style={{
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'flex-start'
        }}
      >
        <div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
            Quản lý danh mục
          </h1>
          <p className="page-subtitle" style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Quản lý các danh mục sản phẩm trong hệ thống
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Button
            variant="primary"
            onClick={handleOpenAddModal}
            style={{
              padding: '0.65rem 1.35rem',
              fontWeight: 700,
              fontSize: '0.925rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span> Thêm danh mục
          </Button>
        </div>
      </div>

      {/* 2. THỐNG KÊ (STATS CARDS) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem'
        }}
      >
        {/* Thẻ 1: Tổng danh mục */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              flexShrink: 0
            }}
          >
            🏷️
          </div>
          <div>
            <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>Tổng danh mục</span>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {stats.total}
            </div>
          </div>
        </div>

        {/* Thẻ 2: Đang hoạt động */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #16a34a',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              flexShrink: 0
            }}
          >
            ✓
          </div>
          <div>
            <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>Đang hoạt động</span>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#16a34a', lineHeight: 1.2 }}>
              {stats.active}
            </div>
          </div>
        </div>

        {/* Thẻ 3: Đang ẩn */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              flexShrink: 0
            }}
          >
            👁️‍🗨️
          </div>
          <div>
            <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>Đang ẩn</span>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#64748b', lineHeight: 1.2 }}>
              {stats.inactive}
            </div>
          </div>
        </div>

        {/* Thẻ 4: Tổng số sản phẩm */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #3b82f6',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              flexShrink: 0
            }}
          >
            📦
          </div>
          <div>
            <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>Tổng sản phẩm</span>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#2563eb', lineHeight: 1.2 }}>
              {stats.totalProducts.toLocaleString('vi-VN')}
            </div>
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTER TOOLBAR */}
      <div
        className="card"
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          borderRadius: '14px'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.85rem'
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                fontSize: '0.95rem'
              }}
            >
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Tìm kiếm danh mục theo ID, tên hoặc mô tả..."
              style={{
                width: '100%',
                padding: '0.65rem 2.2rem 0.65rem 2.3rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                backgroundColor: '#ffffff',
                transition: 'border-color 0.15s ease'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '50%'
                }}
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Trạng thái */}
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">🟢 Đang hoạt động</option>
            <option value="INACTIVE">⚪ Đang ẩn</option>
          </select>

          {/* Filter Số lượng sản phẩm */}
          <select
            value={productCountFilter}
            onChange={handleProductCountFilterChange}
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Tất cả số lượng SP</option>
            <option value="HAS_PRODUCTS">Có sản phẩm (&gt; 0)</option>
            <option value="EMPTY">Chưa có sản phẩm (= 0)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={handleSortChange}
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="newest">Ngày tạo: Mới nhất</option>
            <option value="oldest">Ngày tạo: Cũ nhất</option>
            <option value="name_asc">Tên danh mục: A - Z</option>
            <option value="name_desc">Tên danh mục: Z - A</option>
            <option value="count_desc">Số sản phẩm: Nhiều nhất</option>
            <option value="count_asc">Số sản phẩm: Ít nhất</option>
          </select>
        </div>

        {/* Toolbar Footer: Đếm số lượng & Reset bộ lọc */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid #f1f5f9'
          }}
        >
          <span style={{ color: '#64748b' }}>
            Tìm thấy <strong style={{ color: '#0f172a' }}>{filteredCategories.length}</strong> /{' '}
            {categories.length} danh mục
          </span>

          {(searchTerm || statusFilter !== 'ALL' || productCountFilter !== 'ALL' || sortBy !== 'newest') && (
            <button
              type="button"
              onClick={handleResetFilter}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>🔄</span> Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* 4. CATEGORIES DATA TABLE & MOBILE CARDS */}
      <div
        className="card"
        style={{
          padding: 0,
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)'
        }}
      >
        {loading ? (
          /* SKELETON LOADING STATE */
          <div style={{ padding: '2rem' }}>
            <div style={{ textAlign: 'center', color: '#64748b', marginBottom: '1rem', fontWeight: 600 }}>
              Đang tải danh mục...
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  height: '52px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '8px',
                  marginBottom: '0.65rem',
                  animation: 'pulse 1.5s infinite ease-in-out'
                }}
              />
            ))}
          </div>
        ) : categories.length === 0 ? (
          /* EMPTY STATE 1: CHƯA CÓ DANH MỤC NÀO */
          <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📁</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem' }}>
              Chưa có danh mục nào
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Bắt đầu tạo danh mục đầu tiên để tổ chức và phân loại các sản phẩm trong gian hàng.
            </p>
            <Button variant="primary" onClick={handleOpenAddModal}>
              + Thêm danh mục mới
            </Button>
          </div>
        ) : filteredCategories.length === 0 ? (
          /* EMPTY STATE 2: TÌM KIẾM / LỌC KHÔNG CÓ KẾT QUẢ */
          <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏷️</div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem' }}>
              Không tìm thấy danh mục phù hợp
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Thử thay đổi từ khóa tìm kiếm hoặc các tiêu chí bộ lọc.
            </p>
            <Button variant="secondary" size="sm" onClick={handleResetFilter}>
              🔄 Xóa bộ lọc & Hiển thị tất cả
            </Button>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE VIEW */}
            <div className="table-responsive categories-desktop-table">
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ width: '90px' }}>ID</th>
                    <th style={{ minWidth: '180px' }}>Tên danh mục</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Hình ảnh</th>
                    <th style={{ minWidth: '220px' }}>Mô tả</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Số sản phẩm</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Ngày tạo</th>
                    <th style={{ width: '190px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCategories.map((cat) => (
                    <tr key={cat.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* Cột 1: ID */}
                      <td>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '6px'
                          }}
                        >
                          {cat.id}
                        </span>
                      </td>

                      {/* Cột 2: Tên danh mục */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.925rem' }}>
                          {cat.name}
                        </div>
                      </td>

                      {/* Cột 3: Hình ảnh */}
                      <td style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            backgroundColor: '#f1f5f9',
                            display: 'inline-block',
                            border: '1px solid #e2e8f0',
                            verticalAlign: 'middle'
                          }}
                        >
                          <img
                            src={cat.image || 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=120&q=80'}
                            alt={cat.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.src =
                                'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=120&q=80';
                            }}
                          />
                        </div>
                      </td>

                      {/* Cột 4: Mô tả */}
                      <td>
                        <p
                          style={{
                            margin: 0,
                            color: '#64748b',
                            fontSize: '0.85rem',
                            lineHeight: 1.45,
                            maxWidth: '320px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={cat.description}
                        >
                          {cat.description || 'Chưa có mô tả'}
                        </p>
                      </td>

                      {/* Cột 5: Số sản phẩm */}
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={`badge ${cat.productCount > 0 ? 'badge-primary' : 'badge-secondary'}`}
                          style={{ fontWeight: 700 }}
                        >
                          {cat.productCount} SP
                        </span>
                      </td>

                      {/* Cột 6: Trạng thái */}
                      <td style={{ textAlign: 'center' }}>
                        {cat.status === 'ACTIVE' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '9999px',
                              backgroundColor: '#dcfce7',
                              color: '#166534',
                              fontSize: '0.775rem',
                              fontWeight: 700
                            }}
                          >
                            <span style={{ fontSize: '0.55rem' }}>●</span> Đang hoạt động
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '9999px',
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              fontSize: '0.775rem',
                              fontWeight: 600
                            }}
                          >
                            <span style={{ fontSize: '0.55rem' }}>○</span> Đang ẩn
                          </span>
                        )}
                      </td>

                      {/* Cột 7: Ngày tạo */}
                      <td style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                        {formatDate(cat.createdAt)}
                      </td>

                      {/* Cột 8: Thao tác (Xem / Sửa / Xóa) */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(cat)}
                            style={{
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="Xem chi tiết"
                          >
                            Xem
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(cat)}
                            style={{
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid #bfdbfe',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="Chỉnh sửa danh mục"
                          >
                            Sửa
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(cat)}
                            style={{
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="Xóa danh mục"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD VIEW (Chỉ hiển thị trên Mobile screens) */}
            <div
              className="categories-mobile-card-list"
              style={{
                display: 'none',
                padding: '1rem',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              {paginatedCategories.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <img
                        src={cat.image || 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=120&q=80'}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px'
                          }}
                        >
                          {cat.id}
                        </span>
                        {cat.status === 'ACTIVE' ? (
                          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                            ● Đang hoạt động
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                            ○ Đang ẩn
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{cat.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 600, marginTop: '0.15rem' }}>
                        {cat.productCount} sản phẩm
                      </div>
                    </div>
                  </div>

                  {cat.description && (
                    <p style={{ margin: 0, fontSize: '0.825rem', color: '#64748b', lineHeight: 1.4 }}>
                      {cat.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Ngày tạo: {formatDate(cat.createdAt)}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenDetailModal(cat)}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        Xem
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(cat)}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          border: '1px solid #bfdbfe',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(cat)}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          border: '1px solid #fecaca',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 5. PHÂN TRANG (REUSABLE PAGINATION COMPONENT) */}
            <Pagination
              currentPage={currentPage}
              totalItems={filteredCategories.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={handlePageSizeChange}
              itemsPerPageOptions={[5, 10, 20, 50]}
              unitName="danh mục"
            />
          </>
        )}
      </div>

      {/* =========================================
          MODAL 1: THÊM DANH MỤC MỚI
         ========================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm danh mục mới"
      >
        <form onSubmit={handleSubmitAdd}>
          {/* Tên danh mục * */}
          <div style={{ marginBottom: '1rem' }}>
            <Input
              label="Tên danh mục"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
              }}
              required
              placeholder="Ví dụ: Thiết bị nhà thông minh"
              error={formErrors.name}
            />
          </div>

          {/* Hình ảnh */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#334155'
              }}
            >
              Hình ảnh danh mục (URL)
            </label>
            <input
              type="text"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '0.9rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            />
            {formData.image && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.5rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc'
                  }}
                >
                  <img
                    src={formData.image}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Xem trước ảnh danh mục</span>
              </div>
            )}
          </div>

          {/* Mô tả */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#334155'
              }}
            >
              Mô tả ngắn
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Mô tả tóm tắt về danh mục sản phẩm này..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '0.9rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontFamily: 'inherit',
                backgroundColor: '#ffffff',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Trạng thái */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#334155'
              }}
            >
              Trạng thái hiển thị
            </label>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="radio"
                  name="add_status"
                  value="ACTIVE"
                  checked={formData.status === 'ACTIVE'}
                  onChange={() => setFormData({ ...formData, status: 'ACTIVE' })}
                />
                <span style={{ color: '#16a34a', fontWeight: 600 }}>🟢 Đang hoạt động</span>
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="radio"
                  name="add_status"
                  value="INACTIVE"
                  checked={formData.status === 'INACTIVE'}
                  onChange={() => setFormData({ ...formData, status: 'INACTIVE' })}
                />
                <span style={{ color: '#64748b', fontWeight: 600 }}>⚪ Đang ẩn</span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary">
              Thêm danh mục
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================================
          MODAL 2: CHỈNH SỬA DANH MỤC
         ========================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={selectedCategory ? `Chỉnh sửa danh mục: ${selectedCategory.id}` : 'Chỉnh sửa danh mục'}
      >
        <form onSubmit={handleSubmitEdit}>
          {/* Tên danh mục * */}
          <div style={{ marginBottom: '1rem' }}>
            <Input
              label="Tên danh mục"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
              }}
              required
              placeholder="Nhập tên danh mục..."
              error={formErrors.name}
            />
          </div>

          {/* Hình ảnh */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#334155'
              }}
            >
              Hình ảnh danh mục (URL)
            </label>
            <input
              type="text"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '0.9rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            />
            {formData.image && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.5rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc'
                  }}
                >
                  <img
                    src={formData.image}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Xem trước ảnh danh mục</span>
              </div>
            )}
          </div>

          {/* Mô tả */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#334155'
              }}
            >
              Mô tả ngắn
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Mô tả tóm tắt về danh mục..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '0.9rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontFamily: 'inherit',
                backgroundColor: '#ffffff',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Trạng thái */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#334155'
              }}
            >
              Trạng thái hiển thị
            </label>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="radio"
                  name="edit_status"
                  value="ACTIVE"
                  checked={formData.status === 'ACTIVE'}
                  onChange={() => setFormData({ ...formData, status: 'ACTIVE' })}
                />
                <span style={{ color: '#16a34a', fontWeight: 600 }}>🟢 Đang hoạt động</span>
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input
                  type="radio"
                  name="edit_status"
                  value="INACTIVE"
                  checked={formData.status === 'INACTIVE'}
                  onChange={() => setFormData({ ...formData, status: 'INACTIVE' })}
                />
                <span style={{ color: '#64748b', fontWeight: 600 }}>⚪ Đang ẩn</span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary">
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================================
          MODAL 3: XEM CHI TIẾT DANH MỤC
         ========================================= */}
      {selectedCategory && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Chi tiết danh mục: ${selectedCategory.name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                height: '160px',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0'
              }}
            >
              <img
                src={selectedCategory.image || 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80'}
                alt={selectedCategory.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem'
                  }}
                >
                  {selectedCategory.id}
                </span>

                {selectedCategory.status === 'ACTIVE' ? (
                  <span className="badge badge-success">🟢 Đang hoạt động</span>
                ) : (
                  <span className="badge badge-secondary">⚪ Đang ẩn</span>
                )}
              </div>

              <h2 style={{ margin: '0.25rem 0 0.5rem', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                {selectedCategory.name}
              </h2>

              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {selectedCategory.description || 'Chưa có thông tin mô tả chi tiết cho danh mục này.'}
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
                backgroundColor: '#f8fafc',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Số lượng sản phẩm:</span>
                <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '1.1rem' }}>
                  {selectedCategory.productCount} sản phẩm
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Ngày khởi tạo:</span>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                  {formatDate(selectedCategory.createdAt)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenEditModal(selectedCategory);
                }}
              >
                ✏️ Chỉnh sửa
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================
          MODAL 4: XÁC NHẬN XÓA DANH MỤC
         ========================================= */}
      {selectedCategory && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Xác nhận xóa danh mục"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155' }}>
              Bạn có chắc chắn muốn xóa danh mục{' '}
              <strong style={{ color: '#0f172a' }}>"{selectedCategory.name}"</strong> (mã{' '}
              <strong style={{ color: '#2563eb' }}>#{selectedCategory.id}</strong>) không?
            </p>

            {/* CẢNH BÁO NẾU DANH MỤC ĐANG CÓ SẢN PHẨM */}
            {selectedCategory.productCount > 0 && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem'
                }}
              >
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.875rem' }}>
                    Cảnh báo bảo vệ dữ liệu sản phẩm
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#991b1b', marginTop: '0.2rem' }}>
                    Danh mục này hiện đang chứa <strong>{selectedCategory.productCount}</strong> sản phẩm.
                    Việc xóa danh mục có thể khiến các sản phẩm bị mất liên kết phân loại!
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                Hủy
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete}>
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Categories;
