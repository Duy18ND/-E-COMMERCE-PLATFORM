import { useState, useMemo, useEffect, useCallback } from 'react';
import inventoryService from '../../services/inventoryService';
import useToast from '../../hooks/useToast';
import Button from '../../components/common/Button';
import Pagination from '../../components/admin/Pagination';

const INITIAL_MOCK_INVENTORY = [
  { id: '1', name: 'Laptop Dell XPS 13', sku: 'DELL-XPS-13', stock: 10, minThreshold: 5 },
  { id: '2', name: 'Điện thoại iPhone 15 Pro', sku: 'APPL-IP15P', stock: 3, minThreshold: 5 },
  { id: '3', name: 'Bàn phím cơ không dây', sku: 'KEY-WL-01', stock: 25, minThreshold: 10 },
  { id: '4', name: 'Tai nghe Bluetooth chống ồn', sku: 'AUD-BT-NC', stock: 0, minThreshold: 5 },
  { id: '5', name: 'MacBook Air M2 13 inch', sku: 'APPL-MBA-M2', stock: 2, minThreshold: 5 },
  { id: '6', name: 'Chuột không dây công thái học', sku: 'LOGI-MX-3S', stock: 18, minThreshold: 8 },
  { id: '7', name: 'Robot hút bụi Ecovacs X2', sku: 'ECO-DEE-X2', stock: 0, minThreshold: 4 },
  { id: '8', name: 'iPad Pro 11 M2 128GB', sku: 'APPL-IPD-11', stock: 12, minThreshold: 6 }
];

const Inventory = () => {
  const { showToast } = useToast();
  const [inventoryList, setInventoryList] = useState(INITIAL_MOCK_INVENTORY);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [newStockVal, setNewStockVal] = useState('');

  const loadInventory = useCallback(async () => {
    try {
      const data = await inventoryService.getInventory();
      if (Array.isArray(data) && data.length > 0) {
        setInventoryList(data);
      }
    } catch {
      // Fallback sang INITIAL_MOCK_INVENTORY
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = inventoryList.length;
    const outOfStock = inventoryList.filter((item) => item.stock <= 0).length;
    const lowStock = inventoryList.filter(
      (item) => item.stock > 0 && item.stock <= item.minThreshold
    ).length;
    const inStock = inventoryList.filter((item) => item.stock > item.minThreshold).length;

    return { total, outOfStock, lowStock, inStock };
  }, [inventoryList]);

  // Filtered & Sorted inventory list
  const filteredInventory = useMemo(() => {
    return inventoryList
      .filter((item) => {
        const term = searchTerm.toLowerCase().trim();
        const matchSearch =
          String(item.sku || '').toLowerCase().includes(term) ||
          String(item.name || '').toLowerCase().includes(term);

        let matchStatus = true;
        if (stockStatusFilter === 'OUT_OF_STOCK') {
          matchStatus = item.stock <= 0;
        } else if (stockStatusFilter === 'LOW_STOCK') {
          matchStatus = item.stock > 0 && item.stock <= item.minThreshold;
        } else if (stockStatusFilter === 'IN_STOCK') {
          matchStatus = item.stock > item.minThreshold;
        }

        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'stock_asc') return a.stock - b.stock;
        if (sortBy === 'stock_desc') return b.stock - a.stock;
        if (sortBy === 'name_asc') return String(a.name).localeCompare(String(b.name), 'vi');
        return 0;
      });
  }, [inventoryList, searchTerm, stockStatusFilter, sortBy]);

  // Paginated slice
  const paginatedInventory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInventory.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInventory, currentPage, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStockStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setSearchTerm('');
    setStockStatusFilter('');
    setSortBy('');
    setCurrentPage(1);
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setNewStockVal(item.stock);
  };

  const handleSaveStock = async (id) => {
    const parsedStock = Number(newStockVal);
    if (Number.isNaN(parsedStock) || parsedStock < 0) {
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Số lượng không hợp lệ',
          message: 'Số lượng tồn kho không được nhỏ hơn 0.'
        });
      }
      return;
    }

    await inventoryService.updateStock(id, parsedStock);
    setInventoryList(
      inventoryList.map((item) =>
        item.id === id ? { ...item, stock: parsedStock, stockQuantity: parsedStock } : item
      )
    );
    setEditingId(null);
    if (showToast) {
      showToast({
        type: 'success',
        title: 'Đã cập nhật tồn kho',
        message: `Số lượng tồn kho mới: ${parsedStock} sản phẩm.`
      });
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Quản lý tồn kho</h1>
        <p className="page-subtitle" style={{ margin: '0.25rem 0 0' }}>
          Theo dõi số lượng hàng hóa và cảnh báo thiếu hụt trong kho
        </p>
      </div>

      {/* METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.825rem', color: '#64748b' }}>Tổng mặt hàng theo dõi</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            {metrics.total}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #16a34a' }}>
          <span style={{ fontSize: '0.825rem', color: '#64748b' }}>Đủ hàng trong kho</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>
            {metrics.inStock}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.825rem', color: '#64748b' }}>Cảnh báo sắp hết hàng</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706', marginTop: '0.25rem' }}>
            {metrics.lowStock}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #dc2626' }}>
          <span style={{ fontSize: '0.825rem', color: '#64748b' }}>Đã hết hàng</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626', marginTop: '0.25rem' }}>
            {metrics.outOfStock}
          </div>
        </div>
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
              placeholder="Tìm theo tên hoặc mã SKU..."
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

          {/* Stock Status Filter */}
          <select
            value={stockStatusFilter}
            onChange={handleStatusFilterChange}
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
            <option value="IN_STOCK">Đủ hàng (&gt; Ngưỡng an toàn)</option>
            <option value="LOW_STOCK">Sắp hết hàng (≤ Ngưỡng)</option>
            <option value="OUT_OF_STOCK">Hết hàng (= 0)</option>
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
            <option value="stock_desc">Tồn kho: Nhiều nhất</option>
            <option value="stock_asc">Tồn kho: Ít nhất</option>
            <option value="name_asc">Tên mặt hàng: A - Z</option>
          </select>
        </div>

        {/* Filter stats & Reset button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ color: '#64748b' }}>
            Hiển thị <strong>{filteredInventory.length}</strong> / {inventoryList.length} mặt hàng
          </span>
          {(searchTerm || stockStatusFilter || sortBy) && (
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

      {/* INVENTORY TABLE */}
      <div className="card" style={{ padding: 0, borderRadius: '14px', overflow: 'hidden' }}>
        {filteredInventory.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
            <p style={{ fontWeight: 600 }}>Không tìm thấy mặt hàng nào</p>
            <p style={{ fontSize: '0.85rem' }}>Thử thay đổi từ khóa tìm kiếm hoặc tình trạng tồn kho</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã SKU</th>
                    <th>Tên sản phẩm</th>
                    <th>Tồn kho hiện tại</th>
                    <th>Ngưỡng tối thiểu</th>
                    <th>Tình trạng</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInventory.map((item) => {
                    const isOutOfStock = item.stock <= 0;
                    const isLowStock = item.stock > 0 && item.stock <= item.minThreshold;

                    return (
                      <tr key={item.id}>
                        <td>
                          <code
                            style={{
                              backgroundColor: '#f1f5f9',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                              color: '#0f172a',
                              fontWeight: 600
                            }}
                          >
                            {item.sku}
                          </code>
                        </td>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td>
                          {editingId === item.id ? (
                            <input
                              type="number"
                              min="0"
                              value={newStockVal}
                              onChange={(e) => setNewStockVal(e.target.value)}
                              style={{
                                width: '80px',
                                padding: '0.3rem 0.5rem',
                                border: '2px solid #2563eb',
                                borderRadius: '0.375rem',
                                outline: 'none',
                                fontWeight: 700
                              }}
                              autoFocus
                            />
                          ) : (
                            <strong
                              style={{
                                fontSize: '1rem',
                                color: isOutOfStock ? '#dc2626' : isLowStock ? '#d97706' : '#0f172a'
                              }}
                            >
                              {item.stock}
                            </strong>
                          )}
                        </td>
                        <td>
                          <span style={{ color: '#64748b' }}>{item.minThreshold} sp</span>
                        </td>
                        <td>
                          {isOutOfStock ? (
                            <span className="badge badge-danger">Hết hàng</span>
                          ) : isLowStock ? (
                            <span className="badge badge-warning">Sắp hết hàng</span>
                          ) : (
                            <span className="badge badge-success">Đủ hàng</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {editingId === item.id ? (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                              <Button variant="primary" size="sm" onClick={() => handleSaveStock(item.id)}>
                                Lưu
                              </Button>
                              <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>
                                Hủy
                              </Button>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => handleStartEdit(item)}>
                              Nhập kho
                            </Button>
                          )}
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
              totalItems={filteredInventory.length}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(newSize) => {
                setItemsPerPage(newSize);
                setCurrentPage(1);
              }}
              itemsPerPageOptions={[5, 10, 20, 50]}
              unitName="mặt hàng"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Inventory;
