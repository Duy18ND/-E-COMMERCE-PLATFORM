import { useState, useEffect } from 'react';
import Button from '../common/Button';

const ProductSearch = ({ onSearch, initialValue = '' }) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);

  useEffect(() => {
    setSearchTerm(initialValue || '');
  }, [initialValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm.trim());
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        gap: '0.5rem',
        maxWidth: '520px',
        width: '100%',
        marginBottom: '1.25rem',
        position: 'relative'
      }}
    >
      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm sản phẩm theo tên, danh mục..."
          aria-label="Tìm kiếm sản phẩm"
          style={{
            width: '100%',
            padding: '0.6rem 2.2rem 0.6rem 0.85rem',
            borderRadius: '0.5rem',
            border: '1px solid #cbd5e1',
            outline: 'none',
            fontSize: '0.95rem'
          }}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            title="Xóa từ khóa"
            style={{
              position: 'absolute',
              right: '0.55rem',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '1.1rem',
              lineHeight: 1,
              padding: '0.2rem'
            }}
          >
            &times;
          </button>
        )}
      </div>
      <Button type="submit" variant="primary">
        Tìm kiếm
      </Button>
    </form>
  );
};

export default ProductSearch;
