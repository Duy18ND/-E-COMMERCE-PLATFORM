import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts (Tách biệt hoàn toàn UserLayout và AdminLayout)
import UserLayout from '../layouts/UserLayout';
import AdminLayout from '../layouts/AdminLayout';

// Route guards
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';

// Customer pages
import Home from '../pages/customer/Home';
import Products from '../pages/customer/Products';
import ProductDetail from '../pages/customer/ProductDetail';
import FlashSale from '../pages/customer/FlashSale';
import Cart from '../pages/customer/Cart';
import Checkout from '../pages/customer/Checkout';
import OrderSuccess from '../pages/customer/OrderSuccess';
import Orders from '../pages/customer/Orders';
import OrderDetail from '../pages/customer/OrderDetail';
import Vouchers from '../pages/customer/Vouchers';
import MyVouchers from '../pages/customer/MyVouchers';

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
import AdminSales from '../pages/admin/AdminSales';
import AdminSaleForm from '../pages/admin/AdminSaleForm';
import AdminVouchers from '../pages/admin/AdminVouchers';

const AppRoutes = () => {
  return (
    <Routes>
      {/* =========================================================
          USER LAYOUT (UserHeader + CategoryNav + UserContent + Footer)
         ========================================================= */}
      <Route element={<UserLayout />}>
        {/* Public Customer Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/flash-sale" element={<FlashSale />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/vouchers" element={<Vouchers />} />
        <Route path="/my-vouchers" element={<MyVouchers />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Customer Routes (Yêu cầu đăng nhập) */}
        <Route element={<ProtectedRoute allowedRoles={['ROLE_USER']} />}>
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
        </Route>
      </Route>

      {/* =========================================================
          ADMIN LAYOUT (AdminHeader + AdminSidebar + AdminContent)
          Không có CategoryNav của User
         ========================================================= */}
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

        {/* Admin Sales & Promotion Management Routes */}
        <Route
          path="/admin/sales"
          element={
            <AdminLayout>
              <AdminSales />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/sales/new"
          element={
            <AdminLayout>
              <AdminSaleForm />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/sales/:id/edit"
          element={
            <AdminLayout>
              <AdminSaleForm />
            </AdminLayout>
          }
        />
        {/* Admin Vouchers */}
        <Route
          path="/admin/vouchers"
          element={
            <AdminLayout>
              <AdminVouchers />
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
