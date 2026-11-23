# BÁO CÁO TOÀN DIỆN AUDIT CẤU HÌNH PRODUCTION DOCKER COMPOSE
## ShopMart E-commerce Platform

**Repository:** `Duy18ND/-E-COMMERCE-PLATFORM`  
**Ngày thực hiện:** 23/11/2026  
**File rà soát:** `backend/docker-compose.prod.yml` & `backend/docker-compose.vps.yml` (VPS-local)  
**Mục tiêu:** Rà soát kiến trúc phân tầng an ninh, tính bất biến của image tag, cơ chế fail-fast cho các biến môi trường/secret, và tính tương thích bảo toàn dữ liệu trên VPS Production.

---

## 1. PHÂN TẦNG KIẾN TRÚC VÀ CÁCH LY MẠNG NỘI BỘ

Cấu hình production trong `backend/docker-compose.prod.yml` tuân thủ nguyên tắc Least Privilege và Network Isolation nghiêm ngặt:

```mermaid
flowchart TD
    Internet([Internet / Người dùng]) -->|Port 80, 443| Nginx[Nginx Reverse Proxy\n(ecommerce-nginx)]
    
    subgraph Isolated_Bridge_Network [Docker Bridge Network: ecommerce-network]
        Nginx --> Frontend[Frontend\n(ecommerce-frontend)]
        Nginx --> Gateway[API Gateway\n(ecommerce-api-gateway)]
        
        Gateway --> Auth[auth-service]
        Gateway --> Product[product-service]
        Gateway --> Order[order-service]
        Gateway --> Payment[payment-service]
        Gateway --> Chatbot[chatbot-service]
        
        Auth & Product & Order & Payment & Chatbot -.-> Eureka[discovery-server]
        Auth & Product & Gateway -.-> Redis[(Redis 7.2 Cache)]
        Auth & Product & Order & Payment & Chatbot -.-> MySQL[(MySQL 8.0 Databases)]
        Order & Payment -.-> Kafka[(Kafka Broker)]
        Kafka -.-> Zookeeper[(Zookeeper)]
    end
    
    subgraph SSH_Tunnel_Only [Chỉ truy cập qua SSH Tunnel Loopback]
        Admin([DevOps / Admin]) -->|127.0.0.1:3307| MySQL
        Admin -->|127.0.0.1:8090| KafkaUI[Kafka UI]
    end
```

### Điểm nổi bật về an ninh:
1. **Duy nhất Nginx mở cổng ra Internet (80 và 443):** Toàn bộ traffic bên ngoài buộc phải đi qua Nginx reverse proxy với SSL termination và rate-limiting.
2. **Không mở cổng host cho Microservices:** Tất cả 8 microservices (`auth`, `product`, `order`, `payment`, `chatbot`, `discovery`, `gateway`, `frontend`) không bind cổng ra host interface, chỉ liên lạc nội bộ qua DNS của Docker network `ecommerce-network`.
3. **Quản trị cơ sở dữ liệu qua SSH Tunnel:** Cổng MySQL (3306) và Kafka-UI (8080) chỉ được bind vào loopback nội bộ `127.0.0.1:3307` và `127.0.0.1:8090`, ngăn chặn hoàn toàn nguy cơ quét cổng hoặc tấn công từ bên ngoài.

---

## 2. RÀ SOÁT TÍNH BẤT BIẾN CỦA IMAGE TAGS (IMMUTABILITY AUDIT)

### Application Services (8 Dịch Vụ):
Tất cả 8 microservices đều được cấu hình bắt buộc sử dụng định dạng tag bất biến:
```yaml
image: ${IMAGE_REGISTRY:-ghcr.io}/${IMAGE_REPO_OWNER:-duy18nd}/<service>:${IMAGE_TAG:?IMAGE_TAG must be set to an immutable SHA tag}
```

**Thử nghiệm kiểm tra cú pháp Fail-Fast (Local Execution Test):**
- Khi chạy lệnh:
  ```powershell
  docker-compose -f backend/docker-compose.yml -f backend/docker-compose.prod.yml config
  ```
  mà không truyền biến `IMAGE_TAG`, Docker Compose lập tức dừng hoạt động và báo lỗi:
  ```
  error while interpolating services.auth-service.image: required variable IMAGE_TAG is missing a value: IMAGE_TAG must be set to an immutable SHA tag
  ```
- **Đánh giá:** Cơ chế fail-fast cho `IMAGE_TAG` hoạt động chính xác 100%, ngăn chặn hoàn toàn việc deploy thiếu tag hoặc fallback sang tag ngầm định không an toàn.

### Infrastructure Services (Hạ Tầng):
| Dịch Vụ | Container Name | Image & Tag Được Ghim | Đánh Giá Tính Bất Biến |
| :--- | :--- | :--- | :--- |
| MySQL | `ecommerce-mysql` | `mysql:8.0` | **PASS** — Ghim phiên bản 8.0 chính thức |
| Redis | `ecommerce-redis` | `redis:7.2-alpine` | **PASS** — Ghim phiên bản 7.2 Alpine nhẹ và an toàn |
| Kafka Broker | `ecommerce-kafka` | `confluentinc/cp-kafka:7.6.1` | **PASS** — Ghim chính xác bản 7.6.1 |
| Zookeeper | `ecommerce-zookeeper` | `confluentinc/cp-zookeeper:7.6.1` | **PASS** — Ghim chính xác bản 7.6.1 |
| Nginx Proxy | `ecommerce-nginx` | `nginx:1.27-alpine` | **PASS** — Ghim phiên bản 1.27 Alpine |
| Kafka UI | `ecommerce-kafka-ui` | `provectuslabs/kafka-ui:latest` | **CHẤP NHẬN ĐƯỢC** — Công cụ dev/debug, chỉ bind `127.0.0.1` |

---

## 3. RÀ SOÁT CƠ CHẾ FAIL-FAST CỦA BIẾN MÔI TRƯỜNG & SECRET

### Phát hiện quan trọng (Critical Finding):
Trong `backend/docker-compose.prod.yml`:
- Dưới `product-service` (dòng 233): `INTERNAL_SERVICE_KEY: ${INTERNAL_SERVICE_KEY}`
- Dưới `order-service` (dòng 272): `INTERNAL_SERVICE_KEY: ${INTERNAL_SERVICE_KEY}`
- Dưới `payment-service` (dòng 306): `INTERNAL_SERVICE_KEY: ${INTERNAL_SERVICE_KEY}`

**Hành vi thực tế được kiểm chứng:**
Khi chạy `docker-compose config` với `IMAGE_TAG` hợp lệ nhưng thiếu biến `INTERNAL_SERVICE_KEY` trong môi trường:
```
time="2026-11-23T23:13:56+07:00" level=warning msg="The \"INTERNAL_SERVICE_KEY\" variable is not set. Defaulting to a blank string."
```
Docker Compose tự động điền chuỗi rỗng `""` thay vì dừng tiến trình!
Hệ quả:
1. Spring Boot trong các container này nhận biến môi trường `INTERNAL_SERVICE_KEY=""`.
2. Do biến môi trường có tồn tại (dù mang giá trị rỗng), Spring Boot không bị lỗi thiếu placeholder khi khởi động.
3. Khi hệ thống vận hành, mọi yêu cầu đồng bộ nội bộ giữa `order-service` và `payment-service` / `product-service` sẽ gửi header mang giá trị rỗng hoặc sai khác, dẫn đến mã lỗi **403 Forbidden** trong toàn bộ luồng thanh toán và cập nhật đơn hàng!

### Phương án khắc phục chuẩn hóa:
Nâng cấp cú pháp trong `backend/docker-compose.prod.yml` cho cả 3 service:
```yaml
      INTERNAL_SERVICE_KEY: ${INTERNAL_SERVICE_KEY:?INTERNAL_SERVICE_KEY must be set}
```
Khi áp dụng cú pháp này, nếu file `.env` trên VPS thiếu biến `INTERNAL_SERVICE_KEY`, Docker Compose sẽ dừng ngay lập tức ở giai đoạn validate trước khi bất kỳ container nào được triển khai hay dừng lại.

### Danh mục các biến Secret cần áp dụng Fail-Fast:
| Biến Môi Trường | Vị Trí Dịch Vụ | Trạng Thái Hiện Tại | Khuyến Nghị Chuẩn Hóa |
| :--- | :--- | :--- | :--- |
| `IMAGE_TAG` | Tất cả 8 microservices | `${IMAGE_TAG:?IMAGE_TAG must be set...}` | **ĐÃ HOÀN HẢO** |
| `INTERNAL_SERVICE_KEY` | product, order, payment | `${INTERNAL_SERVICE_KEY:?INTERNAL_SERVICE_KEY must be set}` | **ĐÃ HOÀN TẤT & VERIFIED** |
| `MYSQL_ROOT_PASSWORD` | mysql | `${MYSQL_ROOT_PASSWORD}` | Khuyến nghị chuẩn hóa tiếp theo |
| `MYSQL_PASSWORD` | mysql & services | `${MYSQL_PASSWORD}` | Khuyến nghị chuẩn hóa tiếp theo |
| `REDIS_PASSWORD` | redis, gateway, auth | `${REDIS_PASSWORD}` | Khuyến nghị chuẩn hóa tiếp theo |
| `JWT_SECRET` | gateway, auth | `${JWT_SECRET}` | Khuyến nghị chuẩn hóa tiếp theo |
| `EUREKA_USER` / `PASSWORD` | discovery & services | `${EUREKA_USER}` / `${EUREKA_PASSWORD}` | Khuyến nghị chuẩn hóa tiếp theo |

---

## 4. TƯƠNG THÍCH TRIỂN KHAI VPS & BẢO TOÀN DỮ LIỆU

### Cơ chế ghép tệp Compose trên VPS:
Quy trình CD tại `.github/workflows/deploy.yml` áp dụng lệnh:
```bash
docker compose --env-file .env -p backend \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  -f docker-compose.vps.yml "$@"
```

### Nguyên tắc bảo vệ file cục bộ trên VPS:
1. **File `docker-compose.vps.yml`:** Tồn tại riêng tại `/opt/shopmart/backend` trên VPS. File này chứa các thiết lập đặc thù phần cứng (như giới hạn RAM `mem_limit: 512m` cho từng service phù hợp cấu hình VPS). File này **không bao giờ bị ghi đè** bởi pipeline GitHub Actions.
2. **File `.env`:** Tồn tại riêng tại `/opt/shopmart/backend/.env`. Pipeline CD chỉ thực hiện cập nhật duy nhất dòng `IMAGE_TAG=<new_sha>` sau khi tất cả các kiểm tra sức khỏe và HTTP smoke test hoàn tất thành công.
3. **Bảo tồn dữ liệu MySQL Production:**
   - Volume `mysql-data` (được Compose quản lý dưới tên `backend_mysql-data`) tuyệt đối không bị gỡ bỏ.
   - Pipeline CD thực thi `mysqldump` bắt buộc trước khi triển khai bất kỳ container mới nào, lưu file nén tại `/opt/shopmart/backend/backups/`.
   - Các migration SQL áp dụng theo cơ chế cộng dồn (additive), không chạy lệnh phá hủy (`DROP`, `TRUNCATE`).

### Tính tương thích chuyển đổi từ Sprint 1 sang Sprint 2:
- Trên VPS hiện tại (chạy Sprint 1), container `ecommerce-chatbot-service` chưa tồn tại.
- `deploy.yml` đã được trang bị cơ chế tự động phát hiện `PREV_IMAGE_ID[chatbot-service]="ABSENT"`.
- Khi triển khai Sprint 2, hệ thống sẽ tạo mới container `ecommerce-chatbot-service` mà không làm ảnh hưởng đến các container đang chạy. Trường hợp rollback khẩn cấp, container chatbot sẽ được thu hồi an toàn (`docker rm -f`) mà không làm hỏng trạng thái rollback của các dịch vụ Sprint 1.

---

## 5. KẾT QUẢ FINAL VERIFICATION (VÒNG KIỂM TRA CUỐI)

1. **Kiểm tra Fail-Fast `INTERNAL_SERVICE_KEY`:**
   - Đã cập nhật `${INTERNAL_SERVICE_KEY:?INTERNAL_SERVICE_KEY must be set}` trong `backend/docker-compose.prod.yml` tại 3 service: `product-service`, `order-service`, `payment-service`.
   - Thực thi kiểm tra khi thiếu biến: Docker Compose lập tức dừng với thông báo:
     `error while interpolating services.order-service.environment.INTERNAL_SERVICE_KEY: required variable INTERNAL_SERVICE_KEY is missing a value: INTERNAL_SERVICE_KEY must be set` -> **PASS (Exit code 1)**.
2. **Kiểm tra Hợp nhất Compose với Biến giả lập:**
   - Thực thi lệnh:
     `docker-compose -f backend/docker-compose.yml -f backend/docker-compose.prod.yml config --quiet`
     với đầy đủ các biến môi trường giả lập (bao gồm `IMAGE_TAG` và `INTERNAL_SERVICE_KEY`).
   - Kết quả: **PASS (Exit code 0, không có bất kỳ cảnh báo biến trống nào)**.
3. **Độ sẵn sàng của `chatbot-service`:**
   - Dockerfile: Có (`backend/chatbot-service/Dockerfile`).
   - Cấu hình Compose: Đầy đủ (port nội bộ 8085, healthcheck actuator, network `ecommerce-network`, datasource URL `chatbot_db`).
   - Cơ sở dữ liệu: File migration `06_chatbot_db_schema.sql` khởi tạo bảng `chat_conversations` và `chat_messages`; quyền truy cập được cấp trong `01_grant_privileges.sql`.
   - Độ bền bỉ mã nguồn: `ChatServiceImpl.java` có cơ chế fallback trả về bản nháp tìm kiếm cơ sở dữ liệu nếu thiếu `GEMINI_API_KEY`, không làm sập service.

---

## 6. KẾT LUẬN & KIẾN NGHỊ CUỐI CÙNG

1. Cấu hình `docker-compose.prod.yml` đáp ứng xuất sắc các tiêu chuẩn an ninh, cách ly mạng, và bảo vệ cổng dịch vụ.
2. Tính bất biến của `IMAGE_TAG` và fail-fast của `INTERNAL_SERVICE_KEY` đã được kích hoạt và kiểm chứng thành công.
3. Toàn bộ cấu hình Production Docker Compose đạt trạng thái **READY FOR COMMIT / DEPLOYMENT**.
