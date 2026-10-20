const ProductFilter = ({ categories = [], selectedCategory = '', onSelectCategory, onSortChange, currentSort = '' }) => {
  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Danh mục:</span>
        <select
          value={selectedCategory}
          onChange={(e) => onSelectCategory && onSelectCategory(e.target.value)}
          style={{
            padding: '0.4rem 0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid #cbd5e1',
            fontSize: '0.875rem'
          }}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((cat) => (
            <option key={cat.id || cat} value={cat.id || cat}>
              {cat.name || cat}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Sắp xếp:</span>
        <select
          value={currentSort}
          onChange={(e) => onSortChange && onSortChange(e.target.value)}
          style={{
            padding: '0.4rem 0.75rem',
            borderRadius: '0.375rem',
            border: '1px solid #cbd5e1',
            fontSize: '0.875rem'
          }}
        >
          <option value="">Mặc định</option>
          <option value="price_asc">Giá: Thấp đến Cao</option>
          <option value="price_desc">Giá: Cao đến Thấp</option>
          <option value="name_asc">Tên: A - Z</option>
        </select>
      </div>
    </div>
  );
};

export default ProductFilter;
