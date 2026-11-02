import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container page-container" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
        Đang kiểm tra quyền quản trị...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <Navigate
        to="/"
        state={{
          accessDenied: true,
          message: 'Bạn không có quyền truy cập vào khu vực Quản trị viên (Admin)!',
          from: location
        }}
        replace
      />
    );
  }

  return children ? children : <Outlet />;
};

export default AdminRoute;
