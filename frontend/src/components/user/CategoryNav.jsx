import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { INITIAL_CATEGORIES } from '../../services/mockData';
import categoryService from '../../services/categoryService';
import Icon from '../common/Icons';

/**
 * Thanh điều hướng danh mục sản phẩm nhanh dành riêng cho User/Shop (CategoryNav)
 * Chỉ được render trong UserLayout, không xuất hiện trong AdminLayout.
 */
const CategoryNav = ({ categories: propCategories }) => {
  const [searchParams] = useSearchParams();
  const [loadedCategories, setLoadedCategories] = useState(INITIAL_CATEGORIES);
  const activeCategory = searchParams.get('category') || '';

  useEffect(() => {
    if (Array.isArray(propCategories) && propCategories.length > 0) return undefined;
    let mounted = true;
    categoryService
      .getPublicCategories()
      .then((list) => {
        if (mounted && Array.isArray(list) && list.length > 0) {
          setLoadedCategories(list);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [propCategories]);

  const categories =
    Array.isArray(propCategories) && propCategories.length > 0 ? propCategories : loadedCategories;

  return (
    <nav
      className="category-navbar"
      aria-label="Danh mục sản phẩm nhanh"
    >
      <div className="container category-navbar-inner">
        <Link
          to="/products"
          className={`category-nav-pill ${!activeCategory ? 'active' : ''}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Icon name="layers" size={13} />
          <span>Tất cả danh mục</span>
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

