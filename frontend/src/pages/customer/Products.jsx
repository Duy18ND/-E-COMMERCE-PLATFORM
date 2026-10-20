import { useState, useEffect } from 'react';
import ProductGrid from '../../components/product/ProductGrid';
import ProductFilter from '../../components/product/ProductFilter';
import ProductSearch from '../../components/product/ProductSearch';
import Loading from '../../components/common/Loading';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  useEffect(() => {
    // Sẵn sàng kết nối với productService.getAll() khi Backend sẵn sàng
    setLoading(true);
    const timer = setTimeout(() => {
      // Dữ liệu mẫu khởi đầu hiển thị cho sinh viên dễ hình dung giao diện
      setProducts([
        { id: '1', name: 'Laptop Dell XPS 13', price: 28990000, category: 'Laptop', stock: 10 },
        { id: '2', name: 'Điện thoại iPhone 15 Pro', price: 27990000, category: 'Điện thoại', stock: 15 },
        { id: '3', name: 'Bàn phím cơ không dây', price: 1850000, category: 'Phụ kiện', stock: 25 },
        { id: '4', name: 'Tai nghe Bluetooth chống ồn', price: 3490000, category: 'Phụ kiện', stock: 8 }
      ]);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedCategory, sortOrder]);

  const handleSearch = (term) => {
    console.log('Tìm kiếm sản phẩm:', term);
  };

  return (
    <div className="container page-container">
      <h1 className="page-title">Danh sách sản phẩm</h1>
      <p className="page-subtitle">Khám phá các sản phẩm công nghệ và phụ kiện mới nhất</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <ProductSearch onSearch={handleSearch} />
      </div>

      <ProductFilter
        categories={['Laptop', 'Điện thoại', 'Phụ kiện']}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        currentSort={sortOrder}
        onSortChange={setSortOrder}
      />

      {loading ? <Loading message="Đang tải danh sách sản phẩm..." /> : <ProductGrid products={products} />}
    </div>
  );
};

export default Products;
