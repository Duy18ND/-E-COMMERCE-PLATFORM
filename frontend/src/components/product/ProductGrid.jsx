import ProductCard from './ProductCard';
import EmptyState from '../common/EmptyState';

const ProductGrid = ({
  products = [],
  emptyTitle = 'Không tìm thấy sản phẩm nào',
  emptyDescription = 'Thử thay đổi bộ lọc danh mục hoặc tìm kiếm với từ khóa khác.',
  onResetFilter,
  resetText = 'Xem tất cả sản phẩm'
}) => {
  // Bảo vệ an toàn: hỗ trợ cả mảng Array lẫn đối tượng PagedResponse ({ content: [...] }) từ Backend
  const productList = Array.isArray(products)
    ? products
    : Array.isArray(products?.content)
    ? products.content
    : [];

  if (productList.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionText={onResetFilter ? resetText : undefined}
        onAction={onResetFilter}
      />
    );
  }

  return (
    <div className="product-grid ui-stagger">
      {productList.map((product, idx) => (
        <div key={product.id} style={{ '--i': idx, minWidth: 0, height: '100%' }}>
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
};

export default ProductGrid;
