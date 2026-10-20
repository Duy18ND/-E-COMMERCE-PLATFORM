# E-COMMERCE PLATFORM

> Dự án Hệ thống thương mại điện tử - Full-stack Web Application (ReactJS, Spring Boot, MySQL, Docker)

---

## 👥 Phân chia nhóm & Nhánh Git (Branching Model)

Mô hình phân nhánh nhóm:
- `main`: **Nhánh chính** (Release, Production, mã nguồn ổn định nhất).
- `master`: **Nhánh phụ / Nhánh phát triển chung** (Tích hợp các tính năng trước khi đưa vào `main`).
- Các nhánh chức năng thành viên (Feature Branches):
  - `feature/tv1-product-inventory`: **Thành viên 1** – Backend Product, Category & Inventory API.
  - `feature/tv2-user-order`: **Thành viên 2** – Backend User, Auth (JWT), Cart, Order & Payment Mock API.
  - `feature/tv3-frontend`: **Thành viên 3** – Frontend ReactJS UI, Routing & Tích hợp API.
  - `feature/tv4-devops-qa`: **Thành viên 4** – DevOps, Docker Compose, CI/CD, Nginx & QA Testing.

---

## 🛠️ Cấu trúc thư mục

```
-E-COMMERCE-PLATFORM/
├── backend/            # Spring Boot REST API (Java 21, Gradle, JPA, Security, JWT, Swagger)
│   ├── src/
│   ├── build.gradle
│   └── gradlew.bat
├── client/             # Frontend ReactJS + Vite (React Router, Axios, CSS)
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── .gitignore          # Cấu hình bỏ qua các file build, node_modules, cache
└── README.md           # Hướng dẫn dự án & phối hợp nhóm
```

---

## 🚀 Hướng dẫn chạy dự án Local

### 1. Backend (Spring Boot)
Yêu cầu: JDK 21+ và MySQL đang chạy.
```bash
cd backend
./gradlew bootRun
# Hoặc trên Windows:
.\gradlew.bat bootRun
```
- API Base URL: `http://localhost:8080/api`
- Swagger UI Documentation: `http://localhost:8080/swagger-ui.html`

### 2. Frontend (ReactJS + Vite)
Yêu cầu: Node.js 18+.
```bash
cd client
npm install
npm run dev
```
- Local URL: `http://localhost:5173`

---

## 🤝 Quy trình làm việc nhóm với Git

1. **Clone dự án về máy cá nhân:**
   ```bash
   git clone https://github.com/Duy18ND/-E-COMMERCE-PLATFORM.git
   cd -E-COMMERCE-PLATFORM
   ```

2. **Chuyển sang nhánh của mình:**
   ```bash
   # Ví dụ Thành viên 1:
   git checkout feature/tv1-product-inventory

   # Ví dụ Thành viên 2:
   git checkout feature/tv2-user-order

   # Ví dụ Thành viên 3:
   git checkout feature/tv3-frontend

   # Ví dụ Thành viên 4:
   git checkout feature/tv4-devops-qa
   ```

3. **Cập nhật mã nguồn mới nhất từ nhánh `master` trước khi code:**
   ```bash
   git pull origin master
   ```

4. **Commit và đẩy lên GitHub:**
   ```bash
   git add .
   git commit -m "feat: mô tả công việc vừa làm"
   git push origin <tên-nhánh-của-bạn>
   ```

5. **Tạo Pull Request (PR):**
   - Lên GitHub tạo Pull Request từ nhánh của bạn vào nhánh `master`.
   - Nhóm review code và merge vào `master`.
   - Khi hoàn thiện các mốc lớn (Milestones) sẽ merge từ `master` vào `main`.
