import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { INITIAL_CATEGORIES } from '../../services/mockData';
import categoryService from '../../services/categoryService';
import Icon from '../common/Icons';

const resolveCategoryPillIcon = (slug = '') => {
  const s = String(slug).toLowerCase();
  if (s.includes('phone') || s.includes('điện thoại') || s === '1') return 'smartphone';
  if (s.includes('laptop') || s === '2') return 'laptop';
  if (s.includes('access') || s.includes('phụ kiện') || s === '3') return 'headphones';
  return 'sparkles';
};

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
        <div className="category-navbar-pills">
          <Link
            to="/products"
            className={`category-nav-pill ${!activeCategory ? 'active' : ''}`}
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
                <Icon name={resolveCategoryPillIcon(slug)} size={13} />
                <span>{cat.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="category-navbar-perks" aria-hidden="true">
          <span className="category-perk-item">
            <Icon name="shield" size={13} color="#2563eb" />
            <span>Chính hãng 100%</span>
          </span>
          <span className="category-perk-dot">•</span>
          <span className="category-perk-item">
            <Icon name="truck" size={13} color="#16a34a" />
            <span>Giao nhanh toàn quốc</span>
          </span>
        </div>
      </div>
    </nav>
  );
};

export default CategoryNav;

