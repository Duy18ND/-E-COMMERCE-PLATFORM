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
    <div
      className="product-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '1.5rem'
      }}
    >
      {productList.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export default ProductGrid;
