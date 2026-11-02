import { useMemo } from 'react';

/**
 * Reusable Admin Pagination Component
 * 
 * @param {number} currentPage - Trang hiện tại (1-based)
 * @param {number} totalItems - Tổng số mục đã lọc
 * @param {number} itemsPerPage - Số mục trên mỗi trang (5, 10, 20, 50)
 * @param {function} onPageChange - Callback khi chuyển trang: (newPage) => void
 * @param {function} onItemsPerPageChange - Callback khi đổi số lượng hiển thị: (newSize) => void
 * @param {number[]} itemsPerPageOptions - Các lựa chọn kích thước trang (mặc định [5, 10, 20, 50])
 * @param {string} unitName - Tên đơn vị hiển thị (ví dụ: 'danh mục', 'sản phẩm', 'đơn hàng')
 * @param {boolean} showTotal - Hiển thị dòng tổng số
 * @param {boolean} showPageSize - Hiển thị dropdown chọn số lượng/trang
 */
const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 20, 50],
  unitName = 'mục',
  showTotal = true,
  showPageSize = true,
  className = '',
  style = {}
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // Tính toán phạm vi hiển thị: "Hiển thị X-Y trong tổng số Z"
  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safeCurrentPage * itemsPerPage, totalItems);

  // Thuật toán sinh danh sách số trang thông minh với dấu ba chấm (...)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    if (safeCurrentPage <= 4) {
      // Đầu danh sách: 1, 2, 3, 4, 5, ..., totalPages
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (safeCurrentPage >= totalPages - 3) {
      // Cuối danh sách: 1, ..., totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      // Giữa danh sách: 1, ..., current-1, current, current+1, ..., totalPages
      pages.push(1);
      pages.push('...');
      pages.push(safeCurrentPage - 1);
      pages.push(safeCurrentPage);
      pages.push(safeCurrentPage + 1);
      pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  const handlePageClick = (page) => {
    if (page === '...' || page === safeCurrentPage) return;
    if (page >= 1 && page <= totalPages && onPageChange) {
      onPageChange(page);
    }
  };

  const handlePrev = () => {
    if (safeCurrentPage > 1 && onPageChange) {
      onPageChange(safeCurrentPage - 1);
    }
  };

  const handleNext = () => {
    if (safeCurrentPage < totalPages && onPageChange) {
      onPageChange(safeCurrentPage + 1);
    }
  };

  const handleSelectSize = (e) => {
    const newSize = Number(e.target.value);
    if (onItemsPerPageChange) {
      onItemsPerPageChange(newSize);
    }
  };

  return (
    <div
      className={`admin-pagination-container ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1rem 1.25rem',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        borderRadius: '0 0 1rem 1rem',
        fontSize: '0.875rem',
        ...style
      }}
    >
      {/* KHỐI TRÁI: THỐNG KÊ HIỂN THỊ & DROPDOWN SỐ LƯỢNG MỖI TRANG */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          color: '#64748b'
        }}
      >
        {showTotal && (
          <div>
            Hiển thị{' '}
            <strong style={{ color: '#0f172a' }}>
              {startItem}-{endItem}
            </strong>{' '}
            trong tổng số{' '}
            <strong style={{ color: '#0f172a' }}>{totalItems}</strong> {unitName}
          </div>
        )}

        {showPageSize && onItemsPerPageChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span>Hiển thị:</span>
            <select
              value={itemsPerPage}
              onChange={handleSelectSize}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KHỐI PHẢI: ĐIỀU HƯỚNG TRANG (DESKTOP & MOBILE RESPONSIVE) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.4rem',
          userSelect: 'none'
        }}
      >
        {/* Nút Trước */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={safeCurrentPage <= 1}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.45rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: safeCurrentPage <= 1 ? '#f8fafc' : '#ffffff',
            color: safeCurrentPage <= 1 ? '#94a3b8' : '#334155',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Trang trước"
        >
          <span>←</span> Trước
        </button>

        {/* Desktop: Danh sách các nút số trang */}
        <div
          className="admin-pagination-pages-desktop"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  style={{
                    padding: '0.35rem 0.5rem',
                    color: '#94a3b8',
                    fontWeight: 700
                  }}
                >
                  ...
                </span>
              );
            }

            const isActive = page === safeCurrentPage;
            return (
              <button
                key={`page-${page}`}
                type="button"
                onClick={() => handlePageClick(page)}
                style={{
                  minWidth: '36px',
                  height: '36px',
                  padding: '0 0.5rem',
                  borderRadius: '8px',
                  border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: isActive ? '#2563eb' : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isActive ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#eff6ff';
                    e.currentTarget.style.color = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.color = '#475569';
                  }
                }}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Mobile: Chỉ hiển thị "1 / 5" để không vỡ layout */}
        <div
          className="admin-pagination-pages-mobile"
          style={{
            display: 'none',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#0f172a',
            padding: '0 0.5rem'
          }}
        >
          {safeCurrentPage} / {totalPages}
        </div>

        {/* Nút Sau */}
        <button
          type="button"
          onClick={handleNext}
          disabled={safeCurrentPage >= totalPages}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.45rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: safeCurrentPage >= totalPages ? '#f8fafc' : '#ffffff',
            color: safeCurrentPage >= totalPages ? '#94a3b8' : '#334155',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Trang sau"
        >
          Sau <span>→</span>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
