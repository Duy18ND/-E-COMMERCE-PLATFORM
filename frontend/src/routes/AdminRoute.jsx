import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Loading from '../components/common/Loading';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading message="Đang kiểm tra quyền quản trị..." />;
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
