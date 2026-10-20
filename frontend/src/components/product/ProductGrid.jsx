import ProductCard from './ProductCard';
import EmptyState from '../common/EmptyState';

const ProductGrid = ({ products = [] }) => {
  if (!products || products.length === 0) {
    return <EmptyState title="Không tìm thấy sản phẩm nào" description="Thử thay đổi bộ lọc hoặc tìm kiếm từ khóa khác." />;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '1.5rem'
      }}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export default ProductGrid;
