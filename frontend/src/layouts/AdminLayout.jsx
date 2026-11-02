import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminHeader from '../components/admin/AdminHeader';
import AdminSidebar from '../components/admin/AdminSidebar';

/**
 * AdminLayout — Cấu trúc giao diện dành riêng cho Quản trị viên (Admin Portal):
 * AdminLayout
 * ├── AdminHeader
 * ├── AdminSidebar (Desktop: Full | Tablet: Collapsed | Mobile: Drawer)
 * └── AdminContent
 *
 * Tuyệt đối không render CategoryNav của User tại đây.
 */
const AdminLayout = ({ children }) => {
  const location = useLocation();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Tự động đóng Drawer khi chuyển trang trên Mobile
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="admin-layout-shell">
      <AdminHeader
        isMobileDrawerOpen={isMobileDrawerOpen}
        onToggleMobileDrawer={() => setIsMobileDrawerOpen((prev) => !prev)}
      />

      <div className="admin-layout">
        <AdminSidebar
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        />
        <main className="admin-main-content">
          {children ? children : <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

