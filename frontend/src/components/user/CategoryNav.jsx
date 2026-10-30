import { Link, useSearchParams } from 'react-router-dom';
import { INITIAL_CATEGORIES } from '../../services/mockData';

/**
 * Thanh điều hướng danh mục sản phẩm nhanh dành riêng cho User/Shop (CategoryNav)
 * Chỉ được render trong UserLayout, không xuất hiện trong AdminLayout.
 */
const CategoryNav = ({ categories = INITIAL_CATEGORIES }) => {
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || '';

  return (
    <nav
      className="category-navbar"
      aria-label="Danh mục sản phẩm nhanh"
    >
      <div className="container category-navbar-inner">
        <Link
          to="/products"
          className={`category-nav-pill ${!activeCategory ? 'active' : ''}`}
        >
          Tất cả danh mục
        </Link>
        {categories.map((cat) => {
          const slug = cat.id || cat.slug || cat.name;
          const isActive = String(activeCategory).toLowerCase() === String(slug).toLowerCase();
          return (
            <Link
              key={slug}
              to={`/products?category=${encodeURIComponent(slug)}`}
              className={`category-nav-pill ${isActive ? 'active' : ''}`}
            >
              {cat.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default CategoryNav;

