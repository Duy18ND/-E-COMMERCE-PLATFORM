# E-Commerce Platform - Frontend ReactJS

Dự án Frontend cho nền tảng thương mại điện tử **E-Commerce Platform** được xây dựng bằng **ReactJS, Vite, React Router, Axios** và kiến trúc Component hướng module hóa.

---

## 1. Công nghệ sử dụng

- **ReactJS 18** (JavaScript thuần, không TypeScript)
- **Vite** (Build tool & Dev server siêu tốc)
- **React Router v6** (Điều hướng trang SPA)
- **Axios** (HTTP client kết nối REST API)
- **CSS thuần** (Thiết kế hiện đại, tùy biến với CSS Variables)
- **React Context API** (Quản lý trạng thái Auth và Giỏ hàng toàn cục)

---

## 2. Cấu trúc thư mục

```text
frontend/
├── public/
│   └── images/
│
├── src/
│   ├── assets/
│   │   ├── images/
│   │   └── icons/
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Loading.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   └── ErrorMessage.jsx
│   │   │
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── AdminSidebar.jsx
│   │   │
│   │   ├── product/
│   │   │   ├── ProductCard.jsx
│   │   │   ├── ProductGrid.jsx
│   │   │   ├── ProductFilter.jsx
│   │   │   └── ProductSearch.jsx
│   │   │
│   │   ├── cart/
│   │   │   ├── CartItem.jsx
│   │   │   └── CartSummary.jsx
│   │   │
│   │   └── order/
│   │       ├── OrderItem.jsx
│   │       └── OrderStatus.jsx
│   │
│   ├── pages/
│   │   ├── customer/
│   │   │   ├── Home.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── ProductDetail.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── OrderSuccess.jsx
│   │   │   ├── Orders.jsx
│   │   │   └── OrderDetail.jsx
│   │   │
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   │
│   │   └── admin/
│   │       ├── Dashboard.jsx
│   │       ├── Products.jsx
│   │       ├── ProductForm.jsx
│   │       ├── Categories.jsx
│   │       ├── Orders.jsx
│   │       └── Inventory.jsx
│   │
│   ├── services/
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── productService.js
│   │   ├── categoryService.js
│   │   ├── cartService.js
│   │   ├── orderService.js
│   │   └── inventoryService.js
│   │
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── CartContext.jsx
│   │
│   ├── hooks/
│   │   ├── useAuth.js
│   │   └── useCart.js
│   │
│   ├── routes/
│   │   ├── AppRoutes.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── AdminRoute.jsx
│   │
│   ├── utils/
│   │   ├── auth.js
│   │   ├── formatCurrency.js
│   │   └── constants.js
│   │
│   ├── styles/
│   │   ├── global.css
│   │   ├── variables.css
│   │   └── responsive.css
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── .env
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 3. Danh sách Routes

### Phía Khách hàng (Customer)
| Đường dẫn | Trang | Mô tả |
| :--- | :--- | :--- |
| `/` | `Home.jsx` | Trang chủ giới thiệu & banner |
| `/products` | `Products.jsx` | Danh sách sản phẩm, lọc & tìm kiếm |
| `/products/:id` | `ProductDetail.jsx` | Chi tiết sản phẩm & thêm giỏ hàng |
| `/login` | `Login.jsx` | Đăng nhập tài khoản |
| `/register` | `Register.jsx` | Đăng ký tài khoản mới |
| `/cart` | `Cart.jsx` | Xem và điều chỉnh giỏ hàng |
| `/checkout` | `Checkout.jsx` | Điền thông tin giao hàng & đặt hàng (Yêu cầu đăng nhập) |
| `/order-success` | `OrderSuccess.jsx` | Thông báo đặt hàng thành công (Yêu cầu đăng nhập) |
| `/orders` | `Orders.jsx` | Lịch sử các đơn hàng đã đặt (Yêu cầu đăng nhập) |
| `/orders/:id` | `OrderDetail.jsx` | Chi tiết một đơn hàng cụ thể (Yêu cầu đăng nhập) |

### Phía Quản trị (Admin)
| Đường dẫn | Trang | Mô tả |
| :--- | :--- | :--- |
| `/admin` | `Dashboard.jsx` | Bảng điều khiển tổng quan thống kê |
| `/admin/products` | `Products.jsx` | Quản lý danh sách sản phẩm |
| `/admin/products/new` | `ProductForm.jsx` | Thêm sản phẩm mới |
| `/admin/products/:id/edit` | `ProductForm.jsx` | Cập nhật thông tin sản phẩm |
| `/admin/categories` | `Categories.jsx` | Quản lý danh mục sản phẩm |
| `/admin/orders` | `Orders.jsx` | Quản lý và duyệt đơn hàng |
| `/admin/inventory` | `Inventory.jsx` | Theo dõi tồn kho và nhập hàng |

---

## 4. Hướng dẫn cài đặt & Khởi chạy

### Bước 1: Cài đặt các gói phụ thuộc (Dependencies)
```bash
npm install
```

### Bước 2: Thiết lập biến môi trường
File `.env` đã được thiết lập sẵn:
```env
VITE_API_URL=http://localhost:8080/api
```

### Bước 3: Chạy môi trường phát triển (Development)
```bash
npm run dev
```
Ứng dụng sẽ chạy tại địa chỉ: `http://localhost:3000` (hoặc cổng tương ứng hiển thị trên terminal).

---

## 5. Kết nối Backend Spring Boot REST API sau này

- File `src/services/api.js` đã được cấu hình sẵn Axios instance với `baseURL: import.meta.env.VITE_API_URL`.
- Tự động đính kèm JWT Token vào request header: `Authorization: Bearer <token>` thông qua Axios Interceptors.
- Các file trong `src/services/` (`authService.js`, `productService.js`, ...) đã chuẩn bị sẵn phương thức CRUD tương ứng.
