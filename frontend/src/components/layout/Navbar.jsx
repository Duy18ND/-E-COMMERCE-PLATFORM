import { Link, useSearchParams } from 'react-router-dom';
import { INITIAL_CATEGORIES } from '../../services/mockData';

/**
 * Thanh điều hướng danh mục sản phẩm nhanh (Quick Category Navbar – ECOM-109)
 */
const Navbar = ({ categories = INITIAL_CATEGORIES }) => {
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || '';

  return (
    <nav
      aria-label="Danh mục sản phẩm nhanh"
      style={{
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        padding: '0.5rem 0'
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}
      >
        <Link
          to="/products"
          style={{
            fontSize: '0.82rem',
            fontWeight: !activeCategory ? 700 : 600,
            color: !activeCategory ? '#2563eb' : '#475569',
            padding: '0.25rem 0.7rem',
            borderRadius: '9999px',
            backgroundColor: !activeCategory ? '#eff6ff' : 'transparent',
            textDecoration: 'none'
          }}
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
              style={{
                fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#2563eb' : '#475569',
                padding: '0.25rem 0.7rem',
                borderRadius: '9999px',
                backgroundColor: isActive ? '#eff6ff' : 'transparent',
                textDecoration: 'none'
              }}
            >
              {cat.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar;
