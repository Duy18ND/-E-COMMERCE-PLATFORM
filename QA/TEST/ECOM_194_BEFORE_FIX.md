# BÁO CÁO KIỂM TRA 5 TASK FRONTEND ĐĂNG KÝ & ĐĂNG NHẬP – SPRINT 1 (LẦN 1: TRƯỚC KHI SỬA)

## 1. Thông tin chung

- **Dự án:** `C:\IT209\-E-COMMERCE-PLATFORM`
- **Phạm vi kiểm tra:** Frontend (`../../frontend`) & đối chiếu tích hợp Backend (`backend/auth-service`, `backend/api-gateway`)
- **Sprint:** SPRINT 1
- **Feature:** ECOM-101 – Đăng ký & Đăng nhập
- **Nhóm task:** ECOM-194 (`ECOM-102`, `ECOM-105`, `ECOM-197`, `ECOM-199`, `ECOM-200`)
- **Nhánh Git kiểm tra:** `devops-phuong` (commit `52680ee`)
- **Vai trò đánh giá:** Senior Frontend Developer, QA Engineer & Code Reviewer

---

## 2. Bảng tổng hợp kết quả 5 Task (Trạng thái ban đầu trước khi sửa)

| Task ID | Người phụ trách | Trạng thái | Bằng chứng | Lỗi tồn tại | Việc cần làm |
|---|---|---|---|---|---|
| **ECOM-102** | Lê Trung Chiến | **ĐANG LÀM DỞ (CÓ LỖI NHỎ)** | - `../../frontend/src/pages/auth/Login.jsx` (dòng 1–173)<br>- `frontend/src/pages/auth/Register.jsx` (dòng 1–165)<br>- `frontend/src/components/common/Input.jsx` (dòng 1–59)<br>- `frontend/src/components/common/ErrorMessage.jsx` (dòng 1–42)<br>- `frontend/src/components/layout/Header.jsx` (dòng 113–483, 745–796)<br>- `frontend/src/styles/responsive.css` (dòng 1–68) | 1. `Register.jsx` chưa kiểm tra `fullName.trim()` bằng JS (nhập toàn khoảng trắng vẫn qua HTML5 `required`) và chưa kiểm tra regex số điện thoại 10–11 chữ số như Backend `RegisterRequest.java` (dòng 30).<br>2. `Login.jsx` chưa kiểm tra độ dài mật khẩu tối thiểu 6 ký tự như Backend `LoginRequest.java` (dòng 20).<br>3. Chưa truyền prop `error` xuống từng `<Input />` để báo lỗi cấp trường (field-level).<br>4. Thanh `Header.jsx` đi kèm trang Login/Register dùng `display: flex` + `whiteSpace: 'nowrap'` không có responsive/menu mobile, gây tràn ngang trên màn hình điện thoại (< 768px). | 1. Bổ sung validate JS cho `email` (regex), `fullName.trim()` (2–150 ký tự), `phone` (`^[0-9]{10,11}$`), `password` (6–50 ký tự).<br>2. Truyền lỗi chi tiết vào prop `error` của component `Input`.<br>3. Bổ sung CSS responsive cho `Header.jsx` trên thiết bị di động. |
| **ECOM-105** | Ngô Phương | **ĐANG LÀM DỞ (CÓ LỖI NGHIÊM TRỌNG)** | - `../../frontend/.env` (dòng 1–4)<br>- `frontend/src/services/api.js` (dòng 1–62)<br>- `frontend/src/services/authService.js` (dòng 1–121)<br>- `frontend/src/context/AuthContext.jsx` (dòng 1–138)<br>- `frontend/src/utils/auth.js` (dòng 1–44)<br>- `frontend/src/routes/ProtectedRoute.jsx` (dòng 1–19)<br>- `frontend/src/routes/AppRoutes.jsx` (dòng 7, 59–63)<br>- `backend/auth-service/.../AuthController.java` (dòng 24–106)<br>- `backend/api-gateway/.../application.yml` (dòng 33–55) | 1. **Đang chạy Mock Auth mặc định:** `../../frontend/.env` đặt `VITE_USE_MOCK_AUTH=true`, chưa gọi API thật.<br>2. **Sai tiền tố URL API:** `api.js` đặt `baseURL = http://localhost:8080/api` và `authService.js` gọi `/auth/login`, `/auth/register`, `/users/me` → thiếu `/v1` so với Backend (`/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/me`), gây lỗi **404 Not Found**.<br>3. **Sai cấu trúc unwrap `ApiResponse`:** `api.js` (dòng 33) kiểm tra `'status' in response.data`, nhưng Backend `ApiResponse.java` trả về `{ success, message, data, timestamp }` (không có `status`). Hệ quả là `response.data.data` không được trích xuất, làm `loginData.accessToken` = `undefined`, không lưu được JWT thật.<br>4. **Lệch tên trường User ID:** Backend `AuthResponse.java` trả về `userId`, nhưng `AuthContext.jsx` (dòng 76) đọc `loginData.id`.<br>5. **Sai endpoint lấy user khi F5:** `authService.js` (dòng 117) gọi `GET /users/me` (Backend không có endpoint này mà chỉ có `GET /api/v1/auth/me`), khiến F5 tải lại trang rơi vào `catch` và tự xóa token (`clearAuth()`).<br>6. **Bỏ quên `ProtectedRoute`:** `AppRoutes.jsx` (dòng 7) có `import ProtectedRoute` nhưng **không gắn vào bất kỳ route nào** (`/checkout`, `/orders`, `/orders/:id`, `/order-success` đều mở tự do cho người chưa đăng nhập).<br>7. **Xử lý 401 & Logout chưa trọn vẹn:** Khi gặp 401, `api.js` chỉ xóa `localStorage` mà không đồng bộ React state của `AuthContext` hay chuyển hướng về `/login`; `logout()` chưa gọi `POST /api/v1/auth/logout` và chưa xử lý `refreshToken`. | 1. Đổi `VITE_API_URL=http://localhost:8080/api/v1` và `VITE_USE_MOCK_AUTH=false`.<br>2. Sửa `api.js` (dòng 33) thành `('status' in response.data \|\| 'success' in response.data)`.<br>3. Sửa `AuthContext.jsx` (dòng 76) thành `id: loginData.userId ?? loginData.id`.<br>4. Sửa `authService.getCurrentUser()` gọi `/auth/me` và chuẩn hóa mảng `roles` từ `authorities`.<br>5. Bọc các route `/checkout`, `/order-success`, `/orders`, `/orders/:id` trong `<Route element={<ProtectedRoute />}>` tại `AppRoutes.jsx`.<br>6. Đồng bộ sự kiện 401 với `AuthContext` và gọi API `/auth/logout` khi đăng xuất. |
| **ECOM-197** | Lê Trung Chiến | **ĐANG LÀM DỞ (CƠ BẢN HOẠT ĐỘNG Ở CHẾ ĐỘ MOCK)** | - `../../frontend/src/pages/auth/Login.jsx` (dòng 8–171)<br>- `frontend/src/pages/auth/Register.jsx` (dòng 8–163)<br>- `frontend/src/routes/AppRoutes.jsx` (dòng 56–57) | 1. Thiếu kiểm tra dữ liệu đầu vào chi tiết trước khi gửi: `Register.jsx` chưa chặn `fullName` toàn khoảng trắng, chưa kiểm tra định dạng `phone` (10–11 số) trước khi gọi API.<br>2. `Login.jsx` chưa có thông báo/toast phản hồi khi đăng nhập thành công (chuyển trang ngay lập tức).<br>3. Trong `Register.jsx` (dòng 54–62), `setLoading(false)` chạy trong `finally` ngay lập tức trong khi `setTimeout` chờ 1500ms mới chuyển sang `/login`, khiến nút "Đăng ký" bật lại trong lúc chờ chuyển hướng (dễ bị bấm trùng). | 1. Bổ sung validate đầy đủ các trường trước khi gọi API ở cả 2 form.<br>2. Giữ trạng thái `disabled` của nút Đăng ký trong suốt 1.5s chờ chuyển hướng.<br>3. Hiển thị chi tiết lỗi `errors` từng trường khi Backend trả về HTTP 400. |
| **ECOM-199** | Ngô Phương | **ĐANG LÀM DỞ (CÓ LỖI BẢO VỆ ROUTE & LỖI TÍCH HỢP)** | - `../../frontend/src/context/AuthContext.jsx` (dòng 81, 109–129)<br>- `frontend/src/pages/auth/Login.jsx` (dòng 50–62)<br>- `frontend/src/routes/AdminRoute.jsx` (dòng 1–23)<br>- `frontend/src/routes/ProtectedRoute.jsx` (dòng 1–19)<br>- `frontend/src/routes/AppRoutes.jsx` (dòng 50–153)<br>- `frontend/src/components/layout/Header.jsx` (dòng 116, 173–190, 289–401) | 1. **Chưa chặn khách vãng lai (chưa đăng nhập) ở các trang USER cần xác thực:** Do `ProtectedRoute` không được dùng trong `AppRoutes.jsx`, người chưa đăng nhập hoặc đã đăng xuất vẫn vào thẳng `/checkout`, `/orders`, `/orders/:id`, `/order-success` mà không bị đẩy về `/login`.<br>2. **Mất quyền ADMIN khi dùng Backend thật:** Do `api.js` không unwrap được `response.data.data`, `loginData.roles` bị `undefined` và `AuthContext.jsx` (dòng 81) gán mặc định thành `['ROLE_USER']`, khiến tài khoản ADMIN đăng nhập qua Backend bị hiểu nhầm là USER và bị đẩy về `/`.<br>3. **Mất phiên/quyền khi F5 ở chế độ Backend thật:** `getCurrentUser()` gọi sai endpoint `/users/me` làm `initAuth()` xóa sạch session khi tải lại trang.<br>4. Thiếu thông báo khi USER bị chặn khỏi `/admin`. | 1. Áp dụng `<Route element={<ProtectedRoute />}>` cho các trang USER cần xác thực trong `AppRoutes.jsx`.<br>2. Sửa lỗi đọc `roles` từ Backend `AuthResponse` và `getCurrentUser()` để giữ đúng quyền `ROLE_ADMIN` khi đăng nhập và khi F5.<br>3. Bổ sung thông báo khi không đủ quyền. |
| **ECOM-200** | Ngô Phương | **CHƯA HOÀN THÀNH (FAIL TÍCH HỢP & BUILD)** | - `../../frontend/package.json` (dòng 1–21)<br>- `frontend/.env` (dòng 1–4)<br>- Kết quả chạy `npm run build` và kịch bản kiểm thử logic (`qa_auth_test.mjs`)<br>- Đối chiếu `TV2_Postman_Collection.json` (dòng 60–193) | 1. **Chưa cấu hình test script:** Trong `../../frontend/package.json` (dòng 6–10) chưa có script `"test"`.<br>2. **Tích hợp Frontend – Backend thực tế bị đứt gãy:** Frontend đang khóa ở chế độ Mock (`VITE_USE_MOCK_AUTH=true`). Khi chuyển sang Backend thật bị lỗi hoàn toàn do lệch URL (`/api/auth/*` vs `/api/v1/auth/*`), lệch cấu trúc `ApiResponse` (`status` vs `success`), lệch `id` vs `userId`, và lệch `/users/me` vs `/api/v1/auth/me`.<br>3. **Lỗi QA Bảo mật Route:** Người chưa đăng nhập truy cập được `/checkout`, `/orders`, `/orders/1001`.<br>4. **Lỗi QA Responsive:** Thanh `Header` trên trang Login/Register bị tràn ngang trên màn hình mobile. | 1. Sửa toàn bộ các lỗi tích hợp API ở ECOM-105 và lỗi phân quyền route ở ECOM-199.<br>2. Bổ sung bộ kiểm thử tự động `npm test`.<br>3. Thực hiện lại toàn bộ kịch bản QA khi kết nối với hợp đồng API Backend. |

---

## 3. Đánh giá chi tiết từng Task (Trước khi sửa)

### 3.1. Task ECOM-102 – Giao diện Login/Register (Lê Trung Chiến)
| # | Tiêu chí kiểm tra | Kết quả | Bằng chứng (File & Dòng code) |
|---|---|---|---|
| 1 | Giao diện Login và Register đã tồn tại chưa? | **PASS** | `../../frontend/src/pages/auth/Login.jsx` (dòng 1–173), `frontend/src/pages/auth/Register.jsx` (dòng 1–165). |
| 2 | Có đầy đủ các trường thông tin cần thiết không? | **PASS** | Login: `email`, `password`. Register: `fullName`, `email`, `phone`, `address`, `password`, `confirmPassword`. |
| 3 | Có kiểm tra định dạng email, mật khẩu và các trường bắt buộc không? | **FAIL** | Chỉ dựa vào HTML5 `required` và kiểm tra mật khẩu $\ge 6$ ở `Register.jsx` (dòng 33–41). Chưa kiểm tra `fullName.trim()` (nhập toàn dấu cách vẫn qua), chưa kiểm tra regex `phone` 10–11 chữ số như `RegisterRequest.java` (dòng 30), chưa kiểm tra độ dài mật khẩu ở `Login.jsx`. |
| 4 | Có hiển thị thông báo lỗi nhập liệu không? | **PASS (Một phần)** | Có hiển thị `<ErrorMessage />` ở đầu form (`Login.jsx` dòng 134, `Register.jsx` dòng 73), nhưng chưa truyền prop `error` xuống từng `<Input />`. |
| 5 | Có điều hướng giữa hai giao diện không? | **PASS** | `<Link to="/register">` (`Login.jsx` dòng 164) và `<Link to="/login">` (`Register.jsx` dòng 156). |
| 6 | Giao diện có tương thích thiết bị di động không? | **FAIL** | Khối `.card` co giãn được, nhưng `Header.jsx` (dòng 113–483) dùng `display: flex` + `whiteSpace: 'nowrap'` không có responsive trên mobile, gây tràn ngang màn hình điện thoại. |

- **Đánh giá điều kiện Demo & Merge:** Chưa đủ điều kiện merge.

---

### 3.2. Task ECOM-105 – API, JWT và ProtectedRoute (Ngô Phương)
| # | Tiêu chí kiểm tra | Kết quả | Bằng chứng (File & Dòng code) |
|---|---|---|---|
| 1 | Đã tích hợp Axios với Backend chưa? | **PASS (Cơ sở)** | `../../frontend/src/services/api.js` (dòng 4–9). |
| 2 | Đã gọi API đăng ký và đăng nhập thực tế chưa? | **FAIL** | `../../frontend/.env` (dòng 4) đặt `VITE_USE_MOCK_AUTH=true`. Khi tắt Mock, URL gọi đi là `/api/auth/login`, `/api/auth/register`, `/api/users/me` — thiếu `/v1` so với Backend (`/api/v1/auth/*`), gây lỗi 404. |
| 3 | Request Body và Response Body có khớp Backend không? | **FAIL** | `api.js` (dòng 33) kiểm tra `'status' in response.data` nhưng Backend `ApiResponse.java` trả về `{ success, message, data, timestamp }` (không có `status`). `AuthContext.jsx` (dòng 76) đọc `loginData.id` nhưng Backend `AuthResponse.java` trả về `userId`. |
| 4 | Có nhận và quản lý JWT sau đăng nhập không? | **FAIL** | Do `api.js` không unwrap được `response.data.data`, `loginData.accessToken` bị `undefined` khi gọi Backend thật; chưa lưu `refreshToken`. |
| 5 | Có gắn token vào yêu cầu API cần xác thực không? | **PASS** | `api.js` (dòng 12–23) gắn `Authorization: Bearer ${token}`. |
| 6 | Có duy trì trạng thái đăng nhập khi tải lại trang không? | **FAIL** | Khi F5 ở chế độ Backend thật, `authService.getCurrentUser()` gọi `GET /api/users/me` (không tồn tại trên Backend) → nhảy vào `catch` (`AuthContext.jsx` dòng 29–34) và xóa mất token (`clearAuth()`). |
| 7 | Có xử lý lỗi 401 và token hết hạn không? | **FAIL** | `api.js` (dòng 48–53) chỉ xóa `localStorage` mà không xóa state trong `AuthContext` và chưa tự động refresh token. |
| 8 | Có cơ chế ProtectedRoute hoặc tương đương không? | **PASS** | Đã viết `ProtectedRoute.jsx` (dòng 1–19) và `AdminRoute.jsx` (dòng 1–23). |
| 9 | Có ngăn người chưa đăng nhập truy cập trang cần xác thực không? | **FAIL** | `AppRoutes.jsx` (dòng 7) có `import ProtectedRoute` nhưng **không sử dụng** cho `/checkout`, `/order-success`, `/orders`, `/orders/:id` (dòng 60–63). |
| 10 | Có chức năng đăng xuất không? | **PASS (Client)** | `AuthContext.jsx` (dòng 92–96) xóa `localStorage` và state, nhưng chưa gọi `POST /api/v1/auth/logout`. |

- **Đánh giá điều kiện Demo & Merge:** Chưa đủ điều kiện (FAIL).

---

### 3.3. Task ECOM-197 – Form Đăng ký và Đăng nhập riêng (Lê Trung Chiến)
| # | Tiêu chí kiểm tra | Kết quả | Bằng chứng (File & Dòng code) |
|---|---|---|---|
| 1 | Login và Register có form riêng không? | **PASS** | `Login.jsx` (dòng 136–160) và `Register.jsx` (dòng 92–152). |
| 2 | Mỗi form có thể hoạt động độc lập không? | **PASS** | State độc lập trên 2 trang `/login` và `/register`. |
| 3 | Có xử lý Submit đúng cách không? | **PASS** | `handleSubmit` bất đồng bộ với `try/catch/finally` ở cả 2 form. |
| 4 | Có kiểm tra dữ liệu trước khi gửi không? | **FAIL** | Thiếu kiểm tra `fullName.trim()` rỗng/ngắn hơn 2 ký tự và regex `phone` 10–11 chữ số trước khi gửi. |
| 5 | Có hiển thị phản hồi thành công/thất bại không? | **PASS (Một phần)** | `Register.jsx` có cả hai; `Login.jsx` chỉ có thông báo lỗi thất bại. |
| 6 | Có trạng thái loading khi gửi dữ liệu không? | **PASS (Một phần)** | Có state `loading`, nhưng ở `Register.jsx` (dòng 54–62) nút bấm sáng trở lại trong 1.5s chờ chuyển hướng. |

- **Đánh giá điều kiện Demo & Merge:** Chưa đủ điều kiện merge.

---

### 3.4. Task ECOM-199 – Điều hướng theo vai trò USER/ADMIN (Ngô Phương)
| # | Tiêu chí kiểm tra | Kết quả | Bằng chứng (File & Dòng code) |
|---|---|---|---|
| 1 | Có lấy được vai trò USER/ADMIN từ thông tin xác thực không? | **FAIL (Backend thật)** | Do lỗi unwrap `ApiResponse`, `loginData.roles` bị `undefined` và `AuthContext.jsx` (dòng 81) ép mọi tài khoản về `['ROLE_USER']`. |
| 2 | Sau khi đăng nhập bằng USER, có điều hướng về trang USER phù hợp không? | **PASS** | `Login.jsx` (dòng 59–62) điều hướng về `from` hoặc `/`. |
| 3 | Sau khi đăng nhập bằng ADMIN, có điều hướng về trang ADMIN phù hợp không? | **FAIL (Backend thật)** | Chế độ Mock vào `/admin`, nhưng chế độ Backend thật mất quyền Admin nên bị đẩy về `/`. |
| 4 | USER có bị ngăn truy cập các trang dành riêng cho ADMIN không? | **PASS** | `AdminRoute.jsx` (dòng 16–18) đẩy về `/`. |
| 5 | Người chưa đăng nhập có bị điều hướng về Login khi truy cập trang được bảo vệ không? | **FAIL** | Không chặn khách chưa đăng nhập khi vào `/checkout`, `/order-success`, `/orders`, `/orders/:id` (`AppRoutes.jsx` dòng 60–63). |
| 6 | Sau khi đăng xuất, có không thể truy cập lại trang cần xác thực không? | **FAIL** | Sau khi đăng xuất vẫn vào lại được `/checkout`, `/orders`, `/orders/1001`. |
| 7 | Khi tải lại trình duyệt, trạng thái quyền truy cập có được khôi phục chính xác không? | **FAIL (Backend thật)** | F5 gọi `/users/me` bị lỗi 404 và xóa sạch session trong `localStorage`. |
| 8 | Có xử lý trường hợp người dùng không có quyền phù hợp không? | **FAIL (Một phần)** | Chuyển hướng âm thầm về `/` mà không hiển thị thông báo cảnh báo không đủ quyền. |

- **Đánh giá điều kiện Demo & Merge:** Chưa đủ điều kiện (FAIL).

---

### 3.5. Task ECOM-200 – QA Test giao diện, responsive, lỗi và tích hợp (Ngô Phương)
- **Kết quả kiểm thử ban đầu:**
  - Chưa có script `"test"` trong `../../frontend/package.json`.
  - Kiểm thử logic interceptor (`qa_auth_test.mjs`) xác nhận lỗi: `interceptedLoginData.accessToken === undefined` và `interceptedLoginData.roles === undefined` khi nhận phản hồi `ApiResponse` từ Backend thật.
  - Kiểm thử phân quyền xác nhận lỗi: khách chưa đăng nhập vẫn truy cập được `/checkout` và `/orders`.
- **Đánh giá điều kiện Demo & Merge:** Chưa đủ điều kiện (FAIL).

---

## 4. Kết luận (Lần 1 – Trước khi sửa)

1. **Trong 5 task, task nào đã hoàn thành?** → Chưa có task nào hoàn thành trọn vẹn 100%.
2. **Task nào đang làm dở?** → Cả 5 task (`ECOM-102`, `ECOM-105`, `ECOM-197`, `ECOM-199`, `ECOM-200`) đều đang làm dở.
3. **Task nào chưa triển khai?** → Phần tích hợp thực tế với Backend (`VITE_USE_MOCK_AUTH=false`) và việc gắn `<ProtectedRoute />` vào `AppRoutes.jsx` chưa được triển khai hoàn chỉnh.
4. **Task nào có lỗi?** → Cả 5 task đều có lỗi (nặng nhất ở `ECOM-105`, `ECOM-199`, `ECOM-200`).
5. **Ba task Ngô Phương phụ trách còn thiếu những gì?** → Sai đường dẫn `/api/v1`, sai điều kiện unwrap `ApiResponse` (`status` vs `success`), lệch `id` vs `userId`, sai endpoint `/users/me` vs `/auth/me`, quên bọc `ProtectedRoute` cho `/checkout` và `/orders`, thiếu đồng bộ state khi lỗi 401.
6. **Hai task Lê Trung Chiến phụ trách còn thiếu những gì?** → Thiếu validate JS cho `fullName.trim()` và `phone` 10–11 chữ số, chưa truyền lỗi cấp trường vào `<Input />`, chưa khóa nút Đăng ký trong 1.5s chờ chuyển trang, tràn thanh Header trên mobile.
7. **Toàn bộ chức năng Đăng ký và Đăng nhập đã hoạt động xuyên suốt từ Frontend đến Backend chưa?** → **CHƯA** (mới chỉ chạy trên Mock Auth).
8. **Đã đủ điều kiện demo và tạo Pull Request vào `master` chưa?** → **CHƯA ĐỦ ĐIỀU KIỆN.**
