const ProductFilter = ({
  categories = [],
  selectedCategory = '',
  onSelectCategory,
  onSortChange,
  currentSort = '',
  onReset,
  totalCount
}) => {
  const hasActiveFilter = Boolean(selectedCategory || currentSort);

  return (
    <div
      className="card product-filter-bar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem'
      }}
    >
      {/* Hàng 1: Các nút chọn nhanh Danh mục (Category Pills) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginRight: '0.25rem' }}>
          Danh mục:
        </span>
        <button
          type="button"
          onClick={() => onSelectCategory && onSelectCategory('')}
          style={{
            padding: '0.4rem 0.9rem',
            borderRadius: '9999px',
            border: !selectedCategory ? '1px solid #2563eb' : '1px solid #e2e8f0',
            backgroundColor: !selectedCategory ? '#2563eb' : '#f8fafc',
            color: !selectedCategory ? '#ffffff' : '#334155',
            fontSize: '0.825rem',
            fontWeight: !selectedCategory ? 700 : 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Tất cả
        </button>

        {categories.map((cat) => {
          const catValue = typeof cat === 'object' ? cat.id || cat.slug || cat.name : cat;
          const catLabel = typeof cat === 'object' ? cat.name : cat;
          const isActive =
            String(selectedCategory).toLowerCase() === String(catValue).toLowerCase() ||
            String(selectedCategory).toLowerCase() === String(catLabel).toLowerCase();

          return (
            <button
              key={catValue}
              type="button"
              onClick={() => onSelectCategory && onSelectCategory(catValue)}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '9999px',
                border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: isActive ? '#2563eb' : '#f8fafc',
                color: isActive ? '#ffffff' : '#334155',
                fontSize: '0.825rem',
                fontWeight: isActive ? 700 : 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {catLabel}
            </button>
          );
        })}
      </div>

      {/* Hàng 2: Dropdown lọc danh mục, Sắp xếp và Thống kê */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label
              htmlFor="category-filter-select"
              style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}
            >
              Lọc nhanh:
            </label>
            <select
              id="category-filter-select"
              value={selectedCategory}
              onChange={(e) => onSelectCategory && onSelectCategory(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                color: '#1e293b',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((cat) => {
                const val = typeof cat === 'object' ? cat.id || cat.slug || cat.name : cat;
                const label = typeof cat === 'object' ? cat.name : cat;
                return (
                  <option key={val} value={val}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {typeof totalCount === 'number' && (
            <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
              Tìm thấy <strong style={{ color: '#0f172a' }}>{totalCount}</strong> sản phẩm
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label
              htmlFor="sort-order-select"
              style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}
            >
              Sắp xếp:
            </label>
            <select
              id="sort-order-select"
              value={currentSort}
              onChange={(e) => onSortChange && onSortChange(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                color: '#1e293b',
                backgroundColor: '#ffffff'
              }}
            >
              <option value="">Mặc định (Mới nhất)</option>
              <option value="price_asc">Giá: Thấp đến Cao</option>
              <option value="price_desc">Giá: Cao đến Thấp</option>
              <option value="name_asc">Tên: A - Z</option>
              <option value="name_desc">Tên: Z - A</option>
            </select>
          </div>

          {hasActiveFilter && onReset && (
            <button
              type="button"
              onClick={onReset}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ✕ Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductFilter;
