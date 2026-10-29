import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import Button from '../../components/common/Button';
import Pagination from '../../components/admin/Pagination';

const INITIAL_MOCK_ADMIN_PRODUCTS = [
  { id: '1', name: 'Laptop Dell XPS 13', category: 'Laptop & Workstation', price: 28990000, stock: 10 },
  { id: '2', name: 'Điện thoại iPhone 15 Pro', category: 'Điện thoại thông minh', price: 27990000, stock: 15 },
  { id: '3', name: 'Bàn phím cơ không dây', category: 'Bàn phím cơ & Chuột', price: 1850000, stock: 25 },
  { id: '4', name: 'Tai nghe Bluetooth chống ồn', category: 'Tai nghe & Âm thanh Hi-Fi', price: 3490000, stock: 8 },
  { id: '5', name: 'MacBook Air M2 13 inch', category: 'Laptop & Workstation', price: 24500000, stock: 3 },
  { id: '6', name: 'Điện thoại Samsung Galaxy S24', category: 'Điện thoại thông minh', price: 21990000, stock: 0 },
  { id: '7', name: 'iPad Pro 11 M2 Wi-Fi 128GB', category: 'Máy tính bảng & iPad', price: 19990000, stock: 12 },
  { id: '8', name: 'Đồng hồ thông minh Apple Watch Series 9', category: 'Đồng hồ thông minh & Smartwatch', price: 9890000, stock: 18 },
  { id: '9', name: 'Robot hút bụi Deebot X2 OMNI', category: 'Đồ gia dụng thông minh', price: 18990000, stock: 6 },
  { id: '10', name: 'Màn hình Dell UltraSharp 27 4K U2723QE', category: 'Màn hình máy tính', price: 13490000, stock: 14 },
  { id: '11', name: 'Tai nghe Sony WH-1000XM5', category: 'Tai nghe & Âm thanh Hi-Fi', price: 7490000, stock: 20 },
  { id: '12', name: 'Ghế công thái học Herman Miller Aeron', category: 'Thiết bị Gaming', price: 29500000, stock: 4 },
  { id: '13', name: 'Card đồ họa ASUS ROG Strix RTX 4080', category: 'Linh kiện máy tính (PC Parts)', price: 36990000, stock: 5 },
  { id: '14', name: 'Chuột không dây Logitech MX Master 3S', category: 'Bàn phím cơ & Chuột', price: 2490000, stock: 30 },
  { id: '15', name: 'Router Wi-Fi 7 ASUS ROG Rapture', category: 'Thiết bị mạng & Wifi 7', price: 11990000, stock: 9 },
  { id: '16', name: 'Máy ảnh Sony Alpha A7 IV Body', category: 'Thời trang nam', price: 54990000, stock: 2 },
  { id: '17', name: 'Ổ cứng SSD Samsung 990 Pro 2TB PCIe 4.0', category: 'Linh kiện máy tính (PC Parts)', price: 4690000, stock: 45 },
  { id: '18', name: 'Loa Marshall Stanmore III Bluetooth', category: 'Tai nghe & Âm thanh Hi-Fi', price: 8990000, stock: 11 },
  { id: '19', name: 'Máy lọc không khí Xiaomi Smart Air Purifier 4', category: 'Đồ gia dụng thông minh', price: 3290000, stock: 22 },
  { id: '20', name: 'Pin sạc dự phòng Anker 737 PowerCore 24K', category: 'Phụ kiện di động', price: 2890000, stock: 16 },
  { id: '21', name: 'Balo chống nước Tomtoc Premium Laptop', category: 'Thời trang nam', price: 1650000, stock: 28 },
  { id: '22', name: 'Áo khoác gió thể thao nam cao cấp', category: 'Thời trang nam', price: 650000, stock: 35 },
  { id: '23', name: 'Giày chạy bộ Nike Air Zoom Pegasus 40', category: 'Giày dép & Sneaker', price: 3190000, stock: 19 },
  { id: '24', name: 'Củ sạc nhanh Baseus GaN5 Pro 100W', category: 'Phụ kiện di động', price: 890000, stock: 50 }
];

const AdminProducts = () => {
  const [products, setProducts] = useState(INITIAL_MOCK_ADMIN_PRODUCTS);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [sortBy, setSortBy] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Extract unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category)));
  }, [products]);

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search by name or ID
        const matchSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
          p.id.toLowerCase().includes(searchTerm.toLowerCase().trim());

        // Filter by category
        const matchCategory = selectedCategory ? p.category === selectedCategory : true;

        // Filter by stock status
        let matchStock = true;
        if (stockStatus === 'IN_STOCK') {
          matchStock = p.stock > 5;
        } else if (stockStatus === 'LOW_STOCK') {
          matchStock = p.stock > 0 && p.stock <= 5;
        } else if (stockStatus === 'OUT_OF_STOCK') {
          matchStock = p.stock === 0;
        }

        return matchSearch && matchCategory && matchStock;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'stock_desc') return b.stock - a.stock;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'vi');
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

  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      setProducts(products.filter((p) => p.id !== id));
      if (paginatedProducts.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
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
        {filteredProducts.length === 0 ? (
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
                  {paginatedProducts.map((item) => (
                    <tr key={item.id}>
                      <td>#{item.id}</td>
                      <td style={{ fontWeight: 600 }}>{item.name}</td>
                      <td>
                        <span className="badge badge-secondary">{item.category}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>{formatCurrency(item.price)}</td>
                      <td>
                        {item.stock === 0 ? (
                          <span className="badge badge-danger">Hết hàng</span>
                        ) : item.stock <= 5 ? (
                          <span className="badge badge-warning">Còn {item.stock}</span>
                        ) : (
                          <span className="badge badge-success">{item.stock}</span>
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
                  ))}
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
