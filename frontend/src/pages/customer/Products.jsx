import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductGrid from '../../components/product/ProductGrid';
import ProductFilter, { validatePriceRange } from '../../components/product/ProductFilter';
import ProductSearch, { normalizeSearchKeyword } from '../../components/product/ProductSearch';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import Pagination from '../../components/common/Pagination';
import Button from '../../components/common/Button';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import { INITIAL_CATEGORIES } from '../../services/mockData';
import { formatCurrency } from '../../utils/formatCurrency';

const DEFAULT_PAGE_SIZE = 8;

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCategory = searchParams.get('category') || searchParams.get('categoryId') || '';
  const initialSearch = normalizeSearchKeyword(
    searchParams.get('search') || searchParams.get('keyword') || ''
  );
  const initialMinPrice = searchParams.get('minPrice') || '';
  const initialMaxPrice = searchParams.get('maxPrice') || '';
  const initialInStock = searchParams.get('inStock') === 'true';
  const initialSort = searchParams.get('sort') || '';
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [inStock, setInStock] = useState(initialInStock);
  const [sortOrder, setSortOrder] = useState(initialSort);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [totalItems, setTotalItems] = useState(0);

  // Bộ đếm request giúp chống race-condition: bỏ qua kết quả của request cũ nếu có request mới hơn
  const latestRequestIdRef = useRef(0);

  // Đồng bộ state khi URL query params thay đổi (ví dụ: bấm từ Header hoặc trang chủ Home)
  useEffect(() => {
    const urlCategory = searchParams.get('category') || searchParams.get('categoryId') || '';
    const urlSearch = normalizeSearchKeyword(
      searchParams.get('search') || searchParams.get('keyword') || ''
    );
    const urlMinPrice = searchParams.get('minPrice') || '';
    const urlMaxPrice = searchParams.get('maxPrice') || '';
    const urlInStock = searchParams.get('inStock') === 'true';
    const urlSort = searchParams.get('sort') || '';
    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

    setSelectedCategory(urlCategory);
    setSearchTerm(urlSearch);
    setMinPrice(urlMinPrice);
    setMaxPrice(urlMaxPrice);
    setInStock(urlInStock);
    setSortOrder(urlSort);
    setCurrentPage(urlPage);
  }, [searchParams]);

  // Nạp danh sách danh mục từ API GET /api/v1/products/categories
  useEffect(() => {
    let active = true;
    categoryService
      .getPublicCategories()
      .then((catData) => {
        if (active && Array.isArray(catData) && catData.length > 0) {
          setCategories(catData);
        }
      })
      .catch(() => {
        if (active) {
          setCategories(INITIAL_CATEGORIES);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Gọi API danh sách sản phẩm có lọc danh mục, từ khóa, khoảng giá, tồn kho, sắp xếp và phân trang
  const fetchProductCatalog = useCallback(async () => {
    // Kiểm tra hợp lệ khoảng giá trước khi gọi API
    const priceValidation = validatePriceRange(minPrice, maxPrice);
    if (!priceValidation.valid) {
      setError(priceValidation.error);
      setLoading(false);
      return;
    }

    const requestId = ++latestRequestIdRef.current;
    setLoading(true);
    setError('');

    const simulateError = searchParams.get('simulateError') === 'true';
    const strictApi = searchParams.get('strictApi') === 'true';

    try {
      const response = await productService.getCatalog({
        category: selectedCategory,
        search: searchTerm,
        minPrice,
        maxPrice,
        inStock,
        sortOrder,
        currentPage,
        itemsPerPage,
        simulateError,
        rejectOnError: strictApi
      });

      // Nếu đã có request mới hơn được gửi đi, bỏ qua kết quả cũ này (ECOM-227 4.1)
      if (requestId !== latestRequestIdRef.current) {
        return;
      }

      setProducts(response.content || []);
      setTotalItems(Number(response.totalElements ?? response.content?.length ?? 0));
    } catch (err) {
      if (requestId !== latestRequestIdRef.current) {
        return;
      }
      setError(
        err?.message || 'Đã xảy ra lỗi khi tải danh sách sản phẩm từ máy chủ. Vui lòng thử lại!'
      );
      setProducts([]);
      setTotalItems(0);
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    selectedCategory,
    searchTerm,
    minPrice,
    maxPrice,
    inStock,
    sortOrder,
    currentPage,
    itemsPerPage,
    searchParams
  ]);

  useEffect(() => {
    fetchProductCatalog();
  }, [fetchProductCatalog]);

  // Helper cập nhật URL query params đồng bộ, giữ nguyên các điều kiện lọc khi chuyển trang
  const updateUrlParams = (updates = {}) => {
    const nextCategory =
      updates.category !== undefined ? updates.category : selectedCategory;
    const nextSearch =
      updates.search !== undefined ? updates.search : searchTerm;
    const nextMinPrice =
      updates.minPrice !== undefined ? updates.minPrice : minPrice;
    const nextMaxPrice =
      updates.maxPrice !== undefined ? updates.maxPrice : maxPrice;
    const nextInStock =
      updates.inStock !== undefined ? updates.inStock : inStock;
    const nextSort =
      updates.sort !== undefined ? updates.sort : sortOrder;
    const nextPage =
      updates.page !== undefined ? updates.page : currentPage;

    const nextParams = {};
    if (nextCategory) nextParams.category = String(nextCategory);
    if (nextSearch) nextParams.search = String(nextSearch);
    if (String(nextMinPrice ?? '').trim() !== '') nextParams.minPrice = String(nextMinPrice);
    if (String(nextMaxPrice ?? '').trim() !== '') nextParams.maxPrice = String(nextMaxPrice);
    if (nextInStock) nextParams.inStock = 'true';
    if (nextSort) nextParams.sort = String(nextSort);
    if (nextPage > 1) nextParams.page = String(nextPage);

    setSearchParams(nextParams, { replace: true });
  };

  // Đổi danh mục -> tự động reset phân trang về trang 1 (TC-106-06, TC-106-12, FILTER-01)
  const handleSelectCategory = (categoryValue) => {
    setSelectedCategory(categoryValue);
    setCurrentPage(1);
    updateUrlParams({ category: categoryValue, page: 1 });
  };

  // Tìm kiếm từ khóa -> tự động reset phân trang về trang 1 (SEARCH-01..04)
  const handleSearch = (term) => {
    const cleaned = normalizeSearchKeyword(term);
    setSearchTerm(cleaned);
    setCurrentPage(1);
    updateUrlParams({ search: cleaned, page: 1 });
  };

  // Lọc theo khoảng giá -> tự động reset phân trang về trang 1 (FILTER-02)
  const handlePriceRangeChange = ({ minPrice: nextMin = '', maxPrice: nextMax = '' }) => {
    setMinPrice(nextMin);
    setMaxPrice(nextMax);
    setCurrentPage(1);
    updateUrlParams({ minPrice: nextMin, maxPrice: nextMax, page: 1 });
  };

  // Lọc theo tình trạng tồn kho -> tự động reset phân trang về trang 1 (FILTER-03)
  const handleInStockChange = (checked) => {
    const nextInStock = Boolean(checked);
    setInStock(nextInStock);
    setCurrentPage(1);
    updateUrlParams({ inStock: nextInStock, page: 1 });
  };

  // Đổi thứ tự sắp xếp -> tự động reset phân trang về trang 1 (SORT-01..03)
  const handleSortChange = (newSort) => {
    setSortOrder(newSort);
    setCurrentPage(1);
    updateUrlParams({ sort: newSort, page: 1 });
  };

  // Chuyển trang Trước / Sau / Số trang giữ nguyên bộ lọc & sắp xếp (TC-106-09..11, RESULT-06)
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    updateUrlParams({ page: newPage });
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Đổi số lượng sản phẩm trên mỗi trang
  const handleItemsPerPageChange = (newSize) => {
    setItemsPerPage(newSize);
    setCurrentPage(1);
    updateUrlParams({ page: 1 });
  };

  // Đặt lại toàn bộ bộ lọc, từ khóa và sắp xếp (FILTER-05, RESULT-03)
  const handleResetFilters = () => {
    setSelectedCategory('');
    setSearchTerm('');
    setMinPrice('');
    setMaxPrice('');
    setInStock(false);
    setSortOrder('');
    setError('');
    setCurrentPage(1);
    setSearchParams({}, { replace: true });
  };

  const activeCategoryObj = categories.find(
    (c) =>
      String(c.id).toLowerCase() === String(selectedCategory).toLowerCase() ||
      String(c.name).toLowerCase() === String(selectedCategory).toLowerCase()
  );

  const hasAnyActiveCriteria = Boolean(
    searchTerm ||
      selectedCategory ||
      String(minPrice).trim() !== '' ||
      String(maxPrice).trim() !== '' ||
      inStock ||
      sortOrder
  );

  return (
    <div className="container page-container">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}
      >
        <div>
          <h1 className="page-title">
            {activeCategoryObj ? activeCategoryObj.name : 'Danh sách sản phẩm'}
          </h1>
          <p className="page-subtitle">
            {activeCategoryObj
              ? activeCategoryObj.description || activeCategoryObj.desc
              : 'Khám phá các sản phẩm công nghệ và phụ kiện chính hãng mới nhất'}
          </p>
        </div>

        <ProductSearch initialValue={searchTerm} onSearch={handleSearch} />
      </div>

      <ProductFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onPriceRangeChange={handlePriceRangeChange}
        inStock={inStock}
        onInStockChange={handleInStockChange}
        currentSort={sortOrder}
        onSortChange={handleSortChange}
        onReset={handleResetFilters}
        totalCount={totalItems}
        searchTerm={searchTerm}
      />

      {/* Thanh hiển thị các điều kiện lọc đang áp dụng (ECOM-227) */}
      {hasAnyActiveCriteria && (
        <div
          className="active-filter-tags"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem'
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
            Đang lọc theo:
          </span>
          {searchTerm && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                fontSize: '0.78rem',
                fontWeight: 600
              }}
            >
              Từ khóa: &ldquo;{searchTerm}&rdquo;
              <button
                type="button"
                onClick={() => handleSearch('')}
                aria-label="Xóa lọc từ khóa"
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#1d4ed8',
                  cursor: 'pointer',
                  fontWeight: 700,
                  padding: 0
                }}
              >
                &times;
              </button>
            </span>
          )}
          {selectedCategory && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                color: '#0369a1',
                fontSize: '0.78rem',
                fontWeight: 600
              }}
            >
              Danh mục: {activeCategoryObj ? activeCategoryObj.name : selectedCategory}
              <button
                type="button"
                onClick={() => handleSelectCategory('')}
                aria-label="Xóa lọc danh mục"
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#0369a1',
                  cursor: 'pointer',
                  fontWeight: 700,
                  padding: 0
                }}
              >
                &times;
              </button>
            </span>
          )}
          {(String(minPrice).trim() !== '' || String(maxPrice).trim() !== '') && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                backgroundColor: '#fefce8',
                border: '1px solid #fde047',
                color: '#a16207',
                fontSize: '0.78rem',
                fontWeight: 600
              }}
            >
              Giá:{' '}
              {String(minPrice).trim() !== '' ? formatCurrency(Number(minPrice)) : '0 ₫'} -{' '}
              {String(maxPrice).trim() !== '' ? formatCurrency(Number(maxPrice)) : 'Trở lên'}
              <button
                type="button"
                onClick={() => handlePriceRangeChange({ minPrice: '', maxPrice: '' })}
                aria-label="Xóa lọc khoảng giá"
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#a16207',
                  cursor: 'pointer',
                  fontWeight: 700,
                  padding: 0
                }}
              >
                &times;
              </button>
            </span>
          )}
          {inStock && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #86efac',
                color: '#15803d',
                fontSize: '0.78rem',
                fontWeight: 600
              }}
            >
              Còn hàng
              <button
                type="button"
                onClick={() => handleInStockChange(false)}
                aria-label="Xóa lọc tồn kho"
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#15803d',
                  cursor: 'pointer',
                  fontWeight: 700,
                  padding: 0
                }}
              >
                &times;
              </button>
            </span>
          )}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '1.5rem' }}>
          <ErrorMessage message={error} onClose={() => setError('')} />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="primary" onClick={fetchProductCatalog}>
              Thử tải lại dữ liệu
            </Button>
            <Button variant="secondary" onClick={handleResetFilters}>
              Quay về mặc định
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <Loading message="Đang tải danh sách sản phẩm..." />
      ) : !error ? (
        <>
          <ProductGrid
            products={products}
            emptyTitle="Không tìm thấy sản phẩm phù hợp"
            emptyDescription={
              hasAnyActiveCriteria
                ? `Không có sản phẩm nào khớp với điều kiện tìm kiếm/bộ lọc hiện tại${
                    searchTerm ? ` (từ khóa: "${searchTerm}")` : ''
                  }. Hãy thử điều chỉnh khoảng giá, chọn danh mục khác hoặc xóa bộ lọc.`
                : 'Hiện tại danh mục này chưa có sản phẩm nào được mở bán.'
            }
            onResetFilter={handleResetFilters}
            resetText="Xóa bộ lọc & Xem tất cả"
          />

          {totalItems > 0 && products.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={[4, 8, 12, 20]}
                unitName="sản phẩm"
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
                style={{
                  borderRadius: '1rem',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
                }}
              />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default Products;
