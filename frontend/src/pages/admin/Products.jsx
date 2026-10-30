import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import productService from '../../services/productService';
import useToast from '../../hooks/useToast';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Pagination from '../../components/admin/Pagination';

const INITIAL_MOCK_ADMIN_PRODUCTS = [
  { id: '1', name: 'Laptop Dell XPS 13', category: 'Laptop & Workstation', price: 28990000, stock: 10, stockQuantity: 10 },
  { id: '2', name: 'Điện thoại iPhone 15 Pro', category: 'Điện thoại thông minh', price: 27990000, stock: 15, stockQuantity: 15 },
  { id: '3', name: 'Bàn phím cơ không dây', category: 'Bàn phím cơ & Chuột', price: 1850000, stock: 25, stockQuantity: 25 },
  { id: '4', name: 'Tai nghe Bluetooth chống ồn', category: 'Tai nghe & Âm thanh Hi-Fi', price: 3490000, stock: 8, stockQuantity: 8 },
  { id: '5', name: 'MacBook Air M2 13 inch', category: 'Laptop & Workstation', price: 24500000, stock: 3, stockQuantity: 3 },
  { id: '6', name: 'Điện thoại Samsung Galaxy S24', category: 'Điện thoại thông minh', price: 21990000, stock: 0, stockQuantity: 0 },
  { id: '7', name: 'iPad Pro 11 M2 Wi-Fi 128GB', category: 'Máy tính bảng & iPad', price: 19990000, stock: 12, stockQuantity: 12 },
  { id: '8', name: 'Đồng hồ thông minh Apple Watch Series 9', category: 'Đồng hồ thông minh & Smartwatch', price: 9890000, stock: 18, stockQuantity: 18 },
  { id: '9', name: 'Robot hút bụi Deebot X2 OMNI', category: 'Đồ gia dụng thông minh', price: 18990000, stock: 6, stockQuantity: 6 },
  { id: '10', name: 'Màn hình Dell UltraSharp 27 4K U2723QE', category: 'Màn hình máy tính', price: 13490000, stock: 14, stockQuantity: 14 }
];

const AdminProducts = () => {
  const { showToast } = useToast();
  const [products, setProducts] = useState(INITIAL_MOCK_ADMIN_PRODUCTS);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [sortBy, setSortBy] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productService.getAdminProducts();
      if (Array.isArray(data) && data.length > 0) {
        setProducts(
          data.map((p) => ({
            ...p,
            id: String(p.id),
            stock: Number(p.stockQuantity ?? p.stock ?? 0),
            stockQuantity: Number(p.stockQuantity ?? p.stock ?? 0)
          }))
        );
      }
    } catch {
      // Fallback sang danh sách hiện tại
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Extract unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  }, [products]);

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const q = searchTerm.toLowerCase().trim();
        // Search by name or ID
        const matchSearch =
          String(p.name || '').toLowerCase().includes(q) ||
          String(p.id || '').toLowerCase().includes(q);

        // Filter by category
        const matchCategory = selectedCategory ? p.category === selectedCategory : true;

        // Filter by stock status
        const currentStock = Number(p.stockQuantity ?? p.stock ?? 0);
        let matchStock = true;
        if (stockStatus === 'IN_STOCK') {
          matchStock = currentStock > 5;
        } else if (stockStatus === 'LOW_STOCK') {
          matchStock = currentStock > 0 && currentStock <= 5;
        } else if (stockStatus === 'OUT_OF_STOCK') {
          matchStock = currentStock === 0;
        }

        return matchSearch && matchCategory && matchStock;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'stock_desc') {
          return Number(b.stockQuantity ?? b.stock ?? 0) - Number(a.stockQuantity ?? a.stock ?? 0);
        }
        if (sortBy === 'name_asc') return String(a.name).localeCompare(String(b.name), 'vi');
        return 0;
      });
  }, [products, searchTerm, selectedCategory, stockStatus, sortBy]);

  // Paginated slice
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setCurrentPage(1);
  };

  const handleStockStatusChange = (e) => {
    setStockStatus(e.target.value);
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setStockStatus('');
    setSortBy('');
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setItemsPerPage(newSize);
    setCurrentPage(1);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      try {
        await productService.delete(id);
        setProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
        if (paginatedProducts.length === 1 && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        }
        if (showToast) {
          showToast({
            type: 'success',
            title: 'Đã xóa sản phẩm',
            message: `Sản phẩm #${id} đã được xóa thành công.`
          });
        }
      } catch (err) {
        if (showToast) {
          showToast({
            type: 'error',
            title: 'Lỗi xóa sản phẩm',
            message: err.message || 'Không thể xóa sản phẩm.'
          });
        }
      }
    }
  };

  return (
    <div>
      <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Quản lý sản phẩm</h1>
          <p className="page-subtitle" style={{ margin: '0.25rem 0 0' }}>
            Danh sách và công cụ quản trị sản phẩm trong hệ thống
          </p>
        </div>
        <Link to="/admin/products/new">
          <Button variant="primary">➕ Thêm sản phẩm</Button>
        </Link>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
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
              onChange={handleSearchChange}
              placeholder="Tìm theo tên hoặc mã sản phẩm..."
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

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockStatus}
            onChange={handleStockStatusChange}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#ffffff'
            }}
          >
            <option value="">Tất cả tình trạng</option>
            <option value="IN_STOCK">Đủ hàng (&gt; 5)</option>
            <option value="LOW_STOCK">Sắp hết hàng (1 - 5)</option>
            <option value="OUT_OF_STOCK">Hết hàng (0)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={handleSortChange}
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
            <option value="price_asc">Giá: Thấp đến Cao</option>
            <option value="price_desc">Giá: Cao đến Thấp</option>
            <option value="stock_desc">Tồn kho: Nhiều nhất</option>
            <option value="name_asc">Tên: A - Z</option>
          </select>
        </div>

        {/* Filter stats & Reset button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ color: '#64748b' }}>
            Hiển thị <strong>{filteredProducts.length}</strong> / {products.length} sản phẩm
          </span>
          {(searchTerm || selectedCategory || stockStatus || sortBy) && (
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

      {/* PRODUCTS TABLE */}
      <div className="card" style={{ padding: 0, borderRadius: '14px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <Loading message="Đang tải danh sách sản phẩm quản trị..." />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
            <p style={{ fontWeight: 600 }}>Không tìm thấy sản phẩm nào phù hợp</p>
            <p style={{ fontSize: '0.85rem' }}>Thử thay đổi từ khóa tìm kiếm hoặc các tiêu chí lọc</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Tên sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Đơn giá</th>
                    <th>Tồn kho</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((item) => {
                    const currentStock = Number(item.stockQuantity ?? item.stock ?? 0);
                    return (
                      <tr key={item.id}>
                        <td>#{item.id}</td>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td>
                          <span className="badge badge-secondary">{item.category}</span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#2563eb' }}>{formatCurrency(item.price)}</td>
                        <td>
                          {currentStock === 0 ? (
                            <span className="badge badge-danger">Hết hàng</span>
                          ) : currentStock <= 5 ? (
                            <span className="badge badge-warning">Còn {currentStock}</span>
                          ) : (
                            <span className="badge badge-success">{currentStock}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                            <Link to={`/admin/products/${item.id}/edit`}>
                              <Button variant="outline" size="sm">
                                Sửa
                              </Button>
                            </Link>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
                              Xóa
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* REUSABLE PAGINATION */}
            <Pagination
              currentPage={currentPage}
              totalItems={filteredProducts.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={handlePageSizeChange}
              itemsPerPageOptions={[5, 10, 20, 50]}
              unitName="sản phẩm"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;
