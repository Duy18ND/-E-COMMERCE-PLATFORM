# 10 – BÁO CÁO KẾT QUẢ THỰC THI KIỂM THỬ (TEST EXECUTION REPORT)

- **Thời điểm thực thi:** 2026-11-16 07:45:00 – 08:03:35 (GMT+7)
- **Branch:** `devops-phuong`

---

## 1. TỔNG HỢP KẾT QUẢ CHẠY LỆNH THỰC TẾ

| Hạng mục kiểm thử | Lệnh đã chạy | Kết quả | Thời gian | Chi tiết bằng chứng |
|---|---|---|---|---|
| **1. Frontend Static Lint** | `npm --prefix frontend run lint` | **PASS (Exit 0)** | ~1.0s | Kiểm tra 93 file nguồn trong `frontend/src/` — 0 lỗi cú pháp/import, 0 `window.alert`/`confirm`. |
| **2. Frontend Unit & Integration QA Tests** | `npm --prefix frontend test` | **PASS (Exit 0)** | 4.83s | **415/415 test cases PASS** trên 21 test suites (32 file `.test.mjs`), 0 FAIL, 0 SKIPPED. |
| **3. Frontend Production Build** | `npm --prefix frontend run build` | **PASS (Exit 0)** | 2.76s | `vite v5.4.21` đóng gói 180 modules thành công ra `frontend/dist/`. |
| **4. Backend Multi-Module Unit & Integration Tests + Packaging** | `.\backend\gradlew.bat -p backend test bootJar --no-daemon --max-workers=2` | **PASS (Exit 0)** | 3m 21s | **BUILD SUCCESSFUL** — Toàn bộ 6 microservices (`discovery-server`, `api-gateway`, `auth-service`, `product-service`, `order-service`, `payment-service`) vượt qua 100% JUnit 5 Unit Tests & Spring Boot `@SpringBootTest` Integration Tests (H2 + EmbeddedKafka + MockMvc) và đóng gói thành công 6 file `.jar` thực thi. |
| **5. Docker Compose Config Validation (Dev & Prod)** | `docker-compose -f backend/docker-compose.yml config -q` & `docker-compose -f backend/docker-compose.prod.yml config -q` | **PASS (Exit 0)** | ~2.0s | Cả 2 file `docker-compose.yml` (`dev_compose=0`) và `docker-compose.prod.yml` (`prod_compose=0`) hợp lệ 100%. |
| **6. Docker Daemon Runtime (`docker up`)** | `docker info` | **BLOCKED (Local Daemon Off)** | — | Docker Desktop trên máy Windows đang tắt (`open //./pipe/docker_engine: The system cannot find the file specified`). |

---

## 2. DANH SÁCH 23 BỘ TEST BACKEND (JUNIT 5 & SPRING BOOT INTEGRATION TESTS) ĐÃ PASS

1. **api-gateway:** `AuthenticationFilterTest`
2. **auth-service:**
   - `AuthControllerIntegrationTest` (`@SpringBootTest`, `@AutoConfigureMockMvc`)
   - `AdminUserControllerIntegrationTest` (`@SpringBootTest`, `@AutoConfigureMockMvc`)
   - `AuthServiceImplTest`
   - `UserServiceImplTest`
   - `JwtTokenProviderTest`
3. **product-service:**
   - `ProductServiceImplTest`
   - `ProductInventoryTest`
   - `FlashSaleControllerTest`
   - `FlashSaleServiceTest`
   - `ProductReviewServiceImplTest`
   - `ProductApplicationTests`
4. **order-service:**
   - `OrderServiceIntegrationTest` (`@SpringBootTest`, `@EmbeddedKafka`)
   - `OrderTrackingIntegrationTest` (`@SpringBootTest`, `@AutoConfigureMockMvc`)
   - `AdminOrderControllerIntegrationTest` (`@SpringBootTest`, `@AutoConfigureMockMvc`)
   - `AdminStatisticsIntegrationTest` (`@SpringBootTest`, `@AutoConfigureMockMvc`)
   - `VoucherConcurrencyIntegrationTest` (`@SpringBootTest`, `@AutoConfigureMockMvc`)
   - `OrderServiceImplTest`
   - `CartServiceImplTest`
   - `VoucherServiceImplTest`
   - `KafkaPaymentConsumerTest`
5. **payment-service:**
   - `PaymentControllerIntegrationTest` (`@SpringBootTest`, `@AutoConfigureMockMvc`, `@EmbeddedKafka`)
   - `PaymentServiceImplTest`

---

## 3. DANH SÁCH 32 BỘ TEST FRONTEND & TÍCH HỢP (`frontend/tests/*.test.mjs`) ĐÃ PASS (415 TESTS)

- `auth.qa.test.mjs`, `ecom106.qa.test.mjs`, `ecom226_227.qa.test.mjs`, `sprint1.admin_inventory.qa.test.mjs`
- `ecom257.cart.qa.test.mjs`, `ecom260.cart_be.qa.test.mjs`, `ecom266.checkout.qa.test.mjs`, `ecom269.checkout_be.qa.test.mjs`
- `ecom275.profile_order_history.qa.test.mjs`, `ecom278.profile_order_be.qa.test.mjs`
- `ecom284.inventory.qa.test.mjs`, `inventory_stock_qa.test.mjs`, `inventory_stock_be_qa.test.mjs`
- `ecom291.qa.test.mjs`, `ecom293.admin_orders.qa.test.mjs`, `admin_orders_layout.qa.test.mjs`, `order_lifecycle_qa.test.mjs`
- `ecom165.flashsale.qa.test.mjs`, `ecom303.flashsale_fe.qa.test.mjs`
- `ecom173.timeline.qa.test.mjs`, `ecom188.order_detail.qa.test.mjs`, `ecom311.timeline.qa.test.mjs`, `ecom312.tracking.qa.test.mjs`, `ecom313.status_sync.qa.test.mjs`, `ecom314.tracking_fe.qa.test.mjs`, `ecom318.tracking_be.qa.test.mjs`
- `ecom324.customer_statistics_fe.qa.test.mjs`
- `ecom170.voucher_flashsale.qa.test.mjs`, `ecom185.voucher_concurrency.qa.test.mjs`, `ecom336.voucher_fe_qa.test.mjs`, `ecom339.admin_voucher_be.qa.test.mjs`, `ecom340.voucher_be_qa.test.mjs`
- `product_reviews.qa.test.mjs`, `ecom347.review_fe_qa.test.mjs`, `ecom351.review_be_qa.test.mjs`, `notification_system.qa.test.mjs`
