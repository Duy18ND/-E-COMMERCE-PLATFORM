import { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import UserHeader from '../components/user/UserHeader';
import CategoryNav from '../components/user/CategoryNav';
import Footer from '../components/layout/Footer';
import ErrorMessage from '../components/common/ErrorMessage';
import Loading from '../components/common/Loading';
import ChatbotWidget from '../components/chat/ChatbotWidget';

/**
 * UserLayout — Cấu trúc giao diện dành riêng cho Khách hàng (User/Shop):
 * UserLayout
 * ├── UserHeader
 * ├── CategoryNav
 * ├── UserContent (<Outlet /> hoặc children)
 * └── Footer
 *
 * Riêng trang /login và /register sử dụng Auth Header & Auth Footer tối giản
 * theo chuẩn E-Commerce Auth Layout.
 */
const UserLayout = ({ children }) => {
  const location = useLocation();
  const [accessDeniedMsg, setAccessDeniedMsg] = useState('');

  const isAuthRoute =
    location.pathname === '/login' || location.pathname === '/register';

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

  if (isAuthRoute) {
    return (
      <div className="user-layout-shell auth-layout-shell">
        {accessDeniedMsg && (
          <div className="container" style={{ paddingTop: '0.75rem' }}>
            <ErrorMessage message={accessDeniedMsg} onClose={() => setAccessDeniedMsg('')} />
          </div>
        )}
        <main className="main-content user-main-content auth-main-content">
          <Suspense fallback={<Loading message="Đang tải trang..." />}>
            {children ? children : <Outlet />}
          </Suspense>
        </main>
      </div>
    );
  }

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
        <Suspense fallback={<Loading message="Đang tải trang..." />}>
          <div className="ui-page-enter">
            {children ? children : <Outlet />}
          </div>
        </Suspense>
      </main>

      <Footer />
      <ChatbotWidget />
    </div>
  );
};

export default UserLayout;
