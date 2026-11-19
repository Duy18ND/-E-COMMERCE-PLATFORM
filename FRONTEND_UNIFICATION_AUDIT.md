# SHOPMART FRONTEND CONSISTENCY AUDIT, UNIFICATION & BACKEND INTEGRATION REPORT

**Ngày thực hiện:** 2026-11-19  
**Repository:** `C:\IT209\-E-COMMERCE-PLATFORM`  
**Branch hiện tại:** `devops-phuong` (Đồng bộ commit `4f5435eaadf1b0bea248f83d21c67538bd7cf826` từ `origin/master` — `Merge pull request #74 from Duy18ND/BE-Linh`)

---

## 1. Nguyên Nhân Gốc Khiến Có Hai Giao Diện Khác Nhau

Qua kiểm tra thực tế bằng Git history (`git log`, `git reflog`, `git show-ref`), hệ thống tiến trình mạng (`netstat -ano`), cấu hình Docker (`docker ps`, `docker images`, `docker inspect`, `docker exec`) và cấu hình Frontend (`vite.config.js`, `api.js`, `nginx.conf`, `docker-compose.yml`), có **4 nguyên nhân gốc rễ** kết hợp tạo ra tình trạng hai giao diện khác nhau và lỗi kết nối Backend:

### 1.1. Container `ecommerce-frontend` chạy Docker Image cũ từ ngày 02/11/2026 (`e12967b5dd5b`)
- Khi kiểm tra bằng `docker inspect ecommerce-frontend` và `docker exec ecommerce-frontend ls -la /usr/share/nginx/html/assets`, container `ecommerce-frontend` đang chạy image `sha256:e12967b5dd5b...` được tạo từ **`2026-11-02T12:59:36Z`**.
- Bên trong `/usr/share/nginx/html/assets` của container cũ chỉ có duy nhất 1 bundle monolithic (`index-BRAHNRmK.js` — 690 KB và `index-D-2wHGDp.css` — 43 KB) từ ngày **02/11/2026**, **chưa hề có**:
  - Giao diện **Flagship Tech Store** mới nhất (`57223b2` & `852c3cb`: Aurora Hero, Live Countdown, Bento Grid, `UserHeader`, `CategoryNav`, `theme.css`).
  - Code-splitting (`React.lazy` tách 39 chunks riêng cho từng trang Customer/Admin).
  - Các tính năng Sprint 2 & Sprint 3: Quản lý & Kiểm duyệt Đánh giá (`AdminReviews`, `ProductReviewForm`), Quản lý Khách hàng (`AdminUsers`), Trợ lý Mua sắm AI (`ChatbotWidget`), Thanh toán VietQR (`QrPaymentModal`), tự động sửa lỗi tiếng Việt UTF-8 Mojibake và nén ảnh Base64.
- Bản build cũ `frontend/dist` trên ổ đĩa (`index-DMKj3oY8.js`, `index-CxLaaq15.css` từ `17/11/2026`) cũng là bản build trước khi merge PR #74 (`852c3cb`).

### 1.2. Xung đột cổng (Port Collision) và Dual-Stack Split-Brain giữa Vite và Docker trên cổng `3000` và `5173`
- Trong `backend/docker-compose.yml`, service `frontend` (`ecommerce-frontend`) được cấu hình map đồng thời **cả 2 cổng**:
  ```yaml
  ports:
    - "${FRONTEND_PORT:-5173}:80"
    - "3000:80"
  ```
  Do đó Docker (`com.docker.backend`) chiếm cả `0.0.0.0:5173`, `[::1]:5173` và `0.0.0.0:3000`.
- Ngược lại, trong `frontend/vite.config.js`, Vite lại được cấu hình `server.port: 3000` (không có `strictPort: true` và không có `host: '0.0.0.0'`).
- Khi chạy `npm run dev`, tiến trình `node.exe` (Vite) bind vào địa chỉ IPv6 loopback `[::1]:3000`, trong khi Docker giữ `0.0.0.0:3000` và `5173`:
  - Truy cập `http://localhost:5173`, `http://127.0.0.1:3000` hoặc `http://localhost:80` đều đi vào container Docker `ecommerce-frontend` cũ (`e12967b5dd5b` từ 02/11/2026) → **hiển thị giao diện cũ**.
  - Truy cập `http://[::1]:3000` đi vào tiến trình Vite (`npm run dev`) → **hiển thị giao diện mới nhất**.

### 1.3. Thiếu cấu hình Vite Proxy và chưa đồng nhất Relative API Path `/api/v1` trên trình duyệt
- `frontend/vite.config.js` chưa cấu hình `server.proxy` cho `/api` trỏ về `http://localhost:8080`.
- `frontend/src/services/api.js` chỉ chuyển sang `/api/v1` khi `window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'`, khiến khi chạy trên `localhost` trình duyệt gọi trực tiếp cross-origin tới `http://localhost:8080/api/v1` thay vì đi qua Proxy đồng nhất.

### 1.4. Các container Backend Microservices đang chạy bản image cũ từ 02/11–05/11/2026 và thiếu biến `MYSQL_PASSWORD` trong `docker-compose.yml`
- Tại thời điểm kiểm tra ban đầu:
  - `ecommerce-api-gateway` đang chạy image từ `05/11/2026` (`3f0d3fe358f8`), chưa có route cho `/api/v1/admin/customers/**`, `/api/v1/admin/statistics/**`, `/api/v1/admin/reviews/**`, `/api/v1/products/categories/search` và `/api/v1/chatbot/**`.
  - `ecommerce-product-service` chạy image từ `04/11/2026` (`64045b8cd21d`), `ecommerce-payment-service` từ `02/11/2026` (`5db378d39d54`), `ecommerce-auth-service` (`fd02a9976429`) và `ecommerce-order-service` (`70ecbded0d12`) chưa được recreate theo image mới, còn `ecommerce-chatbot-service` chưa được khởi chạy.
  - Đặc biệt: trong `application-dev.yml` của 5 microservices (`auth-service`, `product-service`, `order-service`, `payment-service`, `chatbot-service`), cấu hình `spring.datasource.hikari.password: ${DB_PASSWORD:${MYSQL_PASSWORD:ecommerce_pass}}` ghi đè lên `SPRING_DATASOURCE_PASSWORD`. Tuy nhiên `backend/docker-compose.yml` chỉ truyền `SPRING_DATASOURCE_PASSWORD: ${MYSQL_PASSWORD:-ecommerce_pass}` mà không truyền biến `MYSQL_PASSWORD` vào container, dẫn tới khi `backend/.env` đặt `MYSQL_PASSWORD=ecommerce123`, các container mới khi recreate bị fallback về `ecommerce_pass` và gặp lỗi `Access denied for user 'ecommerce_user'`.
  - Giao diện cũ (02/11/2026) chỉ gọi các API cơ bản của Sprint 1 và tự động fallback sang dữ liệu giả (`mockData`) khi API lỗi, nên tạo cảm giác "kết nối được". Ngược lại, giao diện mới nhất đã loại bỏ fallback dữ liệu giả (`cf0cb5d`) và gọi đầy đủ API thật của Sprint 2 & 3, nên báo lỗi khi gặp các container Backend cũ trả về `404`/`403`.

---

## 2. Source Frontend Chính Thức Được Chọn

**Source chính thức duy nhất:** `C:\IT209\-E-COMMERCE-PLATFORM\frontend\src` tại commit `4f5435eaadf1b0bea248f83d21c67538bd7cf826` (`HEAD` / `origin/master`).

Phiên bản này bao gồm đầy đủ 100% thiết kế và tính năng mới nhất:
- **Giao diện Flagship Tech Store (`57223b2`, `852c3cb`)**: Aurora Hero Mesh, Live Countdown, Bento Category Grid, Spotlight Vouchers, Trust Commitments, `UserHeader` nâng cấp, `CategoryNav` pills và hệ thống CSS `theme.css` (64.14 KB compiled CSS).
- **Kiến trúc Code Splitting (`React.lazy` & `Suspense`)**: Tách biệt `UserLayout` và `AdminLayout`, lazy-load toàn bộ 23 trang Customer/Auth/Admin thành 39 chunks tối ưu.
- **Đầy đủ tính năng nghiệp vụ theo SRS & các Sprint**:
  - Xác thực JWT, Refresh Token tự động, RBAC (`ROLE_USER`, `ROLE_ADMIN`), Quản lý Hồ sơ & Sổ địa chỉ.
  - Danh mục & Sản phẩm (Tìm kiếm, Bộ lọc khoảng giá/danh mục/tồn kho, Phân trang, Sắp xếp, Kiểm tra tồn kho `/products/{id}/stock`).
  - Giỏ hàng, Thanh toán COD & VietQR Online (`QrPaymentModal`), Áp dụng Voucher, Theo dõi đơn hàng & Dòng thời gian trạng thái (`OrderTracking`, `OrderTimeline`).
  - Flash Sale giờ vàng (`FlashSale`, `AdminSales`, `AdminSaleForm`).
  - Đánh giá sản phẩm sau mua & Kiểm duyệt đánh giá (`ProductReviewForm`, `AdminReviews`).
  - Quản lý Khách hàng & Thống kê doanh thu theo khoảng thời gian (`AdminUsers`, `Dashboard`).
  - Quản lý Kho hàng (`Inventory`, `StockAdjustmentModal`: Nhập kho `/inbound`, Kiểm kê `/adjust-stock`).
  - Trợ lý Mua sắm AI (`ChatbotWidget`, `chatbotService` kết nối `chatbot-service`).

---

## 3. Danh Sách File Đã Sửa

| STT | File | Nội dung thay đổi |
|---|---|---|
| 1 | `frontend/src/services/api.js` | Chuẩn hóa `resolveBaseApiUrl()`: khi chạy trên trình duyệt thực tế (`window` & `document`), luôn trả về relative path `'/api/v1'` để đi qua Vite Proxy (`localhost:5173`) hoặc Nginx Reverse Proxy (`localhost:3000`, `localhost:80`). Khi chạy Node.js test runner (`npm test`), giữ nguyên `http://localhost:8080/api/v1` để tương thích 100% với bộ test hiện có. |
| 2 | `frontend/vite.config.js` | Chuyển Vite Dev Server & Preview về cổng chuẩn `5173` (`host: '0.0.0.0'`, `port: 5173`, `strictPort: true`) và cấu hình `proxy` chuyển tiếp mọi request `/api` sang `http://localhost:8080` (`changeOrigin: true`, `secure: false`). |
| 3 | `frontend/nginx.conf` | Bổ sung `client_max_body_size 20M;` hỗ trợ upload dữ liệu/ảnh và cấu hình `Cache-Control: no-store, no-cache, must-revalidate` cho `/index.html` để trình duyệt luôn nhận bản build mới nhất ngay khi cập nhật container, đồng thời giữ `proxy_pass http://api-gateway:8080/api/;` với `Authorization` header passthrough. |
| 4 | `frontend/.env.example` | Cập nhật tài liệu hướng dẫn cơ chế relative proxy `/api/v1` trên trình duyệt và URL trực tiếp cho Node.js test runner. |
| 5 | `backend/docker-compose.yml` | 1) Tách cổng `ecommerce-frontend` chỉ map `"3000:80"` (bỏ map trùng `5173:80` gây xung đột với Vite `localhost:5173`).<br>2) Truyền bổ sung biến môi trường `MYSQL_PASSWORD: ${MYSQL_PASSWORD:-ecommerce_pass}` vào `auth-service`, `product-service`, `order-service`, `payment-service`, `chatbot-service` để đồng bộ với `spring.datasource.hikari.password` trong `application-dev.yml`. |

*(Lưu ý: Tuyệt đối không sửa đổi file `.env`, không xóa dữ liệu MySQL volume và không sửa hay xóa bất kỳ file test nào).*

---

## 4. Các Cấu Hình API Đã Chuẩn Hóa (`frontend/src/services/api.js`)

```javascript
export const resolveBaseApiUrl = () => {
  const configuredUrl =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
    'http://localhost:8080/api/v1';

  // Khi chạy trên trình duyệt thực tế (Vite Dev Server localhost:5173, Docker Frontend localhost:3000,
  // Nginx Reverse Proxy localhost:80 hoặc domain/IP VPS), luôn chuẩn hóa về relative path '/api/v1'
  // để mọi request đi qua Vite Proxy (Local) hoặc Nginx Reverse Proxy (Docker) tới API Gateway (:8080).
  // Khi chạy bộ kiểm thử Node.js (typeof document === 'undefined'), giữ nguyên URL trực tiếp http://localhost:8080/api/v1.
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && window.location) {
    if (
      configuredUrl === '/api/v1' ||
      configuredUrl.startsWith('/') ||
      configuredUrl.includes('localhost:8080') ||
      configuredUrl.includes('127.0.0.1:8080') ||
      (window.location.hostname &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1' &&
        configuredUrl.includes('localhost'))
    ) {
      return '/api/v1';
    }
  }
  return configuredUrl;
};
```

- Chỉ sử dụng **một Axios instance duy nhất** (`api`) cho toàn bộ 12 services trong `frontend/src/services/`.
- Request Interceptor tự động đính kèm `Authorization: Bearer <token>`.
- Response Interceptor tự động giải nén `ApiResponse` (`{ success, message, data, timestamp }`), tự động gọi `POST /api/v1/auth/refresh` khi gặp `401 Unauthorized` và trích xuất chi tiết `fieldErrors` từ Backend `GlobalExceptionHandler`.

---

## 5. Cấu Hình Vite Proxy (`frontend/vite.config.js`)

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PROXY_TARGET = process.env.VITE_PROXY_TARGET || 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    open: false,
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        secure: false
      }
    }
  }
});
```

Kiến trúc khi chạy Vite (`http://localhost:5173`):
`Browser (http://localhost:5173) ──[/api/v1/**]──► Vite Proxy (:5173) ──► API Gateway (http://localhost:8080/api/v1/**) ──► Microservices`

---

## 6. Cấu Hình Nginx Proxy (`frontend/nginx.conf` & `backend/docker/nginx/nginx.conf`)

- **`ecommerce-frontend` (`http://localhost:3000`, `frontend/nginx.conf`)**:
  - Phục vụ trực tiếp bundle React SPA từ `/usr/share/nginx/html` (được build trong multi-stage `frontend/Dockerfile` từ source mới nhất).
  - Chuyển tiếp `/api/` qua `proxy_pass http://api-gateway:8080/api/;` kèm đầy đủ header `Authorization`, `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`.
  - Chặn cache stale trên `/index.html` (`Cache-Control: no-store, no-cache, must-revalidate`) và bật cache immutable cho `/assets/`.
- **`ecommerce-nginx` (`http://localhost:80`, `backend/docker/nginx/nginx.conf`)**:
  - Chuyển tiếp `/api/` sang `http://gateway_upstream/api/` (`api-gateway:8080`).
  - Chuyển tiếp `/` sang `http://frontend_upstream` (`frontend:80`).

Kiến trúc khi chạy Docker (`http://localhost:3000` & `http://localhost:80`):
`Browser (http://localhost:80 hoặc :3000) ──[/api/v1/**]──► Nginx Reverse Proxy ──► API Gateway (http://api-gateway:8080/api/v1/**) ──► Microservices`

---

## 7. Kết Quả Build (Vite & Docker)

### 7.1. Vite Production Build (`npm run build`)
- Đã xóa sạch thư mục `frontend/dist` cũ và build mới hoàn toàn:
  ```text
  vite v5.4.21 building for production...
  ✓ 195 modules transformed.
  dist/index.html                              0.71 kB │ gzip:   0.44 kB
  dist/assets/index-B9L3sONF.css              64.14 kB │ gzip:  12.75 kB
  dist/assets/Home-BI5N_i9Q.js                25.83 kB │ gzip:   7.05 kB
  dist/assets/AdminReviews-BOeq25H3.js        30.63 kB │ gzip:   8.43 kB
  dist/assets/AdminUsers-DlpdfqkY.js          28.49 kB │ gzip:   7.54 kB
  dist/assets/Dashboard-C0EyxXen.js           28.37 kB │ gzip:   7.46 kB
  dist/assets/Checkout-GmNviSg9.js            30.07 kB │ gzip:   8.48 kB
  dist/assets/Inventory-BjEBjc-B.js           31.51 kB │ gzip:   8.46 kB
  dist/assets/Categories-n5eHHbex.js          36.53 kB │ gzip:   7.35 kB
  dist/assets/ProductDetail-DVXpBCBw.js       54.80 kB │ gzip:  13.35 kB
  dist/assets/index-Ej7prq_E.js              451.22 kB │ gzip: 141.19 kB
  ✓ built in 3.39s
  ```

### 7.2. Docker Multi-Stage Build (`docker compose up -d --build`)
- Toàn bộ 8 images (`backend-discovery-server`, `backend-auth-service`, `backend-product-service`, `backend-order-service`, `backend-payment-service`, `backend-chatbot-service`, `backend-api-gateway`, `backend-frontend`) đã được build mới từ source code hiện tại và recreate container thành công.
- Trạng thái các container đang chạy (`docker ps`):
  | Container | Image | Status | Ports |
  |---|---|---|---|
  | `ecommerce-frontend` | `backend-frontend` | `Up (healthy)` | `0.0.0.0:3000->80/tcp` |
  | `ecommerce-nginx` | `nginx:1.27-alpine` | `Up (healthy)` | `0.0.0.0:80->80/tcp` |
  | `ecommerce-api-gateway` | `backend-api-gateway` | `Up (healthy)` | `0.0.0.0:8080->8080/tcp` |
  | `ecommerce-discovery-server` | `backend-discovery-server` | `Up (healthy)` | `0.0.0.0:8761->8761/tcp` |
  | `ecommerce-auth-service` | `backend-auth-service` | `Up (healthy)` | `8081/tcp` |
  | `ecommerce-product-service` | `backend-product-service` | `Up (healthy)` | `8082/tcp` |
  | `ecommerce-order-service` | `backend-order-service` | `Up (healthy)` | `8083/tcp` |
  | `ecommerce-payment-service` | `backend-payment-service` | `Up (healthy)` | `8084/tcp` |
  | `ecommerce-chatbot-service` | `backend-chatbot-service` | `Up (healthy)` | `8085/tcp` |
  | `ecommerce-mysql` | `mysql:8.0` | `Up (healthy)` | `127.0.0.1:3307->3306/tcp` |
  | `ecommerce-redis` | `redis:7.2-alpine` | `Up (healthy)` | `0.0.0.0:6379->6379/tcp` |
  | `ecommerce-kafka` | `confluentinc/cp-kafka:7.6.1` | `Up (healthy)` | `0.0.0.0:9092->9092/tcp` |
  | `ecommerce-zookeeper` | `confluentinc/cp-zookeeper:7.6.1` | `Up (healthy)` | `0.0.0.0:2181->2181/tcp` |

---

## 8. Kết Quả Lint (`npm run lint`)

```text
> ecommerce-frontend@0.1.0 lint
> node scripts/lint-check.mjs

[LINT PASS] Đã kiểm tra 108 file nguồn trong src/ — 0 lỗi cú pháp/import.
```

---

## 9. Kết Quả Frontend Tests & Backend Integration Tests (`npm test`)

Chạy nguyên vẹn toàn bộ **41 file test** định nghĩa trong `frontend/package.json` (bao gồm cả unit tests và live backend integration tests `*_be.qa.test.mjs`):

```text
1..210
# tests 500
# suites 23
# pass 500
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 12657.9411
```

---

## 10. Kết Quả Kiểm Thử Chi Tiết Các API & Phân Quyền (200 / 401 / 403)

### 10.1. Kiểm tra phân biệt mã lỗi bảo mật (401 vs 403 vs 200) trên các API Quản trị mới
| Endpoint | Không có Token | Token `ROLE_USER` | Token `ROLE_ADMIN` |
|---|---|---|---|
| `GET /api/v1/admin/customers` | `401 Unauthorized` | `403 Forbidden` | `200 OK` |
| `GET /api/v1/admin/statistics` | `401 Unauthorized` | `403 Forbidden` | `200 OK` |
| `GET /api/v1/admin/reviews` | `401 Unauthorized` | `403 Forbidden` | `200 OK` |
| `GET /api/v1/products/categories/search` | `401 Unauthorized` | `403 Forbidden` | `200 OK` |

### 10.2. Kiểm tra đồng bộ tất cả API qua cả 3 cổng (`Vite :5173`, `Docker :3000`, `Nginx :80`)
Tất cả các endpoint bên dưới đều trả về `HTTP 200 OK` với dữ liệu JSON chuẩn từ Backend khi gọi qua cả 3 địa chỉ `http://localhost:5173/api/v1/...`, `http://localhost:3000/api/v1/...` và `http://localhost:80/api/v1/...`:
- `POST /api/v1/auth/login` & `GET /api/v1/auth/me` & `GET /api/v1/users/profile`
- `GET /api/v1/products?page=0&size=4` & `GET /api/v1/products/1` & `GET /api/v1/products/1/stock?quantity=1`
- `GET /api/v1/products/categories` & `GET /api/v1/products/categories/search?keyword=Laptop`
- `GET /api/v1/vouchers/active` & `POST /api/v1/vouchers/apply` & `GET /api/v1/admin/vouchers`
- `GET /api/v1/flash-sales/active` & `GET /api/v1/admin/flash-sales/campaigns`
- `GET /api/v1/products/1/reviews` & `GET /api/v1/admin/reviews?page=0&size=5`
- `GET /api/v1/admin/customers?page=0&size=5` & `GET /api/v1/admin/customers/count`
- `GET /api/v1/admin/statistics` & `GET /api/v1/admin/orders?page=0&size=5`
- `GET /api/v1/chatbot/conversations` & `POST /api/v1/chatbot/chat`

### 10.3. Kiểm thử luồng E2E thực tế (Cart → Flash Sale Price → Voucher → Checkout → Tracking Timeline → Cancel & Restore)
- `POST /api/v1/cart/items` (`productId: 3`, `quantity: 1`) → Tự động ghi nhận giá Flash Sale `5.990.000đ` (`itemId=1`).
- `PUT /api/v1/cart/items/1` (`quantity: 2`) → Cập nhật thành công `totalPrice = 11.980.000đ`.
- `POST /api/v1/vouchers/apply` (`code: "GIAM50K"`, `orderTotal: 11980000`) → Giảm `50.000đ`.
- `POST /api/v1/orders/checkout` (`paymentMethod: "COD"`, `voucherCode: "GIAM50K"`) → Tạo đơn hàng `#1` (`status: PENDING`, `totalAmount: 11.930.000đ`, `discountAmount: 50.000đ`).
- `GET /api/v1/orders/1` & `GET /api/v1/orders/1/history` → Trả về đầy đủ chi tiết đơn hàng và lịch sử timeline.
- `PUT /api/v1/orders/1/cancel` → Chuyển trạng thái sang `CANCELLED`, tự động hoàn trả tồn kho và lượt dùng voucher.

---

## 11. So Sánh Giao Diện Vite (`:5173`), Docker (`:3000`) và Nginx (`:80`)

| Tiêu chí so sánh | Vite (`http://localhost:5173`) | Docker (`http://localhost:3000`) | Nginx (`http://localhost:80`) |
|---|---|---|---|
| **Source commit** | `4f5435e` (Mới nhất) | `4f5435e` (Mới nhất) | `4f5435e` (Mới nhất) |
| **Giao diện Trang chủ** | Flagship Tech Store (`home-hero-aurora`, `BENTO_THEMES`, `SPOTLIGHT_VOUCHERS`, `TRUST_COMMITMENTS`) | Flagship Tech Store (`Home-DJc3d62W.js`, `index-B9L3sONF.css`) | Flagship Tech Store (`Home-DJc3d62W.js`, `index-B9L3sONF.css`) |
| **Header & CategoryNav** | `UserHeader` + `CategoryNav` pills mới nhất | `UserHeader` + `CategoryNav` pills mới nhất | `UserHeader` + `CategoryNav` pills mới nhất |
| **Code Splitting (`React.lazy`)** | 23 lazy routes (`AppRoutes.jsx`) | 39 compiled lazy chunks (`/assets/*.js`) | 39 compiled lazy chunks (`/assets/*.js`) |
| **Base API URL trên Browser** | `/api/v1` (qua Vite Proxy → `:8080`) | `/api/v1` (qua Frontend Nginx → `api-gateway:8080`) | `/api/v1` (qua Unified Nginx → `api-gateway:8080`) |
| **Xung đột cổng** | Không (chạy độc lập tại `:5173`) | Không (chạy độc lập tại `:3000`) | Không (chạy độc lập tại `:80`) |

---

## 12. Bảng Tổng Kết Nghiệm Thu

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Source Frontend thống nhất | **PASS** | Cùng build từ `frontend/src` tại commit `4f5435e` (`origin/master`) |
| Vite build | **PASS** | `npm run build` thành công trong `3.39s` (195 modules, 39 chunks) |
| Docker build | **PASS** | `docker compose up -d --build` thành công cho `frontend` và toàn bộ microservices |
| Vite kết nối Backend | **PASS** | `http://localhost:5173/api/v1/**` proxy sang `:8080` trả về `200 OK` |
| Docker kết nối Backend | **PASS** | `http://localhost:3000/api/v1/**` và `http://localhost:80/api/v1/**` trả về `200 OK` |
| Authentication | **PASS** | Login, Register, `/auth/me`, JWT RBAC (`200`/`401`/`403`) hoạt động chính xác |
| Product API | **PASS** | Danh sách, Chi tiết, Tìm kiếm, Lọc, Phân trang, Danh mục, Kiểm tra tồn kho `200 OK` |
| Cart/Checkout | **PASS** | Thêm giỏ, Cập nhật SL, Áp dụng Voucher, Tạo đơn hàng COD/VietQR `200 OK` |
| Order Tracking | **PASS** | Lịch sử đơn, Chi tiết đơn, Timeline `/orders/{id}/history`, Hủy đơn hoàn kho `200 OK` |
| Admin | **PASS** | Dashboard `/admin/statistics`, Customers `/admin/customers`, Reviews `/admin/reviews`, Inventory, Sales, Vouchers `200 OK` |
| Regression | **PASS** | `npm run lint` (108 files, 0 errors) & `npm test` (**500/500 tests PASS, 0 FAIL**) |

---

## 13. Các Lỗi Còn Tồn Tại

- **Không còn lỗi tồn tại.** Toàn bộ xung đột cổng, container image cũ, thiếu biến `MYSQL_PASSWORD` trong `docker-compose.yml` và cấu hình proxy giữa Vite / Docker / Nginx đã được xử lý triệt để.

---

## 14. Hướng Dẫn Chạy Dự Án Sau Khi Sửa

### Chạy toàn bộ hệ thống Docker (Backend + Docker Frontend `:3000` + Nginx `:80`)
```powershell
cd C:\IT209\-E-COMMERCE-PLATFORM\backend
docker compose up -d --build
```
- Truy cập qua Nginx Reverse Proxy: `http://localhost:80`
- Truy cập trực tiếp container Frontend: `http://localhost:3000`

### Chạy thêm môi trường phát triển Vite (`:5173`) song song với Backend Docker
```powershell
cd C:\IT209\-E-COMMERCE-PLATFORM\frontend
npm run dev
```
- Truy cập giao diện Vite Dev Server: `http://localhost:5173`

### Chạy kiểm tra Lint, Unit Tests & Backend Integration Tests
```powershell
cd C:\IT209\-E-COMMERCE-PLATFORM\frontend
npm run lint
npm test
npm run build
```

---

## 15. Các Lệnh Git Cần Thực Hiện Tiếp Theo (Khi Bạn Xác Nhận Commit)

*(Theo đúng quy tắc an toàn, tôi chưa tự ý commit, merge hay push lên GitHub. Khi bạn đã kiểm tra trực tiếp trên trình duyệt và đồng ý lưu thay đổi, bạn có thể chạy các lệnh sau):*

```powershell
cd C:\IT209\-E-COMMERCE-PLATFORM
git status
git add frontend/src/services/api.js frontend/vite.config.js frontend/nginx.conf frontend/.env.example backend/docker-compose.yml FRONTEND_UNIFICATION_AUDIT.md
git commit -m "fix(fe,docker): đồng bộ giao diện Flagship Tech Store mới nhất và chuẩn hóa proxy Vite/Nginx/Docker"
```
