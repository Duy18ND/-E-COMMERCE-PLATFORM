import { Routes, Route, Navigate } from 'react-router-dom';

// Layout components
import AdminSidebar from '../components/layout/AdminSidebar';

// Route guards
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';

// Customer pages
import Home from '../pages/customer/Home';
import Products from '../pages/customer/Products';
import ProductDetail from '../pages/customer/ProductDetail';
import Cart from '../pages/customer/Cart';
import Checkout from '../pages/customer/Checkout';
import OrderSuccess from '../pages/customer/OrderSuccess';
import Orders from '../pages/customer/Orders';
import OrderDetail from '../pages/customer/OrderDetail';

// Auth pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';

// Admin pages
import AdminDashboard from '../pages/admin/Dashboard';
import AdminProducts from '../pages/admin/Products';
import AdminProductForm from '../pages/admin/ProductForm';
import AdminCategories from '../pages/admin/Categories';
import AdminOrders from '../pages/admin/Orders';
import AdminInventory from '../pages/admin/Inventory';

// Admin Layout wrapper
const AdminLayout = ({ children }) => {
  return (
    <div className="admin-layout" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <AdminSidebar />
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Customer Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/products" element={<Products />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Customer Routes (Yêu cầu đăng nhập) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
      </Route>


      {/* Admin Routes */}
      <Route element={<AdminRoute />}>
        <Route
          path="/admin"
          element={
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/products"
          element={
            <AdminLayout>
              <AdminProducts />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/products/new"
          element={
            <AdminLayout>
              <AdminProductForm />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/products/:id/edit"
          element={
            <AdminLayout>
              <AdminProductForm />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <AdminLayout>
              <AdminCategories />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminLayout>
              <AdminOrders />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/inventory"
          element={
            <AdminLayout>
              <AdminInventory />
            </AdminLayout>
          }
        />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
