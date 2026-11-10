# BÁO CÁO KHẮC PHỤC LỖI BACKEND CI – AUTH-SERVICE COMPILATION & TEST

---

## THÔNG TIN TỔNG QUAN

| Thuộc tính | Chi tiết |
|---|---|
| **Dự án** | ShopMart E-Commerce Platform (`C:\IT209\-E-COMMERCE-PLATFORM`) |
| **Repository** | `Duy18ND/-E-COMMERCE-PLATFORM` |
| **Nhánh làm việc (Branch)** | `devops-phuong` |
| **Nhánh đích (Target Branch)** | `master` |
| **Phân hệ trọng tâm** | `backend/auth-service` và toàn bộ 6 microservices Backend |
| **Trạng thái sau khi sửa** | **PASS 100% (`BUILD SUCCESSFUL` — 485/485 tests PASS)** |
| **Ngày lập báo cáo** | 10/11/2026 |

---

## 1. NGUYÊN NHÂN GỐC CỦA TỪNG NHÓM LỖI (ROOT CAUSE ANALYSIS)

Qua kiểm tra chi tiết cấu hình Gradle (`backend/build.gradle`, `backend/auth-service/build.gradle`, `gradle-wrapper.properties`), workflow GitHub Actions (`.github/workflows/ci.yml`), và lịch sử Git (`commit 5a28dd5 - Merge branch 'master' into devops-phuong`), nguyên nhân gốc của **179 lỗi biên dịch** tại `:auth-service:compileJava` và lỗi hồi quy unit test được xác định chính xác như sau:

### 1.1. Kiểm tra Cấu hình Gradle, Java và Lombok
- **Phiên bản Gradle & Java:**
  - Gradle Wrapper: `Gradle 8.7` (`backend/gradle/wrapper/gradle-wrapper.properties`).
  - Java Toolchain: `JDK 21` (`JavaLanguageVersion.of(21)` trong `backend/build.gradle` và `actions/setup-java@v4` với `temurin` 21 trong `.github/workflows/ci.yml`).
- **Cấu hình Lombok & Annotation Processing:**
  - Trong `backend/build.gradle`, khối `subprojects` đã khai báo đầy đủ Lombok `1.18.32` (tương thích hoàn toàn với JDK 21 và Gradle 8.7):
    ```groovy
    compileOnly             "org.projectlombok:lombok:${lombokVersion}"
    annotationProcessor     "org.projectlombok:lombok:${lombokVersion}"
    testCompileOnly         "org.projectlombok:lombok:${lombokVersion}"
    testAnnotationProcessor "org.projectlombok:lombok:${lombokVersion}"
    ```
  - Trong `backend/auth-service/build.gradle` không có cấu hình nào loại trừ (`exclude`) Lombok hay ghi đè `annotationProcessor`.
  - Toàn bộ các class Entity, Security, DTO và Service (`User`, `UserPrincipal`, `UserAddress`, `ApiResponse`, `PagedResponse`, `ErrorResponse`, `UserProfileResponse`, `AddressRequest`, `AddressResponse`, `UpdateProfileRequest`, `JwtTokenProvider`, `UserServiceImpl`) đều khai báo đúng các annotation Lombok (`@Getter`, `@Setter`, `@Builder`, `@Data`, `@Slf4j`, `@RequiredArgsConstructor`, `@NoArgsConstructor`, `@AllArgsConstructor`).

### 1.2. Tại sao 175 phương thức/biến Lombok (`builder()`, Getter/Setter, `log`) không được sinh ra?
- **Không phải do lỗi cấu hình Lombok hay thiếu dependency**, mà là **hệ quả dây chuyền (cascading failure) của trình biên dịch `javac`** khi gặp lỗi khai báo trùng phương thức (`duplicate method`) trong giai đoạn đầu biên dịch:
  - Khi `javac` biên dịch toàn bộ module `auth-service`, quá trình xử lý gồm 3 giai đoạn chính: `Parse` (phân tích cú pháp) -> `Enter` (xây dựng bảng ký hiệu - symbol table cho các class/method) -> `Process Annotations` (chạy JSR-269 Annotation Processors như Lombok) -> `Attr & Gen` (kiểm tra kiểu và sinh bytecode).
  - Tại giai đoạn `Enter` (trước khi chạy Annotation Processor vòng đầu tiên), `javac` phát hiện lớp `GlobalExceptionHandler` khai báo **2 phương thức trùng hệt chữ ký** `handleIllegalArgumentException(IllegalArgumentException, HttpServletRequest)`.
  - Do bảng ký hiệu (`Enter` phase) gặp lỗi nghiêm trọng (`method ... is already defined in class`), `javac` **hủy bỏ bước thực thi Annotation Processor (Lombok không được gọi)** và chuyển thẳng sang bước kiểm tra tham chiếu (`Attr`) để gom lỗi.
  - Vì Lombok không được kích hoạt trên AST, toàn bộ các hàm `builder()`, `getId()`, `getEmail()`, `getRoles()`, `getFullName()`, `setStatus()`, và biến `log` (`@Slf4j`) trên tất cả các class trong `auth-service` đều chưa được bơm vào cây cú pháp, dẫn đến **175 lỗi `cannot find symbol`** kèm theo **4 lỗi gốc** = **179 lỗi biên dịch**.

### 1.3. Nguyên nhân của 3 nhóm lỗi gốc trong mã nguồn

| Nhóm lỗi | File phát sinh | Nguyên nhân gốc |
|---|---|---|
| **Nhóm 1: Trùng phương thức `handleIllegalArgumentException`** | `GlobalExceptionHandler.java` | Khi merge nhánh `master` (commit `21c694a` - ECOM-145/325) vào `devops-phuong` (commit `71ada7f` - ECOM-327) tại commit `5a28dd5`, cả hai nhánh đều định nghĩa `@ExceptionHandler(IllegalArgumentException.class) public ResponseEntity<ErrorResponse> handleIllegalArgumentException(...)` (một ở dòng 54 và một ở dòng 222). |
| **Nhóm 2: Thiếu khai báo biến `safePage`, `safeSize`, `safeSortBy`** | `AdminCustomerController.java` | Khi giải quyết xung đột merge tại `AdminCustomerController.getCustomers()` trong commit `5a28dd5`, 3 dòng khai báo `safePage`, `safeSize`, `safeSortBy` bị xóa mất trong khi dòng khởi tạo `PageRequest.of(safePage, safeSize, Sort.by(direction, safeSortBy))` vẫn giữ nguyên. |
| **Nhóm 3: Lỗi dây chuyền 175 ký hiệu Lombok** | Toàn bộ `auth-service` | Do lỗi trùng phương thức ở Nhóm 1 làm `javac` dừng JSR-269 Annotation Processing trước khi Lombok chạy. |
| **Nhóm 4: Xung đột dữ liệu test biên phân trang sau khi merge** | `AdminCustomerControllerTest.java` | Test `getCustomers_MultiRoleAndSanitizedParams_Success` (từ `21c694a`) truyền `page = -5` kỳ vọng `200 OK`, trong khi quy tắc validation của `AdminCustomerController` (từ `71ada7f` - ECOM-327) chặn `page < 0` và ném `IllegalArgumentException` (`400 Bad Request`). |

---

## 2. DANH SÁCH FILE ĐÃ SỬA

1. [`backend/auth-service/src/main/java/com/ecommerce/auth/exception/GlobalExceptionHandler.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/java/com/ecommerce/auth/exception/GlobalExceptionHandler.java)
2. [`backend/auth-service/src/main/java/com/ecommerce/auth/controller/AdminCustomerController.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/java/com/ecommerce/auth/controller/AdminCustomerController.java)
3. [`backend/auth-service/src/test/java/com/ecommerce/auth/controller/AdminCustomerControllerTest.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/test/java/com/ecommerce/auth/controller/AdminCustomerControllerTest.java)

---

## 3. CÁCH SỬA TỪNG LỖI

### 3.1. Sửa `GlobalExceptionHandler.java`
- Loại bỏ phương thức `handleIllegalArgumentException` bị trùng lặp ở cuối file (dòng 221–236).
- Giữ lại duy nhất một phương thức `handleIllegalArgumentException(IllegalArgumentException ex, HttpServletRequest request)` tại dòng 53–68, kết hợp xử lý an toàn thông điệp lỗi:
  ```java
  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
          IllegalArgumentException ex, HttpServletRequest request) {

      log.warn("Illegal argument on path {}: {}", request.getRequestURI(), ex.getMessage());

      ErrorResponse errorResponse = ErrorResponse.builder()
              .timestamp(LocalDateTime.now())
              .status(HttpStatus.BAD_REQUEST.value())
              .error("Bad Request")
              .message(ex.getMessage() != null ? ex.getMessage() : "Tham số yêu cầu không hợp lệ")
              .path(request.getRequestURI())
              .build();

      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
  }
  ```
- Giữ nguyên toàn bộ các `@ExceptionHandler` khác (`MethodArgumentNotValidException`, `HttpMessageNotReadableException`, `MethodArgumentTypeMismatchException`, `BadCredentialsException`, `UserAlreadyExistsException`, `InvalidTokenException`, `ResourceNotFoundException`, `AccessDeniedException`, `AuthenticationException`, `DataIntegrityViolationException`, `Exception`).

### 3.2. Sửa `AdminCustomerController.java`
- Giữ nguyên quy tắc kiểm tra hợp lệ đầu vào đối với `page < 0` và `size <= 0` (ném `IllegalArgumentException` -> trả về `400 Bad Request`).
- Khôi phục khai báo đầy đủ cho 3 biến `safePage`, `safeSize` (giới hạn tối đa 100 bản ghi/trang), và `safeSortBy` (chỉ cho phép sắp xếp theo các thuộc tính trong `ALLOWED_SORT_FIELDS`) trước khi khởi tạo `Pageable`:
  ```java
  if (page < 0) {
      throw new IllegalArgumentException("Chỉ số trang (page) không được nhỏ hơn 0");
  }
  if (size <= 0) {
      throw new IllegalArgumentException("Kích thước trang (size) phải lớn hơn 0");
  }

  int safePage = Math.max(0, page);
  int safeSize = Math.min(Math.max(1, size), 100);
  String safeSortBy = (sortBy != null && ALLOWED_SORT_FIELDS.contains(sortBy.trim())) ? sortBy.trim() : "id";
  Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
  Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, safeSortBy));
  ```

### 3.3. Đồng bộ kịch bản kiểm thử trong `AdminCustomerControllerTest.java`
- Tại test `getCustomers_MultiRoleAndSanitizedParams_Success` (kiểm tra đa vai trò `ROLE_USER, ROLE_ADMIN` kết hợp giới hạn `size=9999 -> 100` và lọc `sortBy=password -> id`), cập nhật tham số `.param("page", "0")` để phù hợp với quy tắc từ chối `page < 0` bằng mã `400 Bad Request` (trường hợp `page < 0 -> 400 Bad Request` đã được kiểm thử tại `AdminCustomerApiQATest.getCustomers_NegativePage_Returns400`).

---

## 4. KẾT QUẢ COMPILE AUTH-SERVICE

Thực thi lệnh biên dịch sạch từ đầu:
```bash
cd backend
./gradlew :auth-service:clean :auth-service:compileJava --no-daemon
```

**Kết quả thực tế:**
```text
> Task :auth-service:clean
> Task :auth-service:compileJava

BUILD SUCCESSFUL in 23s
2 actionable tasks: 2 executed
```
- Số lỗi biên dịch: **0 lỗi** (giảm từ 179 lỗi xuống 0 lỗi).
- Lombok Annotation Processor hoạt động bình thường, sinh đầy đủ toàn bộ `builder()`, getter/setter, constructor và logger `log`.

---

## 5. KẾT QUẢ TEST AUTH-SERVICE

Thực thi toàn bộ unit & integration tests của `auth-service`:
```bash
cd backend
./gradlew :auth-service:test --no-daemon
```

**Kết quả thực tế:**
```text
> Task :auth-service:compileJava UP-TO-DATE
> Task :auth-service:processResources UP-TO-DATE
> Task :auth-service:classes UP-TO-DATE
> Task :auth-service:compileTestJava
> Task :auth-service:processTestResources NO-SOURCE
> Task :auth-service:testClasses
> Task :auth-service:test

BUILD SUCCESSFUL in 43s
```

**Chi tiết các bộ test trong `auth-service` (77/77 tests PASS):**

| STT | Test Suite | Số lượng Test | Thất bại | Lỗi | Trạng thái |
|:---:|---|:---:|:---:|:---:|:---:|
| 1 | `AuthServiceApplicationTests` | 1 | 0 | 0 | **PASS** |
| 2 | `AdminCustomerApiQATest$AuthorizationAndRbacTests` (ECOM-327) | 5 | 0 | 0 | **PASS** |
| 3 | `AdminCustomerApiQATest$CustomerListApiTests` (ECOM-327) | 7 | 0 | 0 | **PASS** |
| 4 | `AdminCustomerApiQATest$CustomerStatusAndProfileTests` (ECOM-327) | 5 | 0 | 0 | **PASS** |
| 5 | `AdminCustomerControllerTest` (ECOM-145 / ECOM-325) | 12 | 0 | 0 | **PASS** |
| 6 | `AdminUserControllerTest` | 4 | 0 | 0 | **PASS** |
| 7 | `AuthControllerTest` (Đăng ký, Đăng nhập, Refresh, Logout, Validate) | 6 | 0 | 0 | **PASS** |
| 8 | `UserControllerTest` (Profile, Sổ địa chỉ, ECOM-128 / ECOM-278) | 12 | 0 | 0 | **PASS** |
| 9 | `JwtTokenProviderTest` (JWT Generation, Claims, Blacklist) | 2 | 0 | 0 | **PASS** |
| 10 | `AuthServiceTest` (Register, Login, Refresh, Blocked Account) | 7 | 0 | 0 | **PASS** |
| 11 | `UserServiceTest` (Profile, Addresses, Admin Customer Management) | 16 | 0 | 0 | **PASS** |
| **Tổng** | **11 Test Suites** | **77** | **0** | **0** | **100% PASS** |

---

## 6. KẾT QUẢ CHẠY TOÀN BỘ `./gradlew test`

Thực thi lệnh kiểm thử toàn bộ hệ thống Backend giống hệt trên GitHub Actions CI:
```bash
cd backend
./gradlew test --no-daemon --max-workers=2
```

**Kết quả thực tế:**
```text
> Task :api-gateway:test
> Task :auth-service:test UP-TO-DATE
> Task :discovery-server:test UP-TO-DATE
> Task :payment-service:test UP-TO-DATE
> Task :product-service:test
> Task :order-service:test

BUILD SUCCESSFUL in 1m 51s
24 actionable tasks: 8 executed, 16 up-to-date
```

**Bảng tổng hợp kết quả kiểm thử trên toàn bộ 6 Microservices (485/485 tests PASS):**

| Microservice | Số Test Suites | Tổng số Tests | Failures | Errors | Skipped | Kết quả |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `api-gateway` | 3 | 12 | 0 | 0 | 0 | **PASS** |
| `auth-service` | 11 | 77 | 0 | 0 | 0 | **PASS** |
| `discovery-server` | 1 | 1 | 0 | 0 | 0 | **PASS** |
| `order-service` | 27 | 196 | 0 | 0 | 0 | **PASS** |
| `payment-service` | 6 | 20 | 0 | 0 | 0 | **PASS** |
| `product-service` | 17 | 179 | 0 | 0 | 0 | **PASS** |
| **TỔNG CỘNG** | **65** | **485** | **0** | **0** | **0** | **100% PASS** |

**Kiểm tra các chức năng trọng tâm:**
- **Đăng ký tài khoản & Chống leo thang đặc quyền:** PASS (`AuthControllerTest`, `AuthServiceTest`).
- **Đăng nhập & Khóa tài khoản (`BLOCKED`):** PASS (`AuthControllerTest`, `AuthServiceTest`).
- **Phân quyền `ROLE_ADMIN` và `ROLE_USER` (kể cả chống bypass `ROLE_ADMIN_VIEWER`):** PASS (`AdminCustomerApiQATest`, `AdminCustomerControllerTest`, `AdminStatisticsApiQATest`, `AdminStatisticsControllerTest`).
- **API danh sách khách hàng (`/api/v1/admin/customers`):** PASS (`AdminCustomerApiQATest`, `AdminCustomerControllerTest`, `UserServiceTest`).
- **API thống kê doanh thu & đơn hàng (`/api/v1/admin/statistics`):** PASS (`AdminStatisticsApiQATest`, `AdminStatisticsControllerTest`, `AdminOrderServiceTest`).
- **Validation request & Error Handling (400 / 401 / 403 / 404 / 409):** PASS.
- **JWT Authentication & Redis Blacklist:** PASS (`JwtTokenProviderTest`, `AuthenticationFilterTest`).
- **Bộ test ECOM-327 (29/29 test cases trong `AdminCustomerApiQATest` & `AdminStatisticsApiQATest`):** PASS 100%.

---

## 7. CÁC LỖI CÒN TỒN TẠI

- **Không còn bất kỳ lỗi biên dịch hay lỗi unit/integration test nào** trên toàn bộ 6 microservices của Backend.
- Không có dữ liệu nhạy cảm (`.env`, mật khẩu, JWT secret, GitHub Secrets) nào bị thêm vào Git working tree.

---

## 8. ĐÁNH GIÁ KHẢ NĂNG ĐƯA CODE LÊN MASTER

- **Mức độ sẵn sàng:** **SẴN SÀNG 100% (READY TO MERGE INTO MASTER)**.
- **Đánh giá kỹ thuật:**
  1. Nguyên nhân gốc của lỗi biên dịch CI sau khi merge `master` vào `devops-phuong` đã được giải quyết triệt để chỉ với các thay đổi tối thiểu, đúng trọng tâm tại `GlobalExceptionHandler.java`, `AdminCustomerController.java` và `AdminCustomerControllerTest.java`.
  2. Toàn bộ quy tắc bảo mật RBAC, giới hạn kích thước trang (`safeSize <= 100`), danh sách trường sắp xếp hợp lệ (`ALLOWED_SORT_FIELDS`), và kiểm tra biên phân trang (`page < 0`, `size <= 0`) đều được bảo toàn.
  3. Toàn bộ 485 unit & integration tests trên 6 microservices đều đạt `BUILD SUCCESSFUL`.
