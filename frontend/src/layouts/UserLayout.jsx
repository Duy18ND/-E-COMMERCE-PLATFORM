import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import UserHeader from '../components/user/UserHeader';
import CategoryNav from '../components/user/CategoryNav';
import Footer from '../components/layout/Footer';
import ErrorMessage from '../components/common/ErrorMessage';

/**
 * UserLayout — Cấu trúc giao diện dành riêng cho Khách hàng (User/Shop):
 * UserLayout
 * ├── UserHeader
 * ├── CategoryNav
 * ├── UserContent (<Outlet /> hoặc children)
 * └── Footer
 */
const UserLayout = ({ children }) => {
  const location = useLocation();
  const [accessDeniedMsg, setAccessDeniedMsg] = useState('');

  useEffect(() => {
    if (location.state?.accessDenied) {
      setAccessDeniedMsg(
        location.state.message ||
          'Bạn không có quyền truy cập vào trang vừa yêu cầu! Hệ thống đã chuyển về trang phù hợp với vai trò của bạn.'
      );
    } else {
      setAccessDeniedMsg('');
    }
  }, [location]);

  return (
    <div className="user-layout-shell">
      <UserHeader />
      <CategoryNav />

      <main className="main-content user-main-content">
        {accessDeniedMsg && (
          <div className="container" style={{ paddingTop: '1rem' }}>
            <ErrorMessage message={accessDeniedMsg} onClose={() => setAccessDeniedMsg('')} />
          </div>
        )}
        {children ? children : <Outlet />}
      </main>

      <Footer />
    </div>
  );
};

export default UserLayout;

