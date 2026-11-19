import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Loading from '../components/common/Loading';

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, isAdmin, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading message="Đang tải phiên xác thực..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const userRoles = Array.isArray(roles) ? roles : [];
    const hasRequiredRole = allowedRoles.some(
      (allowed) =>
        userRoles.includes(allowed) ||
        userRoles.includes(`ROLE_${allowed}`) ||
        (allowed === 'ROLE_ADMIN' && isAdmin)
    );

    if (!hasRequiredRole) {
      return (
        <Navigate
          to={isAdmin ? '/admin' : '/'}
          state={{ accessDenied: true, from: location }}
          replace
        />
      );
    }
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
