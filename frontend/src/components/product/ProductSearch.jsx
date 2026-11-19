import { useState, useEffect, useRef } from 'react';
import Button from '../common/Button';
import Icon from '../common/Icons';

/**
 * Chuẩn hóa từ khóa tìm kiếm: cắt khoảng trắng đầu/cuối và gộp khoảng trắng thừa ở giữa
 */
export const normalizeSearchKeyword = (value = '') =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const ProductSearch = ({
  onSearch,
  initialValue = '',
  debounceMs = 350,
  placeholder = 'Tìm kiếm sản phẩm theo tên, danh mục...'
}) => {
  const [searchTerm, setSearchTerm] = useState(initialValue || '');
  const debounceTimerRef = useRef(null);
  const lastSubmittedRef = useRef(normalizeSearchKeyword(initialValue));

  // Đồng bộ khi giá trị từ URL hoặc nút Reset bộ lọc bên ngoài thay đổi
  useEffect(() => {
    const normalizedInitial = normalizeSearchKeyword(initialValue);
    setSearchTerm(initialValue || '');
    lastSubmittedRef.current = normalizedInitial;
  }, [initialValue]);

  // Dọn dẹp timer debounce khi unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const triggerSearch = (rawValue) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const cleaned = normalizeSearchKeyword(rawValue);
    lastSubmittedRef.current = cleaned;
    if (onSearch) {
      onSearch(cleaned);
    }
  };

  const handleInputChange = (e) => {
    const nextValue = e.target.value;
    setSearchTerm(nextValue);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (debounceMs > 0 && onSearch) {
      debounceTimerRef.current = setTimeout(() => {
        const cleaned = normalizeSearchKeyword(nextValue);
        if (cleaned !== lastSubmittedRef.current) {
          lastSubmittedRef.current = cleaned;
          onSearch(cleaned);
        }
      }, debounceMs);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    triggerSearch(searchTerm);
  };

  const handleClear = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSearchTerm('');
    lastSubmittedRef.current = '';
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="product-search-form"
      role="search"
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
        <span style={{ position: 'absolute', left: '0.8rem', color: '#94a3b8', display: 'inline-flex', pointerEvents: 'none' }}>
          <Icon name="search" size={16} />
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder={placeholder}
          aria-label="Tìm kiếm sản phẩm"
          style={{
            width: '100%',
            padding: '0.6rem 2.2rem 0.6rem 2.35rem',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            outline: 'none',
            fontSize: '0.95rem',
            backgroundColor: '#ffffff',
            color: '#0f172a'
          }}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            title="Xóa từ khóa"
            aria-label="Xóa từ khóa"
            style={{
              position: 'absolute',
              right: '0.55rem',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.2rem'
            }}
          >
            <Icon name="x" size={15} />
          </button>
        )}
      </div>
      <Button type="submit" variant="primary" pill={false} icon={<Icon name="search" size={15} />}>
        Tìm kiếm
      </Button>
    </form>
  );
};

export default ProductSearch;
