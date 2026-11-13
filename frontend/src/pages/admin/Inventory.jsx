import { useState, useMemo, useEffect, useCallback } from 'react';
import inventoryService, { getInventoryStatus } from '../../services/inventoryService';
import useToast from '../../hooks/useToast';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import Pagination from '../../components/admin/Pagination';
import StockAdjustmentModal from '../../components/admin/StockAdjustmentModal';

const Inventory = () => {
  const { notify } = useToast();
  const [inventoryList, setInventoryList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal điều chỉnh kho state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await inventoryService.getInventory();
      if (Array.isArray(data)) {
        setInventoryList(data);
      }
    } catch (err) {
      setInventoryList([]);
      setError(err.message || 'Không thể tải dữ liệu tồn kho từ máy chủ.');
      console.warn('Lỗi tải tồn kho từ máy chủ, sử dụng dữ liệu cục bộ:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = inventoryList.length;
    const outOfStock = inventoryList.filter((item) => {
      const st = Number(item.stockQuantity ?? item.stock ?? 0);
      return st <= 0;
    }).length;

    const lowStock = inventoryList.filter((item) => {
      const st = Number(item.stockQuantity ?? item.stock ?? 0);
      const th = Number(item.minThreshold || 5);
      return st > 0 && st <= th;
    }).length;

    const inStock = inventoryList.filter((item) => {
      const st = Number(item.stockQuantity ?? item.stock ?? 0);
      const th = Number(item.minThreshold || 5);
      return st > th;
    }).length;

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

        const currentStock = Number(item.stockQuantity ?? item.stock ?? 0);
        const threshold = Number(item.minThreshold || 5);

        let matchStatus = true;
        if (stockStatusFilter === 'OUT_OF_STOCK') {
          matchStatus = currentStock <= 0;
        } else if (stockStatusFilter === 'LOW_STOCK') {
          matchStatus = currentStock > 0 && currentStock <= threshold;
        } else if (stockStatusFilter === 'IN_STOCK') {
          matchStatus = currentStock > threshold;
        }

        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const stockA = Number(a.stockQuantity ?? a.stock ?? 0);
        const stockB = Number(b.stockQuantity ?? b.stock ?? 0);
        if (sortBy === 'stock_asc') return stockA - stockB;
        if (sortBy === 'stock_desc') return stockB - stockA;
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

  const handleOpenAdjustmentModal = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleAdjustmentSuccess = (updatedItem) => {
    setInventoryList((prevList) =>
      prevList.map((item) =>
        String(item.id) === String(updatedItem.id)
          ? {
              ...item,
              ...updatedItem,
              stock: Number(updatedItem.stockQuantity ?? updatedItem.stock ?? 0),
              stockQuantity: Number(updatedItem.stockQuantity ?? updatedItem.stock ?? 0)
            }
          : item
      )
    );
  };

  return (
    <div className="admin-inventory-page" style={{ paddingBottom: '2rem' }}>
      {/* PAGE HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Quản lý tồn kho &amp; Cảnh báo</h1>
          <p className="page-subtitle" style={{ margin: '0.25rem 0 0' }}>
            Theo dõi số lượng hàng hóa thực tế, điều chỉnh xuất nhập kho và cảnh báo thiếu hụt
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={loadInventory}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Đang tải...' : '🔄 Làm mới'}
          </Button>
        </div>
      </div>

      {/* ERROR BANNER (NẾU LỖI KẾT NỐI API) */}
      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <ErrorMessage message={error} />
          <div style={{ marginTop: '0.5rem' }}>
            <Button variant="outline" size="sm" onClick={loadInventory}>
              🔄 Thử lại kết nối
            </Button>
          </div>
        </div>
      )}

      {/* BANNER CẢNH BÁO TỒN KHO KHẨN CẤP (OUT_OF_STOCK / LOW_STOCK) */}
      {(metrics.outOfStock > 0 || metrics.lowStock > 0) && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            borderRadius: '12px',
            backgroundColor: metrics.outOfStock > 0 ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${metrics.outOfStock > 0 ? '#fecaca' : '#fde68a'}`,
            color: metrics.outOfStock > 0 ? '#991b1b' : '#92400e'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.35rem' }}>{metrics.outOfStock > 0 ? '🚨' : '⚠️'}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                Cảnh báo tồn kho cần xử lý: {metrics.outOfStock} mặt hàng hết hàng, {metrics.lowStock} mặt hàng sắp hết hàng!
              </div>
              <div style={{ fontSize: '0.82rem', opacity: 0.9 }}>
                Vui lòng kiểm tra và thực hiện nhập kho bổ sung để tránh gián đoạn đơn hàng của khách.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {metrics.outOfStock > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setStockStatusFilter('OUT_OF_STOCK');
                  setCurrentPage(1);
                }}
              >
                ⛔ Xem hàng đã hết ({metrics.outOfStock})
              </Button>
            )}
            {metrics.lowStock > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStockStatusFilter('LOW_STOCK');
                  setCurrentPage(1);
                }}
              >
                ⚠️ Xem sắp hết ({metrics.lowStock})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* METRIC CARDS */}
      <div className="grid-cols-4" style={{ marginBottom: '1.5rem' }}>
        <div
          className="card"
          onClick={() => {
            setStockStatusFilter('');
            setCurrentPage(1);
          }}
          style={{
            padding: '1.25rem',
            cursor: 'pointer',
            transition: 'transform 0.15s ease',
            border: stockStatusFilter === '' ? '2px solid #3b82f6' : '1px solid #e2e8f0'
          }}
        >
          <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600 }}>TỔNG MẶT HÀNG</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            {metrics.total}
          </div>
          <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Đang quản lý trong kho</small>
        </div>

        <div
          className="card"
          onClick={() => {
            setStockStatusFilter('IN_STOCK');
            setCurrentPage(1);
          }}
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #16a34a',
            cursor: 'pointer',
            border: stockStatusFilter === 'IN_STOCK' ? '2px solid #16a34a' : '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.825rem', color: '#166534', fontWeight: 600 }}>CÒN ĐỦ HÀNG</span>
            <span>✅</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>
            {metrics.inStock}
          </div>
          <small style={{ color: '#16a34a', fontSize: '0.75rem' }}>&gt; Ngưỡng an toàn</small>
        </div>

        <div
          className="card"
          onClick={() => {
            setStockStatusFilter('LOW_STOCK');
            setCurrentPage(1);
          }}
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #f59e0b',
            cursor: 'pointer',
            border: stockStatusFilter === 'LOW_STOCK' ? '2px solid #f59e0b' : '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.825rem', color: '#92400e', fontWeight: 600 }}>SẮP HẾT HÀNG</span>
            <span>⚠️</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#d97706', marginTop: '0.25rem' }}>
            {metrics.lowStock}
          </div>
          <small style={{ color: '#b45309', fontSize: '0.75rem' }}>≤ Ngưỡng cảnh báo</small>
        </div>

        <div
          className="card"
          onClick={() => {
            setStockStatusFilter('OUT_OF_STOCK');
            setCurrentPage(1);
          }}
          style={{
            padding: '1.25rem',
            borderLeft: '4px solid #dc2626',
            cursor: 'pointer',
            border: stockStatusFilter === 'OUT_OF_STOCK' ? '2px solid #dc2626' : '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.825rem', color: '#991b1b', fontWeight: 600 }}>ĐÃ HẾT HÀNG</span>
            <span>⛔</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#dc2626', marginTop: '0.25rem' }}>
            {metrics.outOfStock}
          </div>
          <small style={{ color: '#dc2626', fontSize: '0.75rem' }}>Cần nhập hàng ngay</small>
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
        <div className="admin-toolbar-grid">
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
              placeholder="Tìm theo tên sản phẩm hoặc mã SKU..."
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
            <option value="">Tất cả tình trạng kho</option>
            <option value="IN_STOCK">Còn đủ hàng (&gt; Ngưỡng an toàn)</option>
            <option value="LOW_STOCK">Sắp hết hàng (≤ Ngưỡng cảnh báo)</option>
            <option value="OUT_OF_STOCK">Đã hết hàng (= 0)</option>
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
            <option value="stock_asc">Tồn kho: Ít nhất (Ưu tiên cảnh báo)</option>
            <option value="name_asc">Tên mặt hàng: A - Z</option>
          </select>
        </div>

        {/* Filter stats & Reset button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <span style={{ color: '#64748b' }}>
            Hiển thị <strong>{filteredInventory.length}</strong> / {inventoryList.length} mặt hàng
            {stockStatusFilter && (
              <span style={{ marginLeft: '0.5rem', color: '#2563eb' }}>
                (Đang lọc:{' '}
                {stockStatusFilter === 'OUT_OF_STOCK'
                  ? 'Đã hết hàng'
                  : stockStatusFilter === 'LOW_STOCK'
                  ? 'Sắp hết hàng'
                  : 'Còn đủ hàng'}
                )
              </span>
            )}
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
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Loading message="Đang đồng bộ dữ liệu tồn kho..." />
          </div>
        ) : filteredInventory.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📦</div>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>Không tìm thấy mặt hàng nào phù hợp</p>
            <p style={{ fontSize: '0.85rem' }}>Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc trạng thái</p>
            <Button variant="secondary" size="sm" onClick={handleResetFilter} style={{ marginTop: '0.75rem' }}>
              Đặt lại bộ lọc
            </Button>
          </div>
        ) : (
          <>
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>Mã SKU</th>
                    <th>Tên sản phẩm</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Tồn kho hiện tại</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Ngưỡng an toàn</th>
                    <th style={{ width: '160px', textAlign: 'center' }}>Tình trạng</th>
                    <th style={{ width: '160px', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInventory.map((item) => {
                    const currentStock = Number(item.stockQuantity ?? item.stock ?? 0);
                    const threshold = Number(item.minThreshold || 5);
                    const statusInfo = getInventoryStatus(currentStock, threshold);

                    return (
                      <tr
                        key={item.id}
                        style={{
                          transition: 'background-color 0.15s ease',
                          backgroundColor:
                            statusInfo.status === 'OUT_OF_STOCK'
                              ? '#fff5f5'
                              : statusInfo.status === 'LOW_STOCK'
                              ? '#fffbeb'
                              : 'transparent'
                        }}
                      >
                        <td>
                          <code
                            style={{
                              backgroundColor: '#f1f5f9',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              color: '#0f172a',
                              fontWeight: 700
                            }}
                          >
                            {item.sku}
                          </code>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Mã ID: {item.id}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '1.1rem',
                              fontWeight: 800,
                              color: statusInfo.color,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              backgroundColor: statusInfo.bgLight,
                              border: `1px solid ${statusInfo.border}`
                            }}
                          >
                            {currentStock}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>
                            {threshold} sp
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className={`badge ${statusInfo.badgeClass}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '9999px',
                              fontSize: '0.8rem',
                              fontWeight: 700
                            }}
                          >
                            <span>{statusInfo.icon}</span>
                            <span>{statusInfo.label}</span>
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenAdjustmentModal(item)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontSize: '0.825rem',
                              padding: '0.4rem 0.75rem'
                            }}
                          >
                            <span>⚙️</span>
                            <span>Điều chỉnh kho</span>
                          </Button>
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

      {/* STOCK ADJUSTMENT MODAL */}
      <StockAdjustmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        product={selectedProduct}
        onSuccess={handleAdjustmentSuccess}
      />
    </div>
  );
};

export default Inventory;
