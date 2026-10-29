import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductGrid from '../../components/product/ProductGrid';
import ProductFilter from '../../components/product/ProductFilter';
import ProductSearch from '../../components/product/ProductSearch';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import Pagination from '../../components/common/Pagination';
import Button from '../../components/common/Button';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import { INITIAL_CATEGORIES } from '../../services/mockData';

const DEFAULT_PAGE_SIZE = 8;

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCategory = searchParams.get('category') || '';
  const initialSearch = searchParams.get('search') || '';
  const initialSort = searchParams.get('sort') || '';
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [sortOrder, setSortOrder] = useState(initialSort);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [totalItems, setTotalItems] = useState(0);

  // Đồng bộ state khi URL query params thay đổi (ví dụ: bấm từ Header hoặc trang chủ Home)
  useEffect(() => {
    const urlCategory = searchParams.get('category') || '';
    const urlSearch = searchParams.get('search') || '';
    const urlSort = searchParams.get('sort') || '';
    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

    setSelectedCategory(urlCategory);
    setSearchTerm(urlSearch);
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

  // Gọi API danh sách sản phẩm có lọc danh mục, tìm kiếm, sắp xếp và phân trang
  const fetchProductCatalog = useCallback(async () => {
    setLoading(true);
    setError('');

    const simulateError = searchParams.get('simulateError') === 'true';

    try {
      const response = await productService.getCatalog({
        category: selectedCategory,
        search: searchTerm,
        sortOrder,
        currentPage,
        itemsPerPage,
        simulateError
      });

      setProducts(response.content || []);
      setTotalItems(Number(response.totalElements ?? response.content?.length ?? 0));
    } catch (err) {
      setError(
        err?.message || 'Đã xảy ra lỗi khi tải danh sách sản phẩm từ máy chủ. Vui lòng thử lại!'
      );
      setProducts([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm, sortOrder, currentPage, itemsPerPage, searchParams]);

  useEffect(() => {
    fetchProductCatalog();
  }, [fetchProductCatalog]);

  // Helper cập nhật URL query params đồng bộ
  const updateUrlParams = (updates = {}) => {
    const nextCategory =
      updates.category !== undefined ? updates.category : selectedCategory;
    const nextSearch = updates.search !== undefined ? updates.search : searchTerm;
    const nextSort = updates.sort !== undefined ? updates.sort : sortOrder;
    const nextPage = updates.page !== undefined ? updates.page : currentPage;

    const nextParams = {};
    if (nextCategory) nextParams.category = nextCategory;
    if (nextSearch) nextParams.search = nextSearch;
    if (nextSort) nextParams.sort = nextSort;
    if (nextPage > 1) nextParams.page = String(nextPage);

    setSearchParams(nextParams, { replace: true });
  };

  // Đổi danh mục -> tự động reset phân trang về trang 1 (TC-106-06, TC-106-12)
  const handleSelectCategory = (categoryValue) => {
    setSelectedCategory(categoryValue);
    setCurrentPage(1);
    updateUrlParams({ category: categoryValue, page: 1 });
  };

  // Tìm kiếm từ khóa -> tự động reset phân trang về trang 1
  const handleSearch = (term) => {
    const cleaned = (term || '').trim();
    setSearchTerm(cleaned);
    setCurrentPage(1);
    updateUrlParams({ search: cleaned, page: 1 });
  };

  // Đổi thứ tự sắp xếp -> tự động reset phân trang về trang 1
  const handleSortChange = (newSort) => {
    setSortOrder(newSort);
    setCurrentPage(1);
    updateUrlParams({ sort: newSort, page: 1 });
  };

  // Chuyển trang Trước / Sau / Số trang (TC-106-09, TC-106-10, TC-106-11)
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

  // Đặt lại toàn bộ bộ lọc và tìm kiếm
  const handleResetFilters = () => {
    setSelectedCategory('');
    setSearchTerm('');
    setSortOrder('');
    setCurrentPage(1);
    setSearchParams({}, { replace: true });
  };

  const activeCategoryObj = categories.find(
    (c) =>
      String(c.id).toLowerCase() === String(selectedCategory).toLowerCase() ||
      String(c.name).toLowerCase() === String(selectedCategory).toLowerCase()
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
        currentSort={sortOrder}
        onSortChange={handleSortChange}
        onReset={handleResetFilters}
        totalCount={totalItems}
      />

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
      ) : (
        <>
          <ProductGrid
            products={products}
            emptyTitle="Không tìm thấy sản phẩm phù hợp"
            emptyDescription={
              searchTerm || selectedCategory
                ? `Không có sản phẩm nào khớp với bộ lọc hiện tại${
                    searchTerm ? ` (từ khóa: "${searchTerm}")` : ''
                  }. Hãy thử chọn danh mục khác hoặc xóa bộ lọc.`
                : 'Hiện tại danh mục này chưa có sản phẩm nào được mở bán.'
            }
            onResetFilter={
              searchTerm || selectedCategory || sortOrder ? handleResetFilters : undefined
            }
            resetText="Xóa bộ lọc & Xem tất cả"
          />

          {totalItems > 0 && (
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
      )}
    </div>
  );
};

export default Products;
