# 12 – CÁC VẤN ĐỀ CÒN TỒN TẠI, ĐIỂM CHƯA THỂ XÁC MINH & RỦI RO (REMAINING ISSUES)

- **Thời điểm kiểm tra:** 2026-11-16 08:05:00 (GMT+7)
- **Số lỗi phần mềm (Code Bugs) còn tồn tại:** **0 lỗi**
- **Số hạng mục phụ thuộc môi trường bên ngoài (Environment / Infrastructure Blockers):** **2 hạng mục**

---

## 1. CÁC HẠNG MỤC CHƯA THỂ XÁC MINH TRỰC TIẾP DO MÔI TRƯỜNG (ENVIRONMENT BLOCKERS)

| STT | Hạng mục | Phân loại | Nguyên nhân thực tế | Hướng xử lý cho người dùng |
|---:|---|---|---|---|
| **1** | **Khởi chạy trực tiếp `docker compose up -d` trên máy Windows hiện tại** | `BLOCKED BY LOCAL DOCKER DAEMON` | Cú pháp `docker-compose -f backend/docker-compose.yml config -q` và `docker-compose -f backend/docker-compose.prod.yml config -q` đều đã **PASS (`exit code 0`)**. Tuy nhiên tiến trình **Docker Desktop Engine** trên máy Windows hiện đang tắt (`open //./pipe/docker_engine: The system cannot find the file specified`), nên chưa thể chạy `docker compose build` / `docker compose up -d` ngay trong phiên kiểm tra này. | Mở ứng dụng **Docker Desktop** trên Windows, đợi Engine chuyển sang trạng thái `Running`, sau đó chạy `docker compose -f backend/docker-compose.yml up -d --build`. |
| **2** | **Triển khai trực tiếp lên máy chủ Ubuntu VPS thật (`ECOM-154`)** | `PARTIAL / BLOCKED BY VPS CREDENTIALS` | Toàn bộ file cấu hình VPS (`docker-compose.prod.yml`, `.env.prod.example`, `nginx.prod.conf`, `deploy.yml`, `scripts/backup/*`) đã hoàn thiện 100%. Tuy nhiên môi trường local chưa có địa chỉ IP/SSH Key của máy chủ Ubuntu VPS (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`) và quy tắc dự án yêu cầu *"Không tự ý deploy lên VPS hoặc thay đổi dữ liệu Production nếu chưa được cho phép"*. | Cấu hình `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `GHCR_TOKEN` trong GitHub Repository Secrets và tạo file `/opt/shopmart/.env` từ `backend/.env.prod.example` trên VPS để kích hoạt workflow `deploy.yml`. |

---

## 2. GHI NHẬN ĐỐI CHIẾU TÀI LIỆU & NHÁNH GIT

1. **Đối chiếu 2 phiên bản Excel Kế hoạch (`Ecommerce_Master_Plan_Final.xlsx` vs `Ecommerce_Scrum_Board_Can_Bang_Lich_Thoi_Gian_4_Nguoi.xlsx`):**
   - Trong bản cân bằng lịch 4 người (`Ecommerce_Scrum_Board_Can_Bang_Lich_Thoi_Gian_4_Nguoi.xlsx`), 4 task kết hợp FE+BE ở bản cũ đã được tách thành các cặp task FE và BE riêng biệt để phân công rõ ràng:
     - `ECOM-164` -> `ECOM-302` (FE) & `ECOM-306` (BE)
     - `ECOM-174` -> `ECOM-313` (FE) & `ECOM-317` (BE)
     - `ECOM-169` -> `ECOM-335` (FE) & `ECOM-339` (BE)
     - `ECOM-180` -> `ECOM-346` (FE) & `ECOM-350` (BE)
   - Cả 4 cặp task sau khi tách đều đã được triển khai và kiểm thử đạt 100%.
2. **Trạng thái nhánh Git cục bộ (`master` vs `devops-phuong`):**
   - Nhánh làm việc `devops-phuong` hiện tại ngang bằng với `origin/master` (`a1f0c9c`) cộng thêm 16 bản vá đồng bộ trong đợt Audit này.
   - Nhánh `master` cục bộ trên máy đang chậm hơn `origin/master` 141 commits (do chưa chạy `git pull` trên nhánh `master` cục bộ). Theo đúng quy tắc Mục 12, chúng tôi **chỉ làm việc trên nhánh `devops-phuong`** và không tự ý merge hay commit/push khi chưa có yêu cầu của bạn.
