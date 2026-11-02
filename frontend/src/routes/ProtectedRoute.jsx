import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, isAdmin, roles, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container page-container" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
        Đang tải phiên xác thực...
      </div>
    );
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
