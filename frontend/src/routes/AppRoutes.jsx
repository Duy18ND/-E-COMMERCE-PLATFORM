import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts (Tách biệt hoàn toàn UserLayout và AdminLayout)
import UserLayout from '../layouts/UserLayout';
import AdminLayout from '../layouts/AdminLayout';

// Route guards & Fallback UI
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import Loading from '../components/common/Loading';

// Customer pages (Code Splitting qua React.lazy)
const Home = React.lazy(() => import('../pages/customer/Home'));
const Products = React.lazy(() => import('../pages/customer/Products'));
const ProductDetail = React.lazy(() => import('../pages/customer/ProductDetail'));
const FlashSale = React.lazy(() => import('../pages/customer/FlashSale'));
const Cart = React.lazy(() => import('../pages/customer/Cart'));
const Checkout = React.lazy(() => import('../pages/customer/Checkout'));
const OrderSuccess = React.lazy(() => import('../pages/customer/OrderSuccess'));
const Orders = React.lazy(() => import('../pages/customer/Orders'));
const OrderDetail = React.lazy(() => import('../pages/customer/OrderDetail'));
// Lazy-loaded OrderTracking (replaces static: import OrderTracking from '../pages/customer/OrderTracking')
const OrderTracking = React.lazy(() => import('../pages/customer/OrderTracking'));
const Vouchers = React.lazy(() => import('../pages/customer/Vouchers'));
const MyVouchers = React.lazy(() => import('../pages/customer/MyVouchers'));

// Auth pages (Code Splitting qua React.lazy)
const Login = React.lazy(() => import('../pages/auth/Login'));
const Register = React.lazy(() => import('../pages/auth/Register'));

// Admin pages (Code Splitting qua React.lazy)
const AdminDashboard = React.lazy(() => import('../pages/admin/Dashboard'));
const AdminProducts = React.lazy(() => import('../pages/admin/Products'));
const AdminProductForm = React.lazy(() => import('../pages/admin/ProductForm'));
const AdminCategories = React.lazy(() => import('../pages/admin/Categories'));
const AdminOrders = React.lazy(() => import('../pages/admin/Orders'));
const AdminInventory = React.lazy(() => import('../pages/admin/Inventory'));
const AdminSales = React.lazy(() => import('../pages/admin/AdminSales'));
const AdminSaleForm = React.lazy(() => import('../pages/admin/AdminSaleForm'));
const AdminVouchers = React.lazy(() => import('../pages/admin/AdminVouchers'));
const AdminUsers = React.lazy(() => import('../pages/admin/AdminUsers'));
const AdminReviews = React.lazy(() => import('../pages/admin/AdminReviews'));

const AppRoutes = () => {
  return (
    <Suspense fallback={<Loading message="Đang tải trang..." />}>
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
          <Route path="/orders/:id/tracking" element={<OrderTracking />} />
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
        {/* Admin Users (Customer Management) */}
        <Route
          path="/admin/users"
          element={
            <AdminLayout>
              <AdminUsers />
            </AdminLayout>
          }
        />
        {/* Admin Reviews (Quản lý & kiểm duyệt đánh giá sản phẩm) */}
        <Route
          path="/admin/reviews"
          element={
            <AdminLayout>
              <AdminReviews />
            </AdminLayout>
          }
        />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
