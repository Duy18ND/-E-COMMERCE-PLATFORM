# E-COMMERCE PLATFORM

> Dự án Hệ thống thương mại điện tử - Full-stack Web Application (ReactJS, Spring Boot, MySQL, Docker)

---

## 🌿 Mô hình phân nhánh Git (Branching Workflow)

Hệ thống quản lý mã nguồn tập trung vào 2 nhánh chính trên GitHub:

- **`master` (Nhánh phát triển chính / Development):**
  - Là nhánh làm việc chính của toàn nhóm.
  - Tất cả các thành viên lấy mã nguồn mới nhất từ `master`.
  - Khi thành viên hoàn thành công việc, gửi **Pull Request (PR) vào `master`**.
  - **Trưởng nhóm (Team Lead)** sẽ review code và thực hiện merge vào `master`.

- **`main` (Nhánh Release / Production):**
  - Là nhánh sản phẩm chính thức, ổn định tuyệt đối.
  - **Chỉ Trưởng nhóm mới có quyền merge từ `master` sang `main`** sau khi đã kiểm thử toàn diện, đảm bảo hệ thống chạy mượt mà và không phát sinh lỗi.

---

## 🛠️ Cấu trúc thư mục dự án

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
├── .gitignore          # Cấu hình bỏ qua file build, node_modules, cache
└── README.md           # Hướng dẫn dự án & quy trình làm việc nhóm
```

---

## 🚀 Hướng dẫn chạy dự án Local

### 1. Backend (Spring Boot)
Yêu cầu: JDK 21+ và MySQL đang chạy.
```bash
cd backend
# Trên Windows:
.\gradlew.bat bootRun
# Hoặc trên Linux/macOS:
./gradlew bootRun
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

## 👥 Hướng dẫn quy trình làm việc cho Thành viên nhóm

### Bước 1: Clone dự án về máy
```bash
git clone https://github.com/Duy18ND/-E-COMMERCE-PLATFORM.git
cd -E-COMMERCE-PLATFORM
```

### Bước 2: Chuyển sang nhánh `master` và cập nhật code mới nhất
```bash
git checkout master
git pull origin master
```

### Bước 3: Tạo nhánh tính năng riêng của mình để làm việc
```bash
# Đặt tên nhánh theo cú pháp: feat/<tên-thành-viên>-<tính-năng>
git checkout -b feat/tv1-product
# hoặc:
# git checkout -b feat/tv2-auth
# git checkout -b feat/tv3-ui-cart
# git checkout -b feat/tv4-docker
```

### Bước 4: Commit và đẩy lên GitHub
```bash
git add .
git commit -m "feat: hoàn thành module sản phẩm"
git push -u origin feat/tv1-product
```

### Bước 5: Tạo Pull Request (PR) vào `master`
1. Lên trang GitHub dự án: [https://github.com/Duy18ND/-E-COMMERCE-PLATFORM/pulls](https://github.com/Duy18ND/-E-COMMERCE-PLATFORM/pulls)
2. Bấm **New pull request**.
3. Chọn:
   - **base (nhánh đích):** `master`
   - **compare (nhánh của bạn):** `feat/tv1-product`
4. Bấm **Create pull request** và thông báo cho Trưởng nhóm review.

---

## 👑 Hướng dẫn quy trình cho Trưởng nhóm (Leader)

### 1. Merge code thành viên vào `master`:
- Mở Pull Request trên GitHub, kiểm tra code (Files changed).
- Nếu không có xung đột (No conflicts), bấm **Merge pull request** $\rightarrow$ **Confirm merge**.

### 2. Đẩy code từ `master` sang `main` khi đã chạy ổn định:
Sau khi test kỹ trên local/môi trường dev, không còn lỗi:
```bash
# Chuyển sang main và cập nhật mới nhất
git checkout main
git pull origin main

# Merge code ổn định từ master vào main
git merge master

# Đẩy lên GitHub
git push origin main
```
Hoặc tạo **Pull Request** trên GitHub: `base: main` $\leftarrow$ `compare: master` rồi bấm Merge.
