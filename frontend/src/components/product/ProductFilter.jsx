import { useState, useEffect } from 'react';

const PRICE_PRESETS = [
  { label: 'Tất cả mức giá', min: '', max: '' },
  { label: 'Dưới 5 triệu', min: '0', max: '5000000' },
  { label: '5 - 15 triệu', min: '5000000', max: '15000000' },
  { label: '15 - 30 triệu', min: '15000000', max: '30000000' },
  { label: 'Trên 30 triệu', min: '30000000', max: '' }
];

/**
 * Kiểm tra hợp lệ khoảng giá (ECOM-226):
 * - Giá không được âm (< 0)
 * - Giá tối thiểu không được lớn hơn giá tối đa (minPrice > maxPrice)
 */
export const validatePriceRange = (minRaw, maxRaw) => {
  const minStr = String(minRaw ?? '').trim();
  const maxStr = String(maxRaw ?? '').trim();

  const hasMin = minStr !== '';
  const hasMax = maxStr !== '';

  const minVal = hasMin ? Number(minStr) : null;
  const maxVal = hasMax ? Number(maxStr) : null;

  if (hasMin && (Number.isNaN(minVal) || minVal < 0)) {
    return {
      valid: false,
      error: 'Giá tối thiểu không hợp lệ (không được nhỏ hơn 0).',
      minPrice: null,
      maxPrice: null
    };
  }

  if (hasMax && (Number.isNaN(maxVal) || maxVal < 0)) {
    return {
      valid: false,
      error: 'Giá tối đa không hợp lệ (không được nhỏ hơn 0).',
      minPrice: null,
      maxPrice: null
    };
  }

  if (minVal !== null && maxVal !== null && minVal > maxVal) {
    return {
      valid: false,
      error: 'Giá tối thiểu không được lớn hơn giá tối đa.',
      minPrice: null,
      maxPrice: null
    };
  }

  return {
    valid: true,
    error: '',
    minPrice: minVal,
    maxPrice: maxVal
  };
};

const ProductFilter = ({
  categories = [],
  selectedCategory = '',
  onSelectCategory,
  minPrice = '',
  maxPrice = '',
  onPriceRangeChange,
  inStock = false,
  onInStockChange,
  onSortChange,
  currentSort = '',
  onReset,
  totalCount,
  searchTerm = ''
}) => {
  const [draftMinPrice, setDraftMinPrice] = useState(
    minPrice !== undefined && minPrice !== null ? String(minPrice) : ''
  );
  const [draftMaxPrice, setDraftMaxPrice] = useState(
    maxPrice !== undefined && maxPrice !== null ? String(maxPrice) : ''
  );
  const [validationError, setValidationError] = useState('');

  // Đồng bộ giá trị input khi state từ cha/URL hoặc nút Reset thay đổi
  useEffect(() => {
    setDraftMinPrice(minPrice !== undefined && minPrice !== null ? String(minPrice) : '');
    setDraftMaxPrice(maxPrice !== undefined && maxPrice !== null ? String(maxPrice) : '');
    setValidationError('');
  }, [minPrice, maxPrice]);

  const hasActiveFilter = Boolean(
    selectedCategory ||
      currentSort ||
      searchTerm ||
      inStock ||
      String(minPrice ?? '').trim() !== '' ||
      String(maxPrice ?? '').trim() !== '' ||
      String(draftMinPrice).trim() !== '' ||
      String(draftMaxPrice).trim() !== ''
  );

  const handleApplyPriceFilter = (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    const validation = validatePriceRange(draftMinPrice, draftMaxPrice);
    if (!validation.valid) {
      setValidationError(validation.error);
      return;
    }
    setValidationError('');
    if (onPriceRangeChange) {
      onPriceRangeChange({
        minPrice: validation.minPrice !== null ? String(validation.minPrice) : '',
        maxPrice: validation.maxPrice !== null ? String(validation.maxPrice) : ''
      });
    }
  };

  const handleSelectPricePreset = (preset) => {
    setDraftMinPrice(preset.min);
    setDraftMaxPrice(preset.max);
    setValidationError('');
    if (onPriceRangeChange) {
      onPriceRangeChange({
        minPrice: preset.min,
        maxPrice: preset.max
      });
    }
  };

  const handleResetClick = () => {
    setDraftMinPrice('');
    setDraftMaxPrice('');
    setValidationError('');
    if (onReset) {
      onReset();
    }
  };

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
        <span
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#475569',
            marginRight: '0.25rem'
          }}
        >
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

      {/* Hàng 2: Bộ lọc Khoảng giá (minPrice - maxPrice) và Tình trạng tồn kho (inStock) */}
      <div
        className="product-filter-advanced-row"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
            Khoảng giá (₫):
          </span>
          <input
            type="number"
            min="0"
            step="100000"
            aria-label="Giá tối thiểu"
            placeholder="Giá từ (₫)"
            value={draftMinPrice}
            onChange={(e) => {
              setDraftMinPrice(e.target.value);
              if (validationError) setValidationError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApplyPriceFilter(e);
            }}
            style={{
              width: '135px',
              padding: '0.38rem 0.6rem',
              borderRadius: '0.5rem',
              border: validationError ? '1px solid #ef4444' : '1px solid #cbd5e1',
              fontSize: '0.825rem',
              color: '#0f172a',
              backgroundColor: '#ffffff'
            }}
          />
          <span style={{ color: '#64748b', fontWeight: 600 }}>—</span>
          <input
            type="number"
            min="0"
            step="100000"
            aria-label="Giá tối đa"
            placeholder="Đến (₫)"
            value={draftMaxPrice}
            onChange={(e) => {
              setDraftMaxPrice(e.target.value);
              if (validationError) setValidationError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApplyPriceFilter(e);
            }}
            style={{
              width: '135px',
              padding: '0.38rem 0.6rem',
              borderRadius: '0.5rem',
              border: validationError ? '1px solid #ef4444' : '1px solid #cbd5e1',
              fontSize: '0.825rem',
              color: '#0f172a',
              backgroundColor: '#ffffff'
            }}
          />
          <button
            type="button"
            onClick={handleApplyPriceFilter}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '0.5rem',
              border: '1px solid #2563eb',
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Áp dụng giá
          </button>

          {/* Các mức giá gợi ý nhanh */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginLeft: '0.25rem' }}>
            {PRICE_PRESETS.map((preset) => {
              const isPresetActive =
                String(minPrice ?? '') === preset.min && String(maxPrice ?? '') === preset.max;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectPricePreset(preset)}
                  style={{
                    padding: '0.28rem 0.6rem',
                    borderRadius: '9999px',
                    border: isPresetActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: isPresetActive ? '#dbeafe' : '#ffffff',
                    color: isPresetActive ? '#1e40af' : '#64748b',
                    fontSize: '0.75rem',
                    fontWeight: isPresetActive ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bộ lọc tình trạng còn hàng (inStock) */}
        <label
          htmlFor="in-stock-filter-checkbox"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: inStock ? '#15803d' : '#334155',
            backgroundColor: inStock ? '#f0fdf4' : '#f8fafc',
            border: inStock ? '1px solid #86efac' : '1px solid #e2e8f0',
            padding: '0.38rem 0.75rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <input
            id="in-stock-filter-checkbox"
            type="checkbox"
            checked={Boolean(inStock)}
            onChange={(e) => onInStockChange && onInStockChange(e.target.checked)}
            style={{ accentColor: '#16a34a', cursor: 'pointer' }}
          />
          <span>Chỉ hiện sản phẩm còn hàng</span>
        </label>
      </div>

      {/* Thông báo lỗi validation khoảng giá (nếu có) */}
      {validationError && (
        <div
          role="alert"
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: '0.825rem',
            fontWeight: 600
          }}
        >
          ⚠️ {validationError}
        </div>
      )}

      {/* Hàng 3: Dropdown lọc danh mục, Sắp xếp và Thống kê */}
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
            <span
              className="product-result-count"
              style={{ fontSize: '0.825rem', color: '#64748b' }}
            >
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
              onClick={handleResetClick}
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
